"""billing-service — subscription info, M-Pesa initiation, invoices, coupons."""
from __future__ import annotations

import asyncio
import contextlib

from elimu_common.app_factory import create_app
from elimu_common.bullmq import BullMQClient
from elimu_common.events import EventBus

from .deps import settings
from .reconciler import loop as reconciler_loop
from .routers.agents import router as agents_router
from .routers.billing import coupons_router, router
from .routers.renew import router as renew_router
from .routers.webhook import router as webhook_router
from .scheduler import loop as reminders_loop


async def _on_startup(app):
    app.state.bullmq = BullMQClient(settings.redis_url)
    app.state.event_bus = EventBus(settings.redis_url)
    app.state.reminders_task = asyncio.create_task(reminders_loop(app))
    app.state.reconciler_task = asyncio.create_task(reconciler_loop(app))


async def _on_shutdown(app):
    for attr in ("reminders_task", "reconciler_task"):
        task = getattr(app.state, attr, None)
        if task and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
    bus = getattr(app.state, "event_bus", None)
    if bus:
        await bus.close()
    client = getattr(app.state, "bullmq", None)
    if client:
        await client.close()


app = create_app(
    settings,
    routers=[router, coupons_router, agents_router, webhook_router, renew_router],
    on_startup=_on_startup,
    on_shutdown=_on_shutdown,
)
