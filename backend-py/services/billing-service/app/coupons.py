"""Coupon validation logic (mirrors backend/src/routes/coupons.js)."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Coupon, CouponUsage


class CouponError(Exception):
    def __init__(self, message: str, http_status: int = 400):
        super().__init__(message)
        self.http_status = http_status


async def find_coupon(sess: AsyncSession, code: str) -> Coupon | None:
    return (await sess.execute(
        select(Coupon).where(func.upper(Coupon.code) == code.strip().upper(), Coupon.is_active.is_(True))
    )).scalar_one_or_none()


async def validate_coupon(
    sess: AsyncSession,
    *,
    code: str,
    user_id: uuid.UUID,
    plan: str | None = None,
    billing_cycle: str | None = None,
    amount: float | None = None,
) -> tuple[Coupon, Decimal, Decimal | None]:
    """Returns (coupon, discount_amount, final_amount_after_discount)."""
    coupon = await find_coupon(sess, code)
    if not coupon:
        raise CouponError("Invalid coupon code", 404)
    now = datetime.utcnow()
    if coupon.starts_at and coupon.starts_at > now:
        raise CouponError("This coupon is not yet active")
    if coupon.expires_at and coupon.expires_at < now:
        raise CouponError("This coupon has expired")
    if coupon.max_uses is not None and coupon.times_used >= coupon.max_uses:
        raise CouponError("This coupon has been fully redeemed")

    if coupon.max_uses_per_user:
        used = (await sess.execute(
            select(func.count()).select_from(CouponUsage).where(
                CouponUsage.coupon_id == coupon.id, CouponUsage.user_id == user_id
            )
        )).scalar_one()
        if used >= coupon.max_uses_per_user:
            raise CouponError("You have already used this coupon")

    if coupon.applicable_plans and plan and plan not in coupon.applicable_plans:
        raise CouponError(f"This coupon is not valid for the {plan} plan")
    if coupon.applicable_cycles and billing_cycle and billing_cycle not in coupon.applicable_cycles:
        raise CouponError(f"This coupon is not valid for {billing_cycle} billing")
    if coupon.min_amount and amount is not None and Decimal(str(amount)) < coupon.min_amount:
        raise CouponError(f"Minimum order amount is KES {coupon.min_amount}")

    if coupon.type == "percentage":
        base = Decimal(str(amount)) if amount is not None else coupon.value
        discount = (base * coupon.value / Decimal(100)).quantize(Decimal("1"))
        if coupon.max_discount and discount > coupon.max_discount:
            discount = coupon.max_discount
    else:
        discount = coupon.value

    final_amount = None
    if amount is not None:
        final_amount = max(Decimal("0"), Decimal(str(amount)) - discount)
    return coupon, discount, final_amount
