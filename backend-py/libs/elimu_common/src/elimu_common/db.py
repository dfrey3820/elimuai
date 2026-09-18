"""Async SQLAlchemy engine + session helpers."""
from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Common declarative base; each service subclasses per-schema in its own module."""


class DB:
    """Holds the engine + sessionmaker for a service. Instantiate once per app."""

    def __init__(self, database_url: str, echo: bool = False) -> None:
        # Sized so 6 services x N tasks stay under RDS max_connections
        # (~112 on db.t4g.micro): 6 x (4+4) = 48 per task.
        self.engine: AsyncEngine = create_async_engine(
            database_url,
            echo=echo,
            pool_size=int(os.getenv("DB_POOL_SIZE", "4")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "4")),
            pool_timeout=30,
            pool_pre_ping=True,
            pool_recycle=1800,
        )
        self.sessionmaker = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )

    async def dispose(self) -> None:
        await self.engine.dispose()

    async def session(self) -> AsyncIterator[AsyncSession]:
        """FastAPI dependency. Yields a session and rolls back on error."""
        async with self.sessionmaker() as sess:
            try:
                yield sess
            except Exception:
                await sess.rollback()
                raise

    async def healthcheck(self) -> dict[str, Any]:
        from sqlalchemy import text

        try:
            async with self.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return {"database": "ok"}
        except Exception as exc:  # noqa: BLE001
            return {"database": "down", "error": str(exc)}
