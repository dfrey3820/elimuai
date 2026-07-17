"""Pytest fixtures for auth-service.

The DB-dependent tests require a running Postgres with the ElimuAI schema
loaded. Use `docker compose up postgres` before `pytest`. Tests marked with
`pytest.mark.integration` are skipped when DATABASE_URL is unset.
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest


def pytest_collection_modifyitems(config, items):
    if os.environ.get("DATABASE_URL"):
        return
    skip = pytest.mark.skip(reason="DATABASE_URL not set — integration tests skipped")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)


# ─── Ensure env is set BEFORE app import ────────────────────────────────────
# The app reads settings at import time, so we set safe defaults here.
os.environ.setdefault("JWT_SECRET", "test_" + "x" * 40)
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://elimuai_user:elimuai_pass_dev@localhost:5432/elimuai_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")


@pytest.fixture
async def client() -> AsyncIterator:
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as ac:
        yield ac
