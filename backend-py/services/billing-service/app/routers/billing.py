"""Billing / M-Pesa / invoice / coupon HTTP routes."""
from __future__ import annotations

import time
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import decode_jwt

from ..coupons import CouponError, validate_coupon
from ..deps import current_principal, get_bullmq, get_principal, get_session, settings
from ..models import Coupon, CouponUsage, Invoice, Payment
from ..pdf import generate_invoice_pdf
from ..pricing import calculate_cycle_price, create_invoice, get_all_cycle_prices, get_all_settings, get_trial_config
from ..schemas import (
    CouponInfo,
    CouponValidateIn,
    CouponValidateOut,
    InvoiceOut,
    MpesaInitiateIn,
    MpesaInitiateOut,
    PaymentOut,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])
coupons_router = APIRouter(prefix="/api/coupons", tags=["coupons"])


@router.get("/subscription-info")
async def subscription_info(sess: AsyncSession = Depends(get_session)):
    cfg = await get_trial_config(sess)
    pricing = {}
    for role in ("student", "teacher", "parent", "school"):
        pricing[role] = await get_all_cycle_prices(sess, role)
    all_settings = await get_all_settings(sess)
    billing_enabled = (all_settings.get("billing_enabled", "true") != "false")
    return {
        "trialDays": cfg["trialDays"],
        "plans": cfg["plans"],
        "pricing": pricing,
        "currency": "KES",
        "billingEnabled": billing_enabled,
    }


@router.get("/subscription-status")
async def subscription_status(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Return the caller's live subscription status. Consumed by the frontend
    on load to decide whether AI features should be enabled and whether to
    show renewal warnings.

    Response:
      {
        plan, planActive, trialActive, expiresAt, daysRemaining,
        aiEnabled, source ('school'|'personal'|'trial'|'expired'|'exempt'),
        role, hasSchool, billingEnabled
      }
    """
    from datetime import datetime, timezone

    row = (await sess.execute(
        text(
            """
            SELECT u.plan, u.plan_expires, u.trial_expires, u.role, u.school_id,
                   s.plan AS school_plan, s.plan_expires AS school_plan_expires
            FROM users u
            LEFT JOIN schools s ON s.id = u.school_id
            WHERE u.id = :uid
            """
        ),
        {"uid": uuid.UUID(principal.user_id)},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    now = datetime.utcnow()
    all_settings = await get_all_settings(sess)
    billing_enabled = (all_settings.get("billing_enabled", "true") != "false")

    def _iso(v):
        if not v:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()

    def _days(v):
        if not v:
            return None
        d = v.replace(tzinfo=None) if v.tzinfo else v
        return max(0, (d - now).days)

    plan = row["plan"] or "free"
    plan_expires = row["plan_expires"]
    trial_expires = row["trial_expires"]
    school_plan = row["school_plan"]
    school_plan_expires = row["school_plan_expires"]

    plan_active = plan != "free" and plan_expires is not None and plan_expires > now
    school_active = (
        row["school_id"] is not None
        and school_plan is not None
        and school_plan != "free"
        and school_plan_expires is not None
        and school_plan_expires > now
    )
    trial_active = trial_expires is not None and trial_expires > now

    # Admins/super_admins never lose access; billing enforcement doesn't apply.
    if row["role"] in ("admin", "super_admin"):
        source = "exempt"
        ai_enabled = True
        expires_at = None
        days_remaining = None
    elif not billing_enabled:
        source = "exempt"
        ai_enabled = True
        expires_at = _iso(plan_expires or school_plan_expires or trial_expires)
        days_remaining = _days(plan_expires or school_plan_expires or trial_expires)
    elif school_active:
        source = "school"
        ai_enabled = True
        expires_at = _iso(school_plan_expires)
        days_remaining = _days(school_plan_expires)
    elif plan_active:
        source = "personal"
        ai_enabled = True
        expires_at = _iso(plan_expires)
        days_remaining = _days(plan_expires)
    elif trial_active:
        source = "trial"
        ai_enabled = True
        expires_at = _iso(trial_expires)
        days_remaining = _days(trial_expires)
    else:
        source = "expired"
        ai_enabled = False
        expires_at = _iso(trial_expires or plan_expires)
        days_remaining = 0

    return {
        "plan": plan,
        "planActive": plan_active,
        "trialActive": trial_active,
        "schoolPlan": school_plan,
        "schoolPlanActive": school_active,
        "expiresAt": expires_at,
        "daysRemaining": days_remaining,
        "aiEnabled": ai_enabled,
        "source": source,
        "role": row["role"],
        "hasSchool": row["school_id"] is not None,
        "billingEnabled": billing_enabled,
    }


@router.get("/pricing/{role}")
async def pricing_role(role: str, sess: AsyncSession = Depends(get_session)):
    if role not in ("student", "teacher", "parent", "school"):
        role = "student"
    return {"role": role, "cycles": await get_all_cycle_prices(sess, role), "currency": "KES"}


@router.post("/mpesa/initiate", response_model=MpesaInitiateOut)
async def mpesa_initiate(
    body: MpesaInitiateIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    bullmq=Depends(get_bullmq),
):
    user_id = uuid.UUID(principal.user_id)
    price = await calculate_cycle_price(sess, body.plan, body.billing_cycle)

    coupon_discount = Decimal("0")
    coupon_row: Coupon | None = None
    if body.coupon_code:
        try:
            coupon_row, coupon_discount, _ = await validate_coupon(
                sess,
                code=body.coupon_code,
                user_id=user_id,
                plan=body.plan,
                billing_cycle=body.billing_cycle,
                amount=float(price["total"]),
            )
        except CouponError:
            # Silently ignore invalid coupons at initiate — user was warned via /coupons/validate
            coupon_row = None
            coupon_discount = Decimal("0")

    final_amount = max(Decimal("1"), Decimal(str(price["total"])) - coupon_discount)
    reference = f"ELIMU-{int(time.time() * 1000)}-{str(user_id)[:8].upper()}"

    # Create invoice first
    inv = await create_invoice(
        sess,
        user_id=user_id,
        plan=body.plan,
        billing_cycle=body.billing_cycle,
        amount=final_amount,
        subtotal=Decimal(str(price["total"])),
        coupon_code=coupon_row.code if coupon_row else None,
        coupon_discount=coupon_discount,
    )

    # Create pending payment
    payment = Payment(
        user_id=user_id,
        plan=body.plan,
        billing_cycle=body.billing_cycle,
        amount=final_amount,
        currency=price["currency"],
        method="mpesa",
        status="pending",
        phone_number=body.phone,
        reference=reference,
        invoice_id=inv.id,
        coupon_id=coupon_row.id if coupon_row else None,
        coupon_discount=coupon_discount,
    )
    sess.add(payment)
    await sess.flush()

    # Link invoice to payment
    await sess.execute(update(Invoice).where(Invoice.id == inv.id).values(payment_id=payment.id))

    # Record coupon usage
    if coupon_row:
        sess.add(CouponUsage(
            coupon_id=coupon_row.id, user_id=user_id, payment_id=payment.id, discount=coupon_discount,
        ))
        await sess.execute(
            update(Coupon).where(Coupon.id == coupon_row.id).values(times_used=Coupon.times_used + 1)
        )

    await sess.commit()

    # Enqueue for mpesa-service (Node BullMQ consumer)
    job_id = await bullmq.enqueue(
        settings.payment_queue_name,
        "stkpush",
        {
            "paymentId": str(payment.id),
            "phone": body.phone,
            "amount": float(final_amount),
            "accountReference": reference,
            "transactionDesc": f"ElimuAI {body.plan} Plan ({body.billing_cycle})",
        },
    )

    return MpesaInitiateOut(
        success=True,
        paymentId=payment.id,
        jobId=job_id,
        status="queued",
        couponApplied=coupon_row.code if coupon_row else None,
        couponDiscount=float(coupon_discount),
        finalAmount=float(final_amount),
        message=f"Payment queued. STK push will arrive on {body.phone} shortly.",
    )


@router.get("/status/{payment_id}")
async def payment_status(
    payment_id: uuid.UUID,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    p = (await sess.execute(select(Payment).where(
        Payment.id == payment_id, Payment.user_id == uuid.UUID(principal.user_id)
    ))).scalar_one_or_none()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    return {"payment": PaymentOut.model_validate(p).model_dump(mode="json")}


@router.get("/history")
async def payment_history(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(
        select(Payment).where(Payment.user_id == uuid.UUID(principal.user_id))
        .order_by(Payment.created_at.desc()).limit(20)
    )).scalars().all()
    return {"payments": [PaymentOut.model_validate(p).model_dump(mode="json") for p in rows]}


@router.get("/invoices")
async def list_invoices(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(
        select(Invoice).where(Invoice.user_id == uuid.UUID(principal.user_id))
        .order_by(Invoice.created_at.desc()).limit(20)
    )).scalars().all()
    return {"invoices": [InvoiceOut.model_validate(r).model_dump(mode="json") for r in rows]}


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(
    invoice_id: uuid.UUID,
    request: Request,
    sess: AsyncSession = Depends(get_session),
):
    # Accept token via query param OR Authorization header (browser downloads).
    token = request.query_params.get("token") or (request.headers.get("authorization") or "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    payload = decode_jwt(token, settings.jwt_secret)
    user_id_str = payload.get("userId") or payload.get("sub")
    if not user_id_str:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user_id = uuid.UUID(str(user_id_str))

    user_row = (await sess.execute(
        text("SELECT id, name FROM users WHERE id = :uid AND is_active = TRUE"), {"uid": user_id}
    )).mappings().first()
    if not user_row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    inv = (await sess.execute(select(Invoice).where(
        Invoice.id == invoice_id, Invoice.user_id == user_id
    ))).scalar_one_or_none()
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")

    pdf = generate_invoice_pdf(inv, user_row["name"])
    return FastAPIResponse(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ElimuAI-Invoice-{inv.invoice_number}.pdf"'},
    )


@router.post("/reminders/run")
async def run_subscription_reminders(request: Request, principal=Depends(get_principal)):
    """Ad-hoc trigger of the subscription-reminder scheduler. Admin-only.

    Publishes ``billing.reminder_free`` for free-plan admins and
    ``billing.reminder_expiring`` for paid admins within
    ``reminders_expiring_days`` of expiry. Notifications-service converts each
    event into an email. Idempotency is enforced by ``subscription_reminders``.
    """
    if principal.role not in ("admin", "super_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only.")
    from ..scheduler import run_once
    counts = await run_once(request.app)
    return {"ok": True, "sent": counts}


# ─── Coupons ─────────────────────────────────────────────────────────────────
@coupons_router.post("/validate", response_model=CouponValidateOut)
async def coupon_validate(
    body: CouponValidateIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    try:
        coupon, discount, final_amount = await validate_coupon(
            sess,
            code=body.code,
            user_id=uuid.UUID(principal.user_id),
            plan=body.plan,
            billing_cycle=body.billing_cycle,
            amount=body.amount,
        )
    except CouponError as exc:
        return CouponValidateOut(valid=False, error=str(exc), discount=0)
    return CouponValidateOut(
        valid=True,
        coupon=CouponInfo(
            id=coupon.id, code=coupon.code, type=coupon.type,
            value=float(coupon.value), description=coupon.description,
        ),
        discount=float(discount),
        finalAmount=float(final_amount) if final_amount is not None else None,
    )
