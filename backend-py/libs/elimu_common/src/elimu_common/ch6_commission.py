"""CH6 Insurance Agent Network — shared commission helpers.

Two services touch CH6 commissions:
* admin-service exposes management + a manual /api/ch6/conversions/process RPC
* billing-service credits commissions automatically when a subscription payment
  succeeds and the buyer provided an ``agent_referral_code`` at checkout

Both paths should credit an identical 3-tier split:
    Agent (15%) + Manager override (8%) + Network Head override (5%)
    + GM Rider (5%) on top — total 33%

Everything is continuous — every successful billing cycle re-runs the credit,
so long-lived subscribers keep earning the network commission every month.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

CH6_AGENT_RATE = Decimal("0.15")
CH6_MANAGER_RATE = Decimal("0.08")
CH6_NETWORK_HEAD_RATE = Decimal("0.05")
CH6_GM_RIDER_RATE = Decimal("0.05")


def _kes(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_ch6_split(
    amount_kes: Decimal,
    *,
    agent_active: bool = True,
    manager_active: bool = True,
    network_head_active: bool = True,
) -> dict[str, Any]:
    """Compute the 3-tier + GM rider split on the *actual* revenue collected.

    Inactive partners forfeit their portion; the GM rider always applies.
    """
    amount_kes = Decimal(amount_kes)
    agent_kes = _kes(amount_kes * CH6_AGENT_RATE) if agent_active else Decimal("0.00")
    manager_kes = _kes(amount_kes * CH6_MANAGER_RATE) if manager_active else Decimal("0.00")
    head_kes = _kes(amount_kes * CH6_NETWORK_HEAD_RATE) if network_head_active else Decimal("0.00")
    gm_kes = _kes(amount_kes * CH6_GM_RIDER_RATE)
    return {
        "amount_kes": _kes(amount_kes),
        "agent_rate": CH6_AGENT_RATE if agent_active else Decimal("0.00"),
        "agent_kes": agent_kes,
        "manager_rate": CH6_MANAGER_RATE if manager_active else Decimal("0.00"),
        "manager_kes": manager_kes,
        "network_head_rate": CH6_NETWORK_HEAD_RATE if network_head_active else Decimal("0.00"),
        "network_head_kes": head_kes,
        "gm_rider_rate": CH6_GM_RIDER_RATE,
        "gm_rider_kes": gm_kes,
        "total_kes": _kes(agent_kes + manager_kes + head_kes + gm_kes),
    }


async def resolve_agent_by_code(sess: AsyncSession, code: str) -> Any | None:
    """Return the agent partner row for ``code`` or ``None`` if not found."""
    if not code:
        return None
    row = (await sess.execute(text("""
        SELECT p.id, p.full_name, p.status, p.parent_partner_id, p.channel_type
          FROM referral_codes rc
          JOIN partners p ON p.id = rc.partner_id
         WHERE rc.code = :code
           AND rc.is_active = TRUE
           AND rc.channel_type = 'insurance_agent'
    """), {"code": code.upper().strip()})).fetchone()
    return row


async def credit_ch6_conversion(
    sess: AsyncSession,
    *,
    agent_referral_code: str,
    subscriber_id: str,
    plan: str,
    plan_price_kes: Decimal,
    provider_txn_id: str,
    payment_provider: str = "mpesa",
    subscription_month: int = 1,
    is_first_conversion: bool = True,
) -> dict[str, Any]:
    """Insert one ``conversions`` row + per-level ``commissions`` rows.

    Idempotent: relies on the ``UNIQUE(provider_txn_id)`` constraint on
    ``conversions`` — a duplicate call short-circuits and returns
    ``{"status": "already_processed"}``.

    Returns ``{"status": "no_agent"}`` if the code doesn't resolve. Callers
    should treat that as a soft failure (subscription still succeeds).
    """
    agent = await resolve_agent_by_code(sess, agent_referral_code)
    if not agent:
        return {"status": "no_agent", "code": agent_referral_code}

    existing = (await sess.execute(
        text("SELECT id FROM conversions WHERE provider_txn_id = :txn"),
        {"txn": provider_txn_id},
    )).fetchone()
    if existing:
        return {"status": "already_processed", "conversion_id": str(existing.id)}

    manager = None
    if agent.parent_partner_id:
        manager = (await sess.execute(
            text("SELECT id, full_name, status, parent_partner_id FROM partners WHERE id = :id"),
            {"id": str(agent.parent_partner_id)},
        )).fetchone()

    network_head = None
    if manager and manager.parent_partner_id:
        network_head = (await sess.execute(
            text("SELECT id, full_name, status FROM partners WHERE id = :id"),
            {"id": str(manager.parent_partner_id)},
        )).fetchone()

    gm = (await sess.execute(
        text("SELECT id FROM partners WHERE notes LIKE '%GM rider%' LIMIT 1")
    )).fetchone()

    split = calculate_ch6_split(
        Decimal(plan_price_kes),
        agent_active=(agent.status == "active"),
        manager_active=(manager.status == "active") if manager else False,
        network_head_active=(network_head.status == "active") if network_head else False,
    )

    conversion_id = str(uuid.uuid4())
    await sess.execute(text("""
        INSERT INTO conversions
          (id, subscriber_id, partner_id, channel_type, plan, plan_price_kes,
           payment_provider, provider_txn_id, status, subscription_month,
           is_first_conversion, confirmed_at)
        VALUES
          (:id, :sub_id, :agent_id, 'insurance_agent', :plan, :price,
           :provider, :txn, 'confirmed', :month, :is_first, NOW())
    """), {
        "id": conversion_id, "sub_id": str(subscriber_id), "agent_id": str(agent.id),
        "plan": plan, "price": split["amount_kes"],
        "provider": payment_provider, "txn": provider_txn_id,
        "month": subscription_month, "is_first": is_first_conversion,
    })

    payout_month = datetime.now(timezone.utc).replace(day=1).date()
    levels: list[tuple[Any, str, Decimal, Decimal]] = [
        (agent.id, "agent", split["agent_rate"], split["agent_kes"]),
    ]
    if manager:
        levels.append((manager.id, "manager_override", split["manager_rate"], split["manager_kes"]))
    if network_head:
        levels.append((network_head.id, "network_head_override", split["network_head_rate"], split["network_head_kes"]))
    if gm:
        levels.append((gm.id, "gm_rider", split["gm_rider_rate"], split["gm_rider_kes"]))

    credited: list[dict[str, Any]] = []
    for partner_id, comm_type, rate, amount in levels:
        if amount <= Decimal("0.00"):
            continue
        await sess.execute(text("""
            INSERT INTO commissions
              (id, conversion_id, partner_id, channel_type, commission_type,
               plan, plan_price_kes, commission_rate, commission_kes,
               subscription_month, status, payout_month)
            VALUES
              (:id, :conv_id, :partner_id, 'insurance_agent', :type,
               :plan, :price, :rate, :amount,
               :month, 'pending', :payout_month)
        """), {
            "id": str(uuid.uuid4()), "conv_id": conversion_id,
            "partner_id": str(partner_id), "type": comm_type,
            "plan": plan, "price": split["amount_kes"],
            "rate": rate, "amount": amount,
            "month": subscription_month, "payout_month": payout_month,
        })
        credited.append({"partner_id": str(partner_id), "type": comm_type, "amount": str(amount)})

    return {
        "status": "processed",
        "conversion_id": conversion_id,
        "agent_id": str(agent.id),
        "agent_name": agent.full_name,
        "manager_name": manager.full_name if manager else None,
        "network_head_name": network_head.full_name if network_head else None,
        "credited": credited,
        "total_kes": str(split["total_kes"]),
    }
