"""FastAPI dependencies wired to the auth-service settings + DB."""
from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import Principal, make_principal_dependency
from elimu_common.config import get_settings
from elimu_common.events import EventBus

from app.settings import Settings

settings: Settings = get_settings(Settings)  # type: ignore[arg-type]

get_principal = make_principal_dependency(settings.jwt_secret)


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async for sess in request.app.state.db.session():
        yield sess


async def get_event_bus(request: Request) -> EventBus | None:
    return getattr(request.app.state, "event_bus", None)


async def current_principal(principal: Principal = Depends(get_principal)) -> Principal:
    return principal
