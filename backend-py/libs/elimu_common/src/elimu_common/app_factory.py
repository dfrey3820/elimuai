"""Shared FastAPI app factory used by every service skeleton.

Services build on top of this by:
    from elimu_common.app_factory import create_app
    app = create_app(settings, routers=[my_router])
"""
from __future__ import annotations

from collections.abc import Iterable
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from elimu_common.config import BaseServiceSettings
from elimu_common.db import DB
from elimu_common.errors import register_exception_handlers
from elimu_common.logger import configure_logging


def create_app(
    settings: BaseServiceSettings,
    *,
    routers: Iterable[APIRouter] = (),
    on_startup=None,
    on_shutdown=None,
) -> FastAPI:
    logger = configure_logging(settings.service_name, settings.log_level)
    db = DB(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.db = db
        app.state.logger = logger
        app.state.settings = settings
        logger.info("service.startup", port=settings.port)
        if on_startup is not None:
            await on_startup(app)
        try:
            yield
        finally:
            if on_shutdown is not None:
                await on_shutdown(app)
            await db.dispose()
            logger.info("service.shutdown")

    app = FastAPI(
        title=settings.service_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    register_exception_handlers(app, is_prod=(settings.env == "production"))

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": settings.service_name} | await db.healthcheck()

    for router in routers:
        app.include_router(router)

    return app
