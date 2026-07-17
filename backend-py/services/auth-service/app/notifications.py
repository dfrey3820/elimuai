"""notifications dispatcher stub. Publishes to events bus so
notifications-service can consume. In dev without SMTP, this simply logs.
"""
from __future__ import annotations

from typing import Any

import structlog

from elimu_common.events import EventBus

log = structlog.get_logger(__name__)


async def send_otp_email(bus: EventBus | None, email: str, code: str, purpose: str) -> bool:
    """Publish an otp.requested event; return True to indicate accepted for delivery.

    Real email dispatch happens in notifications-service which subscribes to
    the same topic. If the bus is None (e.g. in tests), we log the code and
    return True.
    """
    payload: dict[str, Any] = {"email": email, "code": code, "purpose": purpose}
    if bus is None:
        log.info("otp.emit_stub", **payload)
        return True
    try:
        await bus.publish("otp.requested", payload)
        return True
    except Exception as exc:  # noqa: BLE001
        log.error("otp.publish_failed", error=str(exc), email=email)
        return False


async def emit_user_registered(bus: EventBus | None, *, user_id: str, email: str, role: str) -> None:
    if bus is None:
        return
    await bus.publish("user.registered", {"user_id": user_id, "email": email, "role": role})
