"""In-process event bus — drop-in for EventBus when Redis is unavailable.

Used on single-process deployments (cPanel/Passenger). `publish()` awaits the
registered handlers before returning: shared-hosting workers can be recycled
as soon as the response is sent, which silently kills fire-and-forget tasks
(lost OTP emails). Handler errors are logged, never raised to the caller.
"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

import structlog

log = structlog.get_logger(__name__)

Handler = Callable[[str, dict[str, Any]], Awaitable[None]]

_HANDLER_TIMEOUT_SECS = 20


class LocalEventBus:
    def __init__(self) -> None:
        self._handlers: list[Handler] = []

    def register(self, handler: Handler) -> None:
        self._handlers.append(handler)

    async def close(self) -> None:  # interface parity with EventBus
        return None

    async def publish(self, topic: str, payload: dict[str, Any]) -> str:
        for handler in self._handlers:
            await self._safe(handler, topic, payload)
        return topic

    @staticmethod
    async def _safe(handler: Handler, topic: str, payload: dict[str, Any]) -> None:
        try:
            await asyncio.wait_for(handler(topic, payload), timeout=_HANDLER_TIMEOUT_SECS)
        except Exception as exc:  # noqa: BLE001 — never let a handler kill the caller
            log.error("local_event.handler_failed", topic=topic, error=repr(exc))
