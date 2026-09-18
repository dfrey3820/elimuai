"""Payment reconciliation against the external payment gateway (venus).

Two entry points:

* :func:`reconcile_payment` — reconcile a single payment row. Used by the
  admin ``POST /api/payments/admin/{payment_id}/reconcile`` endpoint.
* :func:`loop` — background task that periodically sweeps ``pending`` rows
  that are old enough to be safely queried at the gateway, and applies the
  gateway's authoritative status via :func:`reconcile_payment`.

Both paths funnel through :func:`~app.routers.webhook.finalise_payment` so
the state transition logic (plan activation, invoice update, event bus
publish, CH6 commission) matches the inbound webhook exactly.
"""
from __future__ import annotations

import asyncio
from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .gateway_client import PaymentGatewayClient, PaymentGatewayError
from .routers.webhook import GatewayNotification, _normalise_payload, finalise_payment
from .settings import Settings

log = structlog.get_logger(__name__)


def _build_client(settings: Settings) -> PaymentGatewayClient | None:
    if not (settings.payment_gateway_url and settings.payment_gateway_api_key and settings.payment_gateway_api_secret):
        return None
    return PaymentGatewayClient(
        settings.payment_gateway_url,
        settings.payment_gateway_api_key,
        settings.payment_gateway_api_secret,
    )


def _extract_gateway_txn_id(payment: dict[str, Any]) -> str | None:
    """Return the id we need to hand back to venus to look this transaction up."""
    handle = payment.get("mpesa_checkout_id")
    if handle:
        return str(handle)
    # Fall back to a checkout id we may have stashed on metadata.
    md = payment.get("metadata") or {}
    if isinstance(md, dict):
        return md.get("gateway_txn_id") or md.get("checkoutRequestId") or md.get("CheckoutRequestID")
    return None


async def reconcile_payment(
    sess: AsyncSession,
    event_bus,
    client: PaymentGatewayClient,
    payment: dict[str, Any],
) -> dict[str, Any]:
    """Query venus for the current state of ``payment`` and apply it locally.

    Returns a dict that matches the webhook response shape, plus a
    ``reconciled`` flag so callers can tell whether we actually did anything.
    """
    payment_id = payment["id"]

    if payment["status"] in ("completed", "failed", "refunded"):
        return {
            "ok": True,
            "already_processed": True,
            "paymentId": str(payment_id),
            "status": payment["status"],
            "reconciled": False,
        }

    txn_id = _extract_gateway_txn_id(payment)
    if not txn_id:
        return {
            "ok": False,
            "paymentId": str(payment_id),
            "status": payment["status"],
            "reconciled": False,
            "reason": "no_gateway_txn_id",
        }

    try:
        gw_response = await client.get_transaction(txn_id)
    except PaymentGatewayError as exc:
        log.warning(
            "reconciler.query_failed",
            payment_id=str(payment_id),
            txn_id=txn_id,
            status_code=exc.status_code,
            error=str(exc),
        )
        # A 404 from venus means the transaction was never created (or was
        # garbage-collected). Fail the payment so the user can retry.
        if exc.status_code == 404:
            payload = GatewayNotification(
                paymentId=payment_id,
                status="failed",
                error="gateway_transaction_not_found",
                extra={"gateway_txn_id": txn_id},
            )
            result = await finalise_payment(sess, event_bus, payment, payload)
            return {**result, "reconciled": True}
        return {
            "ok": False,
            "paymentId": str(payment_id),
            "status": payment["status"],
            "reconciled": False,
            "reason": "gateway_unreachable",
            "error": str(exc),
        }

    # Venus wraps its transaction status responses in the same envelope shape
    # as the webhook payload — reuse the normaliser so we don't drift.
    payload = _normalise_payload(gw_response)
    if not payload.status:
        log.info(
            "reconciler.pending",
            payment_id=str(payment_id),
            txn_id=txn_id,
            gateway_response_keys=list(gw_response.keys()) if isinstance(gw_response, dict) else None,
        )
        return {
            "ok": True,
            "paymentId": str(payment_id),
            "status": payment["status"],
            "reconciled": False,
            "reason": "still_pending_at_gateway",
        }

    # Preserve the paymentId so finalise_payment doesn't need reference lookup.
    payload.paymentId = payment_id
    log.info(
        "reconciler.finalising",
        payment_id=str(payment_id),
        txn_id=txn_id,
        gateway_status=payload.status,
    )
    result = await finalise_payment(sess, event_bus, payment, payload)
    return {**result, "reconciled": True}


_PENDING_SQL = text(
    """
    SELECT *
    FROM payments
    WHERE status = 'pending'
      AND method = 'mpesa'
      AND created_at < NOW() - make_interval(secs => :min_age_seconds)
      AND created_at > NOW() - make_interval(secs => :max_age_seconds)
      AND (mpesa_checkout_id IS NOT NULL OR metadata ? 'gateway_txn_id')
    ORDER BY created_at ASC
    LIMIT :batch_size
    """
)


async def run_once(app) -> dict[str, int]:
    """Sweep pending payments once. Returns per-outcome counters."""
    settings: Settings = app.state.settings
    client = _build_client(settings)
    counts = {"scanned": 0, "reconciled": 0, "still_pending": 0, "errors": 0}
    if client is None:
        return counts

    event_bus = app.state.event_bus
    async for sess in app.state.db.session():
        rows = (await sess.execute(
            _PENDING_SQL,
            {
                "min_age_seconds": settings.reconciler_min_age_seconds,
                "max_age_seconds": settings.reconciler_max_age_seconds,
                "batch_size": settings.reconciler_batch_size,
            },
        )).mappings().all()
        counts["scanned"] = len(rows)
        for row in rows:
            try:
                result = await reconcile_payment(sess, event_bus, client, dict(row))
                if result.get("reconciled"):
                    counts["reconciled"] += 1
                else:
                    counts["still_pending"] += 1
            except Exception as exc:  # noqa: BLE001
                counts["errors"] += 1
                log.error(
                    "reconciler.row_failed",
                    payment_id=str(row.get("id")),
                    error=str(exc),
                )
                await sess.rollback()

    if counts["scanned"]:
        log.info("reconciler.swept", **counts)
    return counts


async def loop(app) -> None:
    settings: Settings = app.state.settings
    if not settings.reconciler_enabled:
        log.info("reconciler.disabled")
        return
    await asyncio.sleep(max(1, settings.reconciler_startup_delay_seconds))
    log.info(
        "reconciler.loop.start",
        interval_seconds=settings.reconciler_interval_seconds,
        min_age_seconds=settings.reconciler_min_age_seconds,
        max_age_seconds=settings.reconciler_max_age_seconds,
        batch_size=settings.reconciler_batch_size,
    )
    while True:
        try:
            await run_once(app)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.error("reconciler.sweep_failed", error=str(exc))
        await asyncio.sleep(max(10, settings.reconciler_interval_seconds))
