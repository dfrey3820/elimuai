"""Public inbound webhook for external payment gateways.

External payment gateways (e.g. venus.elimuai.africa) POST payment outcomes to
this endpoint. Requests must be authenticated with an HMAC-SHA256 signature.

Endpoint
--------
    POST /api/payments/webhook/gateway
    Headers:
        Content-Type: application/json
        X-Signature: sha256=<hex digest of raw body>
        X-Timestamp: <unix seconds, optional but recommended>

Signature schemes (either is accepted, X-Signature takes precedence)
-------------------------------------------------------------------
* ``X-Signature`` — HMAC-SHA256 of the raw body keyed with the gateway's
  API secret (``PAYMENT_GATEWAY_API_SECRET``, e.g. venus's ``sk_…``).
  Preferred scheme; used by venus.
* ``X-Elimu-Signature`` — HMAC-SHA256 of the raw body keyed with the shared
  ``PAYMENT_WEBHOOK_SECRET``. Kept for legacy / direct-integration and test
  tooling.

Supported payload shapes
------------------------
1. Venus / provider-agnostic envelope (preferred):

    {
      "event": "transaction.completed" | "transaction.failed",
      "data": {
        "reference":         "<echo of the reference we submitted>",
        "gateway":           "mpesa",
        "mode":              "stk_push",
        "status":            "completed" | "failed",
        "amount":            1.0,
        "amount_paid":       1.0,
        "currency":          "KES",
        "phone_number":      "254712345678",
        "description":       "Subscription payment",
        "gateway_reference": "SHJ7ABCDE0",           // provider receipt (M-Pesa)
        "failure_reason":    null
      }
    }

2. Legacy flat shape (kept for direct-integration / test tooling):

    {
      "paymentId":  "<uuid>",             // preferred lookup key
      "reference":  "ELIMU-<ts>-<uid>",   // alternative lookup key
      "status":     "success" | "failed",
      "receipt":    "QK12ABCXYZ",         // provider receipt (M-Pesa code)
      "amount":     499,
      "phone":      "254712345678",
      "error":      "insufficient funds"  // optional
    }

Response
--------
    200 { "ok": true, "paymentId": "...", "status": "completed" }
    200 { "ok": true, "already_processed": true, "status": "completed" }
    400 on malformed body / bad signature
    404 if the payment cannot be located
"""
from __future__ import annotations

import hmac
import json
import time
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from hashlib import sha256
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import get_event_bus, get_session, settings
from ..models import Invoice, Payment
from ..pricing import CYCLE_MONTHS, _add_months

from elimu_common.ch6_commission import credit_ch6_conversion

# Public — do NOT require auth_request in the gateway. Router prefix intentionally
# nested under /api/payments/webhook/ so nginx can carve it out as an unauthenticated
# location while the rest of /api/payments/ stays behind JWT auth.
router = APIRouter(prefix="/api/payments/webhook", tags=["payments-webhook"])

# Reject payloads whose signed timestamp is older than this many seconds
# (defence-in-depth against replay attacks).
_MAX_CLOCK_SKEW_SEC = 300


class GatewayNotification(BaseModel):
    """Normalised representation used by the handler regardless of source shape."""

    paymentId: uuid.UUID | None = None
    reference: str | None = Field(default=None, max_length=100)
    status: str
    receipt: str | None = Field(default=None, max_length=100)
    amount: float | None = None
    phone: str | None = Field(default=None, max_length=32)
    error: str | None = None
    # Anything else the gateway wants us to persist — stored on payment.metadata.
    extra: dict[str, Any] | None = None


def _normalise_payload(raw_json: dict[str, Any]) -> GatewayNotification:
    """Accept both the venus ``{event, data:{...}}`` envelope and the legacy flat shape."""
    # Venus envelope detection: top-level "event" + "data" object.
    if isinstance(raw_json.get("data"), dict) and "event" in raw_json:
        event = str(raw_json.get("event") or "").lower()
        data = raw_json["data"]
        status_val = data.get("status") or (
            "completed" if event.endswith(".completed") else
            "failed" if event.endswith(".failed") else ""
        )
        # Keep everything not otherwise mapped as ``extra`` for audit trail.
        mapped_keys = {
            "reference", "status", "amount", "amount_paid",
            "phone_number", "gateway_reference", "failure_reason",
        }
        extra = {k: v for k, v in data.items() if k not in mapped_keys}
        extra.setdefault("event", raw_json.get("event"))
        return GatewayNotification(
            reference=data.get("reference"),
            status=status_val,
            receipt=data.get("gateway_reference"),
            amount=data.get("amount_paid") if data.get("amount_paid") is not None else data.get("amount"),
            phone=data.get("phone_number"),
            error=data.get("failure_reason"),
            extra=extra or None,
        )
    # Legacy flat shape.
    return GatewayNotification.model_validate(raw_json)


def _verify_signature(raw_body: bytes, header: str | None, secret: str) -> bool:
    if not header or not secret:
        return False
    # Accept both "sha256=<hex>" and bare "<hex>".
    provided = header.split("=", 1)[1] if header.startswith("sha256=") else header
    expected = hmac.new(secret.encode("utf-8"), raw_body, sha256).hexdigest()
    return hmac.compare_digest(provided.strip().lower(), expected.lower())


def _authenticate(request: Request, raw_body: bytes) -> None:
    """Verify one of the accepted signature headers, or raise 401.

    Two schemes are supported:

    * ``X-Signature`` — used by venus. HMAC-SHA256 of the raw body keyed with
      the app API secret (``payment_gateway_api_secret``). This is the primary
      scheme.
    * ``X-Elimu-Signature`` — legacy/direct-integration scheme. HMAC-SHA256
      keyed with the shared ``payment_webhook_secret``.
    """
    gw_secret = getattr(settings, "payment_gateway_api_secret", "") or ""
    shared_secret = getattr(settings, "payment_webhook_secret", "") or ""

    x_sig = request.headers.get("x-signature")
    if x_sig:
        if not gw_secret:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Webhook not configured (missing payment_gateway_api_secret)",
            )
        if not _verify_signature(raw_body, x_sig, gw_secret):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid X-Signature")
        return

    x_elimu = request.headers.get("x-elimu-signature")
    if x_elimu:
        if not shared_secret:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Webhook not configured (missing payment_webhook_secret)",
            )
        if not _verify_signature(raw_body, x_elimu, shared_secret):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid X-Elimu-Signature")
        return

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-Signature header")


def _check_timestamp(header: str | None) -> None:
    if not header:
        return  # optional
    try:
        ts = int(header)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid timestamp header") from exc
    if abs(time.time() - ts) > _MAX_CLOCK_SKEW_SEC:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Stale webhook (timestamp outside skew window)")


@router.post("/gateway")
async def gateway_notification(
    request: Request,
    sess: AsyncSession = Depends(get_session),
    event_bus=Depends(get_event_bus),
):
    raw = await request.body()
    _check_timestamp(
        request.headers.get("x-timestamp") or request.headers.get("x-elimu-timestamp")
    )
    _authenticate(request, raw)

    try:
        raw_json = json.loads(raw)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid JSON body: {exc}") from exc

    try:
        payload = _normalise_payload(raw_json)
    except Exception as exc:  # pydantic will format the details
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid payload: {exc}") from exc

    if not payload.paymentId and not payload.reference:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "paymentId or reference is required")

    # Look up the pending payment. Order:
    #   1. paymentId (flat shape only)
    #   2. reference == payments.reference       (our ELIMU-… reference echoed back)
    #   3. reference == payments.mpesa_checkout_id (venus's own TXN-… id we stored on stkpush)
    if payload.paymentId:
        payment = (
            await sess.execute(text("SELECT * FROM payments WHERE id = :id"), {"id": payload.paymentId})
        ).mappings().first()
    else:
        payment = (
            await sess.execute(
                text(
                    "SELECT * FROM payments "
                    "WHERE reference = :ref OR mpesa_checkout_id = :ref "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"ref": payload.reference},
            )
        ).mappings().first()

    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

    return await finalise_payment(sess, event_bus, payment, payload)


async def finalise_payment(
    sess: AsyncSession,
    event_bus,
    payment: dict[str, Any],
    payload: "GatewayNotification",
) -> dict[str, Any]:
    """Apply a normalised gateway result to a payment row.

    Shared between the inbound webhook and the reconciliation path (admin
    endpoint + background sweeper). Idempotent: returns the current state if
    the payment has already been finalised.
    """
    payment_id = payment["id"]

    # Idempotency: if we already finalised this payment, return the current state.
    if payment["status"] in ("completed", "failed", "refunded"):
        return {"ok": True, "already_processed": True, "paymentId": str(payment_id), "status": payment["status"]}

    normalised = payload.status.lower()
    is_success = normalised in ("success", "completed", "paid", "ok")
    is_failure = normalised in ("failed", "failure", "cancelled", "canceled", "error")
    if not (is_success or is_failure):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported status: {payload.status}")

    metadata_patch: dict[str, Any] = {
        "gateway_receipt": payload.receipt,
        "gateway_amount": payload.amount,
        "gateway_phone": payload.phone,
        "gateway_status": payload.status,
        "gateway_notified_at": datetime.utcnow().isoformat() + "Z",
    }
    if payload.extra:
        metadata_patch["gateway_extra"] = payload.extra
    if payload.error:
        metadata_patch["error"] = payload.error

    # ─── Failure branch ─────────────────────────────────────────────────────
    if is_failure:
        await sess.execute(
            text(
                """
                UPDATE payments
                   SET status = 'failed',
                       metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:meta AS jsonb)
                 WHERE id = :id
                """
            ),
            {"id": payment_id, "meta": _json(metadata_patch)},
        )
        if payment["invoice_id"]:
            await sess.execute(
                update(Invoice).where(Invoice.id == payment["invoice_id"]).values(status="cancelled")
            )
        await sess.commit()

        await event_bus.publish(
            "payment.failed",
            {
                "paymentId": str(payment_id),
                "user_id": str(payment["user_id"]),
                "plan": payment["plan"],
                "billing_cycle": payment["billing_cycle"],
                "amount": float(payment["amount"]),
                "currency": payment["currency"],
                "error": payload.error,
            },
        )
        return {"ok": True, "paymentId": str(payment_id), "status": "failed", "error": payload.error}

    # ─── Success branch ─────────────────────────────────────────────────────
    await sess.execute(
        text(
            """
            UPDATE payments
               SET status = 'completed',
                   mpesa_receipt = COALESCE(:receipt, mpesa_receipt),
                   completed_at = NOW(),
                   metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:meta AS jsonb)
             WHERE id = :id
            """
        ),
        {"id": payment_id, "receipt": payload.receipt, "meta": _json(metadata_patch)},
    )

    # Activate / extend the user's plan using calendar-accurate months.
    months = CYCLE_MONTHS.get(payment["billing_cycle"], 1)
    today = datetime.utcnow().date()
    expires_date = _add_months(today, months)
    expires_at = datetime.combine(expires_date, datetime.min.time())

    await sess.execute(
        text("UPDATE users SET plan = :plan, plan_expires = :exp WHERE id = :uid"),
        {"plan": payment["plan"], "exp": expires_at, "uid": payment["user_id"]},
    )

    # School-level subscription extends the whole school so members inherit access.
    if payment["plan"] == "school":
        await sess.execute(
            text(
                """
                UPDATE schools
                   SET plan = 'school', plan_expires = :exp
                 WHERE id = (SELECT school_id FROM users WHERE id = :uid)
                   AND school_id IS NOT NULL
                """
            ),
            {"exp": expires_at, "uid": payment["user_id"]},
        )

    if payment["invoice_id"]:
        await sess.execute(
            update(Invoice)
            .where(Invoice.id == payment["invoice_id"])
            .values(status="paid", paid_at=datetime.utcnow())
        )

    await sess.commit()

    # ─── CH6 Insurance-Agent Network commission credit ─────────────────────
    # If the buyer entered an agent referral code at checkout, credit the
    # 3-tier commission (agent 15% / manager 8% / network head 5%) plus the
    # GM rider (5%) against the actual amount paid. Failures here MUST NOT
    # roll back the payment — the subscription is already active. We log and
    # continue.
    agent_code = (payment.get("metadata") or {}).get("agent_referral_code") if isinstance(payment.get("metadata"), dict) else None
    if agent_code:
        try:
            paid_amount = Decimal(str(payload.amount)) if payload.amount is not None else Decimal(str(payment["amount"]))
            # Ordinal month of this subscriber's relationship with the network
            # (1 = first conversion), not the billing-cycle length.
            prior = (await sess.execute(
                text("SELECT COUNT(*) FROM conversions WHERE subscriber_id = :uid"),
                {"uid": str(payment["user_id"])},
            )).scalar() or 0
            credit_result = await credit_ch6_conversion(
                sess,
                agent_referral_code=agent_code,
                subscriber_id=str(payment["user_id"]),
                plan=payment["plan"],
                plan_price_kes=paid_amount,
                provider_txn_id=str(payload.receipt or payment["reference"] or payment_id),
                payment_provider="mpesa",
                subscription_month=prior + 1,
                is_first_conversion=(prior == 0),
            )
            await sess.commit()
        except Exception as exc:  # pragma: no cover — defensive; commission is best-effort
            await sess.rollback()
            credit_result = {"status": "error", "error": str(exc)}
    else:
        credit_result = None

    # Fetch user contact details for the notifications-service consumer.
    user_row = (
        await sess.execute(
            text("SELECT name, email, phone FROM users WHERE id = :uid"),
            {"uid": payment["user_id"]},
        )
    ).mappings().first()

    await event_bus.publish(
        "payment.completed",
        {
            "paymentId": str(payment_id),
            "user_id": str(payment["user_id"]),
            "name": user_row["name"] if user_row else None,
            "email": user_row["email"] if user_row else None,
            "phone": payload.phone or (user_row["phone"] if user_row else None),
            "plan": payment["plan"],
            "billing_cycle": payment["billing_cycle"],
            "amount": float(payload.amount) if payload.amount is not None else float(payment["amount"]),
            "currency": payment["currency"],
            "mpesa_receipt": payload.receipt,
            "reference": payment["reference"],
            "expires_at": expires_at.isoformat(),
        },
    )

    return {
        "ok": True,
        "paymentId": str(payment_id),
        "status": "completed",
        "plan": payment["plan"],
        "expires_at": expires_at.isoformat(),
        "agent_commission": credit_result,
    }


def _json(obj: dict[str, Any]) -> str:
    def _default(o):
        if isinstance(o, (uuid.UUID,)):
            return str(o)
        if isinstance(o, (datetime,)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        raise TypeError(f"Unserialisable type: {type(o).__name__}")

    return json.dumps(obj, ensure_ascii=False, default=_default)


# Convenience GET so ops can hit the URL in a browser to confirm reachability.
@router.get("/gateway")
async def gateway_notification_probe():
    return {
        "ok": True,
        "message": (
            "POST payment notifications here with an X-Signature header "
            "(HMAC-SHA256 of the raw body keyed with the gateway API secret)."
        ),
    }
