"""Subscription reminder scheduler.

Runs periodically (default: once per day) and publishes two topics to the event
bus, one per admin user matched by each rule:

  * ``billing.reminder_free``      — role ∈ {admin, super_admin}, plan = 'free'
  * ``billing.reminder_expiring``  — role ∈ {admin, super_admin}, plan ≠ 'free',
                                     plan_expires within ``reminders_expiring_days``

Idempotency is enforced by the ``subscription_reminders`` table:

  * free_upgrade  — resend allowed only after ``reminders_free_cooldown_days``
  * expiring_soon — one send per unique ``plan_expires::date`` per user

notifications-service consumes the events and dispatches the emails.
"""
from __future__ import annotations

import asyncio
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import text

from elimu_common.events import EventBus

from .pricing import calculate_cycle_price, create_invoice
from .routers.renew import make_renew_token
from .settings import Settings

log = structlog.get_logger(__name__)


_FREE_SQL = text(
    """
    SELECT u.id, u.email, u.name, u.role, s.name AS school_name
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    WHERE u.role IN ('admin', 'super_admin')
      AND u.plan = 'free'
      AND u.is_active = true
      AND u.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM subscription_reminders r
        WHERE r.user_id = u.id
          AND r.kind = 'free_upgrade'
          AND r.sent_at > NOW() - make_interval(days => :cooldown)
      )
    """
)

_EXPIRING_SQL = text(
    """
    SELECT u.id, u.email, u.name, u.role, u.plan, u.plan_expires, s.name AS school_name
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    WHERE u.role IN ('admin', 'super_admin')
      AND u.plan <> 'free'
      AND u.is_active = true
      AND u.email IS NOT NULL
      AND u.plan_expires IS NOT NULL
      AND u.plan_expires >= NOW()
      AND u.plan_expires <= NOW() + make_interval(days => :days)
      AND NOT EXISTS (
        SELECT 1 FROM subscription_reminders r
        WHERE r.user_id = u.id
          AND r.kind = 'expiring_soon'
          AND r.reference = (u.plan_expires)::date
      )
    """
)

# Lapsed: paid plan already expired and not renewed (a renewal moves
# plan_expires into the future, disqualifying the row). Any role — personal
# subscriptions belong to students/parents/teachers too. Capped at
# :max_sends per expiry date, spaced :gap_days apart.
_LAPSED_SQL = text(
    """
    SELECT u.id, u.email, u.name, u.role, u.plan, u.plan_expires, s.name AS school_name
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    WHERE u.plan <> 'free'
      AND u.is_active = true
      AND u.email IS NOT NULL
      AND u.plan_expires IS NOT NULL
      AND u.plan_expires < NOW()
      AND (
        SELECT COUNT(*) FROM subscription_reminders r
        WHERE r.user_id = u.id
          AND r.kind = 'renewal_invoice'
          AND r.reference = (u.plan_expires)::date
      ) < :max_sends
      AND NOT EXISTS (
        SELECT 1 FROM subscription_reminders r
        WHERE r.user_id = u.id
          AND r.kind = 'renewal_invoice'
          AND r.sent_at > NOW() - make_interval(days => :gap_days)
      )
    """
)


async def _record_sent(sess, user_id, kind: str, reference=None) -> None:
    await sess.execute(
        text(
            """
            INSERT INTO subscription_reminders (user_id, kind, reference)
            VALUES (:uid, :kind, :ref)
            """
        ),
        {"uid": user_id, "kind": kind, "ref": reference},
    )


async def _renewal_invoice_for(sess, user_id, plan: str, plan_expires) -> Any:
    """Reuse the pending renewal invoice created after expiry, or create one."""
    existing = (await sess.execute(
        text(
            """
            SELECT id, invoice_number, amount, currency, billing_cycle
            FROM invoices
            WHERE user_id = :uid AND plan = :plan AND status = 'pending'
              AND created_at > :expired
            ORDER BY created_at DESC LIMIT 1
            """
        ),
        {"uid": user_id, "plan": plan, "expired": plan_expires},
    )).mappings().first()
    if existing:
        return existing

    # Renew on the user's last billing cycle; default monthly.
    cycle = (await sess.execute(
        text(
            "SELECT billing_cycle FROM payments WHERE user_id = :uid AND status = 'completed' "
            "ORDER BY completed_at DESC NULLS LAST LIMIT 1"
        ),
        {"uid": user_id},
    )).scalar_one_or_none() or "monthly"
    price = await calculate_cycle_price(sess, plan, cycle)
    inv = await create_invoice(
        sess,
        user_id=user_id,
        plan=plan,
        billing_cycle=cycle,
        amount=Decimal(str(price["total"])),
        subtotal=Decimal(str(price["originalTotal"])),
        currency=price["currency"],
    )
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "amount": inv.amount,
        "currency": inv.currency,
        "billing_cycle": inv.billing_cycle,
    }


async def run_once(app) -> dict[str, int]:
    """Execute a single sweep. Returns counts per kind.

    Safe to call from an admin endpoint for ad-hoc testing. A Postgres
    advisory lock makes the sweep single-flight across scaled-out tasks.
    """
    settings: Settings = app.state.settings
    bus: EventBus = app.state.event_bus
    counts = {"free_upgrade": 0, "expiring_soon": 0, "renewal_invoice": 0}

    async for sess in app.state.db.session():
        got_lock = (await sess.execute(
            text("SELECT pg_try_advisory_lock(hashtext('elimuai_reminders_sweep'))")
        )).scalar()
        if not got_lock:
            log.info("reminders.skipped_lock_held")
            return counts
        try:
            counts = await _sweep(sess, settings, bus)
        finally:
            await sess.execute(
                text("SELECT pg_advisory_unlock(hashtext('elimuai_reminders_sweep'))")
            )
    log.info("reminders.swept", **counts)
    return counts


async def _sweep(sess, settings: Settings, bus: EventBus) -> dict[str, int]:
    counts = {"free_upgrade": 0, "expiring_soon": 0, "renewal_invoice": 0}
    if True:  # keep original body indentation
        # ── Free-plan admins ─────────────────────────────────────────────
        rows = (await sess.execute(
            _FREE_SQL, {"cooldown": settings.reminders_free_cooldown_days},
        )).mappings().all()
        for r in rows:
            payload: dict[str, Any] = {
                "user_id": str(r["id"]),
                "email": r["email"],
                "name": r["name"] or "there",
                "role": r["role"],
                "school_name": r["school_name"] or "your school",
            }
            await bus.publish("billing.reminder_free", payload)
            await _record_sent(sess, r["id"], "free_upgrade")
            counts["free_upgrade"] += 1

        # ── Paid admins expiring within N days ──────────────────────────
        rows = (await sess.execute(
            _EXPIRING_SQL, {"days": settings.reminders_expiring_days},
        )).mappings().all()
        for r in rows:
            expires_at = r["plan_expires"]
            days_left = None
            try:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc) if expires_at.tzinfo else datetime.utcnow()
                days_left = max(0, (expires_at - now).days)
            except Exception:  # noqa: BLE001
                pass
            payload = {
                "user_id": str(r["id"]),
                "email": r["email"],
                "name": r["name"] or "there",
                "role": r["role"],
                "plan": r["plan"],
                "plan_expires": expires_at.isoformat() if expires_at else None,
                "days_left": days_left,
                "school_name": r["school_name"] or "your school",
            }
            await bus.publish("billing.reminder_expiring", payload)
            await _record_sent(
                sess, r["id"], "expiring_soon", reference=expires_at.date(),
            )
            counts["expiring_soon"] += 1

        # ── Lapsed subscribers: renewal invoice, 3 sends over a week ─────
        rows = (await sess.execute(
            _LAPSED_SQL,
            {
                "max_sends": settings.reminders_renewal_max_sends,
                "gap_days": settings.reminders_renewal_gap_days,
            },
        )).mappings().all()
        for r in rows:
            try:
                inv = await _renewal_invoice_for(sess, r["id"], r["plan"], r["plan_expires"])
            except Exception as exc:  # noqa: BLE001 — one bad row must not stop the sweep
                log.error("reminders.renewal_invoice_failed", user_id=str(r["id"]), error=str(exc))
                continue
            expires_at = r["plan_expires"]
            payload = {
                "user_id": str(r["id"]),
                "email": r["email"],
                "name": r["name"] or "there",
                "role": r["role"],
                "plan": r["plan"],
                "plan_expires": expires_at.isoformat() if expires_at else None,
                "school_name": r["school_name"],
                "invoice_number": inv["invoice_number"],
                "amount": str(inv["amount"]),
                "currency": inv["currency"],
                "billing_cycle": inv["billing_cycle"],
                "renew_link": f"{settings.public_base_url}/api/payments/renew/{make_renew_token(inv['id'])}",
            }
            await bus.publish("billing.reminder_renewal", payload)
            await _record_sent(
                sess, r["id"], "renewal_invoice", reference=expires_at.date(),
            )
            counts["renewal_invoice"] += 1

        await sess.commit()

    return counts


async def loop(app) -> None:
    settings: Settings = app.state.settings
    if not settings.reminders_enabled:
        log.info("reminders.disabled")
        return
    await asyncio.sleep(max(1, settings.reminders_startup_delay_seconds))
    log.info(
        "reminders.loop.start",
        interval_seconds=settings.reminders_interval_seconds,
        expiring_days=settings.reminders_expiring_days,
        free_cooldown_days=settings.reminders_free_cooldown_days,
    )
    while True:
        try:
            await run_once(app)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.error("reminders.sweep_failed", error=str(exc))
        await asyncio.sleep(max(60, settings.reminders_interval_seconds))
