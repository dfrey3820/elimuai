"""learning-service — AI tutor, homework, progress, leaderboards."""
from __future__ import annotations

from elimu_common.app_factory import create_app

from .deps import settings
from .routers.ai import router as ai_router
from .routers.curriculum import router as curriculum_router
from .routers.exams import router as exams_router
from .routers.leaderboard import router as lb_router
from .routers.progress import router as progress_router


async def _on_startup(app):
    if settings.anthropic_api_key:
        try:
            from anthropic import Anthropic
            app.state.anthropic = Anthropic(api_key=settings.anthropic_api_key)
        except Exception:  # noqa: BLE001
            app.state.anthropic = None
    else:
        app.state.anthropic = None


async def _on_shutdown(app):
    app.state.anthropic = None


app = create_app(
    settings,
    routers=[ai_router, progress_router, lb_router, exams_router, curriculum_router],
    on_startup=_on_startup,
    on_shutdown=_on_shutdown,
)
