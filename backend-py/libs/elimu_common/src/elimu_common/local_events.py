"""In-process event bus — drop-in for EventBus when Redis is unavailable.

Used on single-process deployments (cPanel/Passenger). `publish()` schedules
the registered handler on the running loop, fire-and-forget, mirroring the
semantics of the Redis Streams bus (at-most-once, no ordering guarantees
across processes — acceptable because there is only one process).
"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

import structlog

log = structlog.get_logger(__name__)

Handler = Callable[[str, dict[str, Any]], Awaitable[None]]


class LocalEventBus:
    def __init__(self) -> None:
        self._handlers: list[Handler] = []
        self._pending: set[asyncio.Task] = set()

    def register(self, handler: Handler) -> None:
        self._handlers.append(handler)

    async def close(self) -> None:  # interface parity with EventBus
        return None

    async def publish(self, topic: str, payload: dict[str, Any]) -> str:
        for handler in self._handlers:
            task = asyncio.create_task(self._safe(handler, topic, payload))
            # keep a reference so the task isn't GC'd mid-flight
            self._pending.add(task)
            task.add_done_callback(self._pending.discard)
        return topic

    @staticmethod
    async def _safe(handler: Handler, topic: str, payload: dict[str, Any]) -> None:
        try:
            await handler(topic, payload)
        except Exception as exc:  # noqa: BLE001 — never let a handler kill the caller
            log.error("local_event.handler_failed", topic=topic, error=str(exc))
