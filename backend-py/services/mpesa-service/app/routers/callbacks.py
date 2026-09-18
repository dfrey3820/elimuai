"""HTTP endpoints: Safaricom callbacks + admin config."""
from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Request

from elimu_common.hmac_util import sign

from . import mpesa_client
from .worker import _publish_result

log = structlog.get_logger(__name__)

router = APIRouter(tags=["mpesa"])


@router.post("/mpesa/callback")
async def stk_callback(request: Request):
    """Safaricom hits this after the customer approves/rejects the STK push."""
    payment_id = request.query_params.get("paymentId")
    body = await request.json()
    callback = ((body or {}).get("Body") or {}).get("stkCallback") or {}
    log.info("mpesa.callback.received", payment_id=payment_id, result_code=callback.get("ResultCode"))

    if not payment_id or not callback:
        # Still ACK to Safaricom so they don't retry.
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    settings = request.app.state.settings
    bullmq = request.app.state.bullmq
    hmac_secret = settings.queue_hmac_secret

    result_code = callback.get("ResultCode")
    result_desc = callback.get("ResultDesc")

    if result_code != 0:
        log.warning("mpesa.callback.failed", payment_id=payment_id, desc=result_desc)
        await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
            "paymentId": payment_id,
            "status": "failed",
            "error": result_desc or f"M-Pesa ResultCode {result_code}",
            "resultCode": result_code,
        })
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    items = ((callback.get("CallbackMetadata") or {}).get("Item") or [])
    meta = {i.get("Name"): i.get("Value") for i in items if isinstance(i, dict)}
    await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
        "paymentId": payment_id,
        "status": "completed",
        "receipt": meta.get("MpesaReceiptNumber"),
        "amount": meta.get("Amount"),
        "phone": str(meta.get("PhoneNumber") or ""),
    })
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/stk/query")
async def stk_query(request: Request):
    body = await request.json()
    checkout_request_id = body.get("checkoutRequestId")
    if not checkout_request_id:
        raise HTTPException(400, "checkoutRequestId is required")
    settings = request.app.state.settings
    cfg = await mpesa_client.get_config(request.app.state.redis, {
        "environment": settings.mpesa_environment,
        "consumerKey": settings.mpesa_consumer_key,
        "consumerSecret": settings.mpesa_consumer_secret,
        "shortcode": settings.mpesa_shortcode,
        "passkey": settings.mpesa_passkey,
        "callbackBaseUrl": settings.mpesa_callback_base_url,
    })
    if not cfg["consumerKey"]:
        raise HTTPException(503, "M-Pesa credentials not configured")
    try:
        data = await mpesa_client.stk_query(cfg, checkout_request_id)
    except Exception as exc:  # noqa: BLE001
        log.error("mpesa.stk_query.error", error=str(exc))
        raise HTTPException(502, "Failed to query M-Pesa") from exc
    return {"success": True, **data}


@router.post("/c2b/confirmation")
async def c2b_confirmation(request: Request):
    body = await request.json()
    log.info("mpesa.c2b.confirmation", trans_id=body.get("TransID"))
    settings = request.app.state.settings
    await _publish_result(
        request.app.state.bullmq, settings.result_queue_name, settings.queue_hmac_secret,
        {
            "paymentId": body.get("BillRefNumber") or body.get("TransID"),
            "status": "c2b_confirmed",
            "receipt": body.get("TransID"),
            "amount": body.get("TransAmount"),
            "phone": body.get("MSISDN"),
            "c2bData": body,
        },
    )
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@router.post("/c2b/validation")
async def c2b_validation(request: Request):
    body = await request.json()
    log.info("mpesa.c2b.validation", body=body)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


# ─── Admin (config read/update) — auth is handled by upstream gateway ────────
@router.get("/admin/config")
async def admin_get_config(request: Request):
    settings = request.app.state.settings
    cfg = await mpesa_client.get_config(request.app.state.redis, {
        "environment": settings.mpesa_environment,
        "consumerKey": settings.mpesa_consumer_key,
        "consumerSecret": settings.mpesa_consumer_secret,
        "shortcode": settings.mpesa_shortcode,
        "passkey": settings.mpesa_passkey,
        "callbackBaseUrl": settings.mpesa_callback_base_url,
    })
    return {
        "environment": cfg["environment"],
        "shortcode": cfg["shortcode"],
        "callbackBaseUrl": cfg["callbackBaseUrl"],
        "hasConsumerKey": bool(cfg["consumerKey"]),
        "hasConsumerSecret": bool(cfg["consumerSecret"]),
        "hasPasskey": bool(cfg["passkey"]),
    }


@router.put("/admin/config")
async def admin_set_config(request: Request):
    body = await request.json()
    settings = request.app.state.settings
    current = await mpesa_client.get_config(request.app.state.redis, {
        "environment": settings.mpesa_environment,
        "consumerKey": settings.mpesa_consumer_key,
        "consumerSecret": settings.mpesa_consumer_secret,
        "shortcode": settings.mpesa_shortcode,
        "passkey": settings.mpesa_passkey,
        "callbackBaseUrl": settings.mpesa_callback_base_url,
    })
    await mpesa_client.set_config(request.app.state.redis, body or {}, current)
    return {"success": True}
