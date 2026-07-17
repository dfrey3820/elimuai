"""schools-service — school reads + onboarding (teachers, students, classes)."""
from __future__ import annotations

from elimu_common.app_factory import create_app
from elimu_common.events import EventBus

from .deps import settings
from .routers.onboarding import router as onboarding_router
from .routers.schools import router as schools_router


async def _on_startup(app):
    app.state.event_bus = EventBus(settings.redis_url)


async def _on_shutdown(app):
    bus = getattr(app.state, "event_bus", None)
    if bus:
        await bus.close()


app = create_app(
    settings,
    routers=[schools_router, onboarding_router],
    on_startup=_on_startup,
    on_shutdown=_on_shutdown,
)
