"""BullMQ worker: consume ``mpesa-payments`` → send STK → publish result."""
from __future__ import annotations

import asyncio
from urllib.parse import quote

import structlog
from elimu_common.bullmq import BullMQClient
from elimu_common.hmac_util import sign, verify

from . import mpesa_client

log = structlog.get_logger(__name__)


async def _publish_result(bullmq: BullMQClient, queue_name: str, hmac_secret: str, result: dict) -> None:
    """Publish an HMAC-signed result so billing-service can trust it."""
    payload = sign(result, hmac_secret) if hmac_secret else {"payload": result}
    await bullmq.enqueue(queue_name, f"result:{result.get('paymentId', 'unknown')}", payload)
    log.info("mpesa.result.published", payment_id=result.get("paymentId"), status=result.get("status"))


async def _process_job(app, job_id: str, data) -> None:
    """Handle one STK-push job from the queue."""
    settings = app.state.settings
    bullmq: BullMQClient = app.state.bullmq
    seen_nonces: set[str] = app.state.seen_nonces
    hmac_secret = settings.queue_hmac_secret

    # ── Verify signed payload (if secret configured) ─────────────────────
    if hmac_secret and isinstance(data, dict) and "signature" in data:
        ok, payload, err = verify(data, hmac_secret, seen_nonces)
        if not ok:
            log.error("mpesa.job.hmac_invalid", job_id=job_id, error=err)
            await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
                "paymentId": (data.get("payload") or {}).get("paymentId", "unknown"),
                "status": "failed",
                "error": f"Security verification failed: {err}",
            })
            return
    else:
        payload = data.get("payload") if isinstance(data, dict) and "payload" in data else data

    if not isinstance(payload, dict):
        log.error("mpesa.job.malformed", job_id=job_id)
        return

    payment_id = payload.get("paymentId") or payload.get("payment_id") or "unknown"
    phone = payload.get("phone")
    amount = payload.get("amount")
    account_reference = payload.get("accountReference") or payload.get("account_reference") or payment_id
    transaction_desc = payload.get("transactionDesc") or payload.get("transaction_desc") or "ElimuAI Payment"

    log.info("mpesa.job.received", payment_id=payment_id, phone=phone, amount=amount)

    try:
        cfg = await mpesa_client.get_config(app.state.redis, {
            "environment": settings.mpesa_environment,
            "consumerKey": settings.mpesa_consumer_key,
            "consumerSecret": settings.mpesa_consumer_secret,
            "shortcode": settings.mpesa_shortcode,
            "passkey": settings.mpesa_passkey,
            "callbackBaseUrl": settings.mpesa_callback_base_url,
        })
        if not (cfg["consumerKey"] and cfg["consumerSecret"] and cfg["shortcode"] and cfg["passkey"]):
            raise RuntimeError("M-Pesa credentials not configured")
        callback_url = f"{cfg['callbackBaseUrl']}/mpesa/callback?paymentId={quote(str(payment_id))}"
        resp = await mpesa_client.stk_push(
            cfg,
            phone=str(phone),
            amount=float(amount),
            account_reference=str(account_reference),
            transaction_desc=str(transaction_desc),
            callback_url=callback_url,
        )
        if resp.get("ResponseCode") == "0":
            await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
                "paymentId": payment_id,
                "status": "stk_sent",
                "checkoutRequestId": resp.get("CheckoutRequestID"),
                "merchantRequestId": resp.get("MerchantRequestID"),
            })
        else:
            await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
                "paymentId": payment_id,
                "status": "failed",
                "error": resp.get("ResponseDescription") or "STK Push rejected by Safaricom",
                "responseCode": resp.get("ResponseCode"),
            })
    except Exception as exc:  # noqa: BLE001
        log.error("mpesa.job.error", payment_id=payment_id, error=str(exc))
        await _publish_result(bullmq, settings.result_queue_name, hmac_secret, {
            "paymentId": payment_id,
            "status": "failed",
            "error": str(exc),
        })


async def run_worker(app) -> None:
    """Long-running consumer loop."""
    settings = app.state.settings
    bullmq: BullMQClient = app.state.bullmq

    async def handler(job_id: str, data) -> None:
        await _process_job(app, job_id, data)

    log.info("mpesa.worker.starting", queue=settings.payment_queue_name)
    while True:
        try:
            await bullmq.consume(
                settings.payment_queue_name,
                handler,
                concurrency=settings.queue_concurrency,
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.error("mpesa.worker.crashed_restarting", error=str(exc))
            await asyncio.sleep(3)
