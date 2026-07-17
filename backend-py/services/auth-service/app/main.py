"""auth-service entry point."""
from __future__ import annotations

from fastapi import FastAPI

from elimu_common.app_factory import create_app
from elimu_common.events import EventBus

from app.deps import settings
from app.routers.auth import router as auth_router
from app.routers.internal import router as internal_router


async def _startup(app: FastAPI) -> None:
    app.state.event_bus = EventBus(settings.redis_url)


async def _shutdown(app: FastAPI) -> None:
    bus = getattr(app.state, "event_bus", None)
    if bus is not None:
        await bus.close()


app = create_app(
    settings,
    routers=[auth_router, internal_router],
    on_startup=_startup,
    on_shutdown=_shutdown,
)
