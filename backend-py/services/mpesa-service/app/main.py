"""mpesa-service entrypoint."""
from __future__ import annotations

import asyncio
import contextlib

import redis.asyncio as aioredis
from elimu_common.app_factory import create_app
from elimu_common.bullmq import BullMQClient

from .routers.callbacks import router as callbacks_router
from .settings import Settings
from .worker import run_worker

settings = Settings()  # type: ignore[call-arg]


async def _on_startup(app):
    app.state.settings = settings
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    app.state.bullmq = BullMQClient(settings.redis_url)
    app.state.seen_nonces = set()
    app.state.worker_task = asyncio.create_task(run_worker(app))


async def _on_shutdown(app):
    task = getattr(app.state, "worker_task", None)
    if task and not task.done():
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
    client = getattr(app.state, "bullmq", None)
    if client:
        await client.close()
    redis = getattr(app.state, "redis", None)
    if redis:
        await redis.aclose()


app = create_app(
    settings,
    routers=[callbacks_router],
    on_startup=_on_startup,
    on_shutdown=_on_shutdown,
)
