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
from typing import Any

import structlog
from sqlalchemy import text

from elimu_common.events import EventBus

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


async def run_once(app) -> dict[str, int]:
    """Execute a single sweep. Returns counts per kind.

    Safe to call from an admin endpoint for ad-hoc testing.
    """
    settings: Settings = app.state.settings
    bus: EventBus = app.state.event_bus
    counts = {"free_upgrade": 0, "expiring_soon": 0}

    async for sess in app.state.db.session():
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

        await sess.commit()

    log.info("reminders.swept", **counts)
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
