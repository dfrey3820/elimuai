"""Pricing + invoice creation service (mirrors backend/src/services/invoiceService.js)."""
from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AdminSetting, Invoice

CYCLE_MONTHS = {"monthly": 1, "quarterly": 3, "semi_annual": 6, "annual": 12}
DEFAULT_PLAN_AMOUNTS = {  # KES/month, fallbacks if admin_settings unset
    "student": 299,
    "parent": 499,
    "teacher": 999,
    "school": 15000,
    "family": 499,
    "enterprise": 15000,
}


async def _get_setting(sess: AsyncSession, key: str, default: str | None = None) -> str | None:
    row = (await sess.execute(select(AdminSetting.value).where(AdminSetting.key == key))).scalar_one_or_none()
    return row if row is not None else default


async def get_all_settings(sess: AsyncSession) -> dict[str, str]:
    rows = (await sess.execute(select(AdminSetting.key, AdminSetting.value))).all()
    return {k: v for k, v in rows}


async def get_trial_config(sess: AsyncSession) -> dict:
    settings = await get_all_settings(sess)
    trial_days = int(settings.get("trial_days") or 7)
    plans = {}
    for role, default_amt in DEFAULT_PLAN_AMOUNTS.items():
        amt = int(settings.get(f"{role}_subscription_amount") or default_amt)
        days = int(settings.get(f"{role}_subscription_days") or 30)
        plans[role] = {"amount": amt, "days": days, "currency": "KES"}
    return {"trialDays": trial_days, "plans": plans}


async def get_cycle_discount(sess: AsyncSession, cycle: str) -> int:
    key_map = {
        "monthly": None,
        "quarterly": "billing_quarterly_discount",
        "semi_annual": "billing_semi_annual_discount",
        "annual": "billing_annual_discount",
    }
    key = key_map.get(cycle)
    if not key:
        return 0
    val = await _get_setting(sess, key)
    return int(val) if val else 0


def _add_months(d: date, months: int) -> date:
    """Calendar-accurate month addition (fixes the 360 vs 365 bug)."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


async def calculate_cycle_price(sess: AsyncSession, role: str, cycle: str) -> dict:
    cfg = await get_trial_config(sess)
    plan = cfg["plans"].get(role) or cfg["plans"]["student"]
    months = CYCLE_MONTHS.get(cycle, 1)
    discount = await get_cycle_discount(sess, cycle)
    raw = int(plan["amount"]) * months
    discounted = round(raw * (1 - discount / 100))
    now = date.today()
    end = _add_months(now, months)
    duration_days = (end - now).days
    return {
        "monthlyPrice": int(plan["amount"]),
        "months": months,
        "discount": discount,
        "originalTotal": raw,
        "total": discounted,
        "savings": raw - discounted,
        "durationDays": duration_days,
        "currency": "KES",
    }


async def get_all_cycle_prices(sess: AsyncSession, role: str) -> dict[str, dict]:
    out = {}
    for cycle in ("monthly", "quarterly", "semi_annual", "annual"):
        out[cycle] = await calculate_cycle_price(sess, role, cycle)
    return out


async def next_invoice_number(sess: AsyncSession) -> str:
    prefix = f"INV-{datetime.utcnow().strftime('%Y%m')}"
    row = (await sess.execute(
        text("SELECT invoice_number FROM invoices WHERE invoice_number LIKE :p ORDER BY invoice_number DESC LIMIT 1"),
        {"p": f"{prefix}-%"},
    )).scalar_one_or_none()
    seq = 1
    if row:
        try:
            seq = int(row.split("-")[-1]) + 1
        except ValueError:
            pass
    return f"{prefix}-{seq:04d}"


async def create_invoice(
    sess: AsyncSession,
    *,
    user_id,
    plan: str,
    billing_cycle: str,
    amount: Decimal | float,
    subtotal: Decimal | float | None = None,
    coupon_code: str | None = None,
    coupon_discount: Decimal | float = 0,
    currency: str = "KES",
    payment_id=None,
    status: str = "pending",
) -> Invoice:
    invoice_number = await next_invoice_number(sess)
    months = CYCLE_MONTHS.get(billing_cycle, 1)
    now = date.today()
    period_end = _add_months(now, months)
    inv = Invoice(
        invoice_number=invoice_number,
        user_id=user_id,
        payment_id=payment_id,
        plan=plan,
        billing_cycle=billing_cycle,
        amount=Decimal(str(amount)),
        currency=currency,
        status=status,
        period_start=now,
        period_end=period_end,
        due_date=now,
        subtotal=Decimal(str(subtotal if subtotal is not None else amount)),
        coupon_code=coupon_code,
        coupon_discount=Decimal(str(coupon_discount)),
    )
    sess.add(inv)
    await sess.flush()
    return inv
