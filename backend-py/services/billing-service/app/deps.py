from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import make_principal_dependency, role_checker

from .settings import Settings

settings = Settings()  # type: ignore[call-arg]

get_principal = make_principal_dependency(settings.jwt_secret)
current_principal = Depends(get_principal)
AdminOnly = Depends(role_checker(get_principal, "admin", "super_admin"))


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async for sess in request.app.state.db.session():
        yield sess


def get_bullmq(request: Request):
    return request.app.state.bullmq


def get_event_bus(request: Request):
    return request.app.state.event_bus
