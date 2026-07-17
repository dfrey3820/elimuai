"""Lightweight Redis Streams event bus for cross-service pub/sub.

Used for internal fire-and-forget events like `user.registered`,
`payment.completed`, etc. Not used for the payment queue (that stays on BullMQ
to remain compatible with the Node mpesa-service).

Usage
-----

    bus = EventBus(redis_url)
    await bus.publish("user.registered", {"user_id": "abc", "email": "..."})

    async for event in bus.subscribe("notifications-service", "user.registered"):
        ...
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as aioredis


class EventBus:
    def __init__(self, redis_url: str, stream_prefix: str = "events") -> None:
        self._redis = aioredis.from_url(redis_url, decode_responses=True)
        self.prefix = stream_prefix

    async def close(self) -> None:
        await self._redis.aclose()

    def _stream(self, topic: str) -> str:
        return f"{self.prefix}:{topic}"

    async def publish(self, topic: str, payload: dict[str, Any]) -> str:
        stream_id = await self._redis.xadd(
            self._stream(topic),
            {"data": json.dumps(payload, ensure_ascii=False)},
            maxlen=10_000,
            approximate=True,
        )
        return stream_id

    async def subscribe(
        self,
        consumer_group: str,
        *topics: str,
        block_ms: int = 5000,
    ) -> AsyncIterator[tuple[str, dict[str, Any]]]:
        """Yields (topic, payload) tuples. Creates the consumer group lazily."""
        streams = {self._stream(t): ">" for t in topics}

        # Create groups if they don't exist (BUSYGROUP is fine to ignore)
        for stream in streams:
            try:
                await self._redis.xgroup_create(stream, consumer_group, id="$", mkstream=True)
            except aioredis.ResponseError as exc:
                if "BUSYGROUP" not in str(exc):
                    raise

        while True:
            try:
                resp = await self._redis.xreadgroup(
                    consumer_group,
                    consumer_group,  # consumer name = group name (single-consumer per group)
                    streams,
                    count=10,
                    block=block_ms,
                )
            except aioredis.TimeoutError:
                # Long-poll expired with no messages — just loop.
                continue
            if not resp:
                continue
            for stream_name, messages in resp:
                topic = stream_name.removeprefix(f"{self.prefix}:")
                for msg_id, fields in messages:
                    try:
                        payload = json.loads(fields.get("data", "null"))
                    except json.JSONDecodeError:
                        payload = None
                    yield topic, payload  # type: ignore[misc]
                    await self._redis.xack(stream_name, consumer_group, msg_id)
