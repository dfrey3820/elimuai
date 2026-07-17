"""Shared httpx AsyncClient for service-to-service calls."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

import httpx


class ServiceClient:
    """Thin wrapper around httpx.AsyncClient that forwards the caller's
    X-User-Id / X-User-Role headers to preserve identity across hops.
    """

    def __init__(self, base_url: str, *, timeout: float = 10.0) -> None:
        self._client = httpx.AsyncClient(base_url=base_url, timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    async def get(self, path: str, *, principal: Any = None, **kwargs: Any) -> httpx.Response:
        return await self._client.get(path, headers=self._auth_headers(principal), **kwargs)

    async def post(self, path: str, *, principal: Any = None, **kwargs: Any) -> httpx.Response:
        return await self._client.post(path, headers=self._auth_headers(principal), **kwargs)

    def _auth_headers(self, principal: Any) -> dict[str, str]:
        if principal is None:
            return {}
        headers = {"X-User-Id": principal.user_id}
        if getattr(principal, "role", None):
            headers["X-User-Role"] = principal.role
        return headers


@asynccontextmanager
async def service_client(base_url: str):
    client = ServiceClient(base_url)
    try:
        yield client
    finally:
        await client.close()
