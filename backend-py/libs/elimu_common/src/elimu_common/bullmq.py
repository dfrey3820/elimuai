"""Minimal BullMQ v5 producer/consumer, compatible with the Node mpesa-service.

Only the subset needed for the payment queue is implemented:

  * `enqueue(queue, name, data, opts)` — writes to `bull:<queue>:*` keys so
    Node BullMQ Workers pick it up.
  * `consume(queue, handler)` — polls `bull:<queue>:wait` list and processes
    jobs. Not a full featured worker (no priorities, no delayed jobs).

The data field is JSON-serialised. When paired with `hmac_util.sign()` you get
the same wire format the current [paymentQueue.js](../../../backend/src/services/paymentQueue.js)
uses.

Refs: https://docs.bullmq.io/guide/architecture
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import redis.asyncio as aioredis
import structlog

log = structlog.get_logger(__name__)


class BullMQClient:
    """Very small BullMQ v5 shim. Do NOT use for arbitrary BullMQ features."""

    def __init__(self, redis_url: str, prefix: str = "bull") -> None:
        self._redis = aioredis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix

    async def close(self) -> None:
        await self._redis.aclose()

    # ─── Producer ───────────────────────────────────────────────────────────
    async def enqueue(
        self,
        queue: str,
        name: str,
        data: Any,
        *,
        attempts: int = 1,
        remove_on_complete: int = 100,
        remove_on_fail: int = 200,
    ) -> str:
        """Add a job and return its id. Matches BullMQ v5's `Queue.add()` shape."""
        job_id = str(uuid.uuid4())
        key = f"{self.prefix}:{queue}"
        now_ms = int(time.time() * 1000)

        job_hash = {
            "name": name,
            "data": json.dumps(data, ensure_ascii=False),
            "opts": json.dumps(
                {
                    "attempts": attempts,
                    "removeOnComplete": remove_on_complete,
                    "removeOnFail": remove_on_fail,
                }
            ),
            "timestamp": str(now_ms),
            "delay": "0",
            "priority": "0",
            "attemptsMade": "0",
        }

        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.hset(f"{key}:{job_id}", mapping=job_hash)
            pipe.lpush(f"{key}:wait", job_id)
            pipe.publish(f"{key}:added", job_id)
            await pipe.execute()

        log.info("bullmq.enqueue", queue=queue, job_id=job_id, name=name)
        return job_id

    # ─── Consumer ───────────────────────────────────────────────────────────
    async def consume(
        self,
        queue: str,
        handler: Callable[[str, Any], Awaitable[None]],
        *,
        concurrency: int = 5,
        poll_interval: float = 1.0,
    ) -> None:
        """Blocking loop that pulls jobs from `bull:<queue>:wait` and runs handler.

        Runs `concurrency` workers in parallel. Cancel the outer task to stop.
        """
        key = f"{self.prefix}:{queue}"
        sem = asyncio.Semaphore(concurrency)

        async def _process_one(job_id: str) -> None:
            async with sem:
                raw = await self._redis.hgetall(f"{key}:{job_id}")
                if not raw:
                    log.warning("bullmq.job_missing", queue=queue, job_id=job_id)
                    return
                try:
                    data = json.loads(raw.get("data", "null"))
                    await handler(job_id, data)
                    await self._redis.lpush(f"{key}:completed", job_id)
                except Exception as exc:  # noqa: BLE001
                    log.error("bullmq.handler_error", queue=queue, job_id=job_id, error=str(exc))
                    await self._redis.lpush(f"{key}:failed", job_id)

        log.info("bullmq.consumer_started", queue=queue, concurrency=concurrency)
        while True:
            popped = await self._redis.brpop(f"{key}:wait", timeout=int(poll_interval))
            if popped is None:
                continue
            _, job_id = popped
            # Fire and forget; the semaphore caps concurrency.
            asyncio.create_task(_process_one(job_id))
