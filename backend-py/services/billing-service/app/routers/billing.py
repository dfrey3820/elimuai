"""Billing / M-Pesa / invoice / coupon HTTP routes."""
from __future__ import annotations

import json
import time
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import decode_jwt
from elimu_common.ch6_commission import resolve_agent_by_code

from ..coupons import CouponError, validate_coupon
from ..deps import AdminOnly, current_principal, get_bullmq, get_principal, get_session, settings
from ..gateway_client import PaymentGatewayClient, PaymentGatewayError
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

    # Validate the optional CH6 agent referral code up-front. We tolerate an
    # unknown code (checkout still proceeds) but persist the *validated* code
    # on the payment metadata so the webhook can credit commissions.
    validated_agent_code: str | None = None
    validated_agent_id: str | None = None
    if body.agent_referral_code:
        agent_row = await resolve_agent_by_code(sess, body.agent_referral_code)
        if agent_row:
            validated_agent_code = body.agent_referral_code.upper().strip()
            validated_agent_id = str(agent_row.id)

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

    payment_metadata: dict = {}
    if validated_agent_code:
        payment_metadata["agent_referral_code"] = validated_agent_code
        payment_metadata["agent_partner_id"] = validated_agent_id

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
        metadata_json=payment_metadata,
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

    # Route the STK push through the external payment gateway if configured;
    # otherwise fall back to the legacy Node mpesa-service BullMQ consumer.
    #
    # Guardrail: if the operator wired a gateway URL but the API key/secret
    # never made it into the container (typo, Secrets Manager JSON key missing,
    # ECS failed to inject the secret, etc.) we used to silently enqueue to a
    # BullMQ queue with no consumer — payments would sit pending forever with
    # no visible error. Fail loud here instead so the caller sees a 503 and
    # the payment row records exactly what went wrong.
    if settings.payment_gateway_url and not (settings.payment_gateway_api_key and settings.payment_gateway_api_secret):
        missing = [
            k for k, v in (
                ("PAYMENT_GATEWAY_API_KEY", settings.payment_gateway_api_key),
                ("PAYMENT_GATEWAY_API_SECRET", settings.payment_gateway_api_secret),
            ) if not v
        ]
        await sess.execute(
            text(
                "UPDATE payments SET status = 'failed', "
                "metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:m AS jsonb) WHERE id = :id"
            ),
            {
                "id": payment.id,
                "m": json.dumps({
                    "error": "gateway_misconfigured",
                    "missing_env": missing,
                }),
            },
        )
        await sess.commit()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"Payment gateway is misconfigured (missing {', '.join(missing)}). "
            "Contact support; your card was not charged.",
        )

    if settings.payment_gateway_url and settings.payment_gateway_api_key and settings.payment_gateway_api_secret:
        gateway = PaymentGatewayClient(
            settings.payment_gateway_url,
            settings.payment_gateway_api_key,
            settings.payment_gateway_api_secret,
        )
        try:
            gw_response = await gateway.stk_push(
                phone_number=body.phone,
                amount=float(final_amount),
                reference=reference,
                description=f"ElimuAI {body.plan} Plan ({body.billing_cycle})",
            )
        except PaymentGatewayError as exc:
            # Roll the payment forward into a failed state so the user can retry.
            # Preserve the venus status code and response body so ops can
            # actually diagnose what happened from payments.metadata.
            await sess.execute(
                text(
                    "UPDATE payments SET status = 'failed', "
                    "metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:m AS jsonb) WHERE id = :id"
                ),
                {
                    "id": payment.id,
                    "m": json.dumps({
                        "error": "gateway_error",
                        "gateway_status_code": exc.status_code,
                        "gateway_body": (exc.body or "")[:2000],
                        "gateway_message": str(exc),
                    }),
                },
            )
            await sess.commit()
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                f"Payment gateway rejected the request: {exc}",
            ) from exc

        # Persist whatever transaction handle the gateway returned for tracing.
        # Extract the gateway's transaction handle for later correlation.
        # Venus responses have been observed with the handle in several places
        # (top-level and nested under ``data``) so accept any of them.
        _gw_data = gw_response.get("data") if isinstance(gw_response.get("data"), dict) else {}
        gw_txn = (
            gw_response.get("transactionId")
            or gw_response.get("transaction_id")
            or gw_response.get("reference")
            or gw_response.get("id")
            or gw_response.get("checkoutRequestId")
            or gw_response.get("CheckoutRequestID")
            or _gw_data.get("transactionId")
            or _gw_data.get("transaction_id")
            or _gw_data.get("reference")
            or _gw_data.get("id")
        )
        if gw_txn:
            await sess.execute(
                update(Payment).where(Payment.id == payment.id).values(mpesa_checkout_id=str(gw_txn))
            )
            await sess.commit()

        return MpesaInitiateOut(
            success=True,
            paymentId=payment.id,
            jobId=str(gw_txn) if gw_txn else reference,
            status="stk_sent",
            couponApplied=coupon_row.code if coupon_row else None,
            couponDiscount=float(coupon_discount),
            finalAmount=float(final_amount),
            message=f"STK push sent to {body.phone}. Enter your M-Pesa PIN to complete payment.",
        )

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


@router.post("/admin/reconcile/{payment_id}", dependencies=[AdminOnly])
async def admin_reconcile_payment(
    payment_id: uuid.UUID,
    request: Request,
    sess: AsyncSession = Depends(get_session),
):
    """Force-poll the payment gateway for one stuck payment and apply the result.

    Useful when a webhook was lost. Idempotent — safe to call repeatedly.
    Returns the current state plus a ``reconciled`` flag.
    """
    from ..reconciler import _build_client, reconcile_payment

    client = _build_client(settings)
    if client is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Payment gateway not configured (missing PAYMENT_GATEWAY_URL / API key / API secret).",
        )
    payment = (await sess.execute(
        text("SELECT * FROM payments WHERE id = :id"), {"id": payment_id}
    )).mappings().first()
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    return await reconcile_payment(sess, request.app.state.event_bus, client, dict(payment))


@router.post("/admin/reconcile", dependencies=[AdminOnly])
async def admin_reconcile_sweep(request: Request):
    """Run one reconciliation sweep on demand. Admin-only.

    Returns the same counters the background loop logs each cycle:
    ``{scanned, reconciled, still_pending, errors}``.
    """
    from ..reconciler import run_once
    counts = await run_once(request.app)
    return {"ok": True, **counts}


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


# ─── Coupons admin CRUD (super_admin / admin) ────────────────────────────────
from fastapi import Query as _Query  # noqa: E402
from pydantic import BaseModel as _BM, Field as _F  # noqa: E402


class _CouponCreate(_BM):
    code: str = _F(..., min_length=2, max_length=50)
    description: str | None = None
    type: str = _F(..., pattern=r"^(fixed|percentage)$")
    value: float
    min_amount: float | None = 0
    max_discount: float | None = None
    applicable_plans: list[str] | None = None
    applicable_cycles: list[str] | None = None
    max_uses: int | None = None
    max_uses_per_user: int | None = 1
    starts_at: datetime | None = None
    expires_at: datetime | None = None


class _CouponUpdate(_BM):
    description: str | None = None
    type: str | None = None
    value: float | None = None
    min_amount: float | None = None
    max_discount: float | None = None
    applicable_plans: list[str] | None = None
    applicable_cycles: list[str] | None = None
    max_uses: int | None = None
    max_uses_per_user: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None


@coupons_router.get("/admin", dependencies=[AdminOnly])
async def list_coupons_admin(
    page: int = _Query(1, ge=1),
    limit: int = _Query(20, ge=1, le=100),
    sess: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    rows = (await sess.execute(text(
        """
        SELECT c.*, u.name AS created_by_name
          FROM coupons c LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC LIMIT :lim OFFSET :off
        """
    ), {"lim": limit, "off": offset})).mappings().all()
    total = (await sess.execute(text("SELECT COUNT(*) c FROM coupons"))).mappings().first()
    return {"coupons": [dict(r) for r in rows], "total": int(total["c"]) if total else 0,
            "page": page, "limit": limit}


@coupons_router.post("/admin", status_code=201, dependencies=[AdminOnly])
async def create_coupon_admin(
    body: _CouponCreate,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    if body.type == "percentage" and not (0 <= body.value <= 100):
        raise HTTPException(400, "Percentage must be between 0 and 100")
    try:
        row = (await sess.execute(text(
            """
            INSERT INTO coupons
              (code, description, type, value, min_amount, max_discount,
               applicable_plans, applicable_cycles, max_uses, max_uses_per_user,
               starts_at, expires_at, created_by)
            VALUES
              (UPPER(:code), :description, :type, :value, :min_amount, :max_discount,
               :applicable_plans, :applicable_cycles, :max_uses, :max_uses_per_user,
               :starts_at, :expires_at, :created_by)
            RETURNING *
            """
        ), {
            "code": body.code.strip(),
            "description": body.description,
            "type": body.type,
            "value": body.value,
            "min_amount": body.min_amount or 0,
            "max_discount": body.max_discount,
            "applicable_plans": body.applicable_plans or [],
            "applicable_cycles": body.applicable_cycles or [],
            "max_uses": body.max_uses,
            "max_uses_per_user": body.max_uses_per_user or 1,
            "starts_at": body.starts_at,
            "expires_at": body.expires_at,
            "created_by": uuid.UUID(principal.user_id),
        })).mappings().first()
        await sess.commit()
    except Exception as exc:  # noqa: BLE001
        await sess.rollback()
        if "23505" in str(exc) or "duplicate key" in str(exc).lower():
            raise HTTPException(409, "Coupon code already exists") from exc
        raise HTTPException(500, "Failed to create coupon") from exc
    return {"coupon": dict(row) if row else None}


@coupons_router.put("/admin/{coupon_id}", dependencies=[AdminOnly])
async def update_coupon_admin(
    coupon_id: uuid.UUID,
    body: _CouponUpdate,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(text(
        """
        UPDATE coupons SET
          description       = COALESCE(:description, description),
          type              = COALESCE(:type, type),
          value             = COALESCE(:value, value),
          min_amount        = COALESCE(:min_amount, min_amount),
          max_discount      = :max_discount,
          applicable_plans  = COALESCE(:applicable_plans, applicable_plans),
          applicable_cycles = COALESCE(:applicable_cycles, applicable_cycles),
          max_uses          = :max_uses,
          max_uses_per_user = COALESCE(:max_uses_per_user, max_uses_per_user),
          is_active         = COALESCE(:is_active, is_active),
          starts_at         = :starts_at,
          expires_at        = :expires_at
        WHERE id = :id RETURNING *
        """
    ), {
        "id": coupon_id,
        "description": body.description,
        "type": body.type,
        "value": body.value,
        "min_amount": body.min_amount,
        "max_discount": body.max_discount,
        "applicable_plans": body.applicable_plans,
        "applicable_cycles": body.applicable_cycles,
        "max_uses": body.max_uses,
        "max_uses_per_user": body.max_uses_per_user,
        "is_active": body.is_active,
        "starts_at": body.starts_at,
        "expires_at": body.expires_at,
    })).mappings().first()
    if not row:
        raise HTTPException(404, "Coupon not found")
    await sess.commit()
    return {"coupon": dict(row)}


@coupons_router.delete("/admin/{coupon_id}", dependencies=[AdminOnly])
async def delete_coupon_admin(
    coupon_id: uuid.UUID,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text("DELETE FROM coupons WHERE id = :id RETURNING id, code"),
        {"id": coupon_id},
    )).mappings().first()
    if not row:
        raise HTTPException(404, "Coupon not found")
    await sess.commit()
    return {"success": True}


@coupons_router.get("/admin/{coupon_id}/usages", dependencies=[AdminOnly])
async def coupon_usages_admin(
    coupon_id: uuid.UUID,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(text(
        """
        SELECT cu.*, u.name AS user_name, u.email AS user_email
          FROM coupon_usages cu JOIN users u ON cu.user_id = u.id
         WHERE cu.coupon_id = :id
         ORDER BY cu.created_at DESC LIMIT 50
        """
    ), {"id": coupon_id})).mappings().all()
    return {"usages": [dict(r) for r in rows]}


# ─── POST /api/payments/invoices/{id}/email ──────────────────────────────────
@router.post("/invoices/{invoice_id}/email")
async def email_invoice(
    invoice_id: uuid.UUID,
    request: Request,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Publish an `invoice.issued` event so notifications-service can email the PDF."""
    inv = (await sess.execute(
        text(
            "SELECT i.*, u.email AS user_email, u.name AS user_name "
            "FROM invoices i JOIN users u ON i.user_id = u.id "
            "WHERE i.id = :id AND i.user_id = :uid"
        ),
        {"id": invoice_id, "uid": uuid.UUID(principal.user_id)},
    )).mappings().first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    bus = getattr(request.app.state, "event_bus", None)
    if bus is None:
        # Best-effort — if event bus isn't wired we still return success so the
        # UI toast reads "Emailed" (matches Node behaviour when SMTP is unset).
        return {"success": True, "queued": False}
    await bus.publish("invoice.issued", {
        "invoice_id": str(invoice_id),
        "invoice_number": inv.get("invoice_number"),
        "user_id": str(inv["user_id"]),
        "user_email": inv["user_email"],
        "user_name": inv["user_name"],
        "amount": float(inv["amount"]),
        "currency": inv.get("currency", "KES"),
        "plan": inv.get("plan"),
    })
    return {"success": True, "queued": True}
