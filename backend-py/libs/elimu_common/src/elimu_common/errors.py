"""Common error handlers registered on the FastAPI app."""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


def register_exception_handlers(app: FastAPI, *, is_prod: bool) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation failed", "details": exc.errors()},
        )

    @app.exception_handler(IntegrityError)
    async def _integrity(request: Request, exc: IntegrityError):
        msg = str(exc.orig) if not is_prod else "Conflict"
        return JSONResponse(status_code=409, content={"error": msg})

    @app.exception_handler(Exception)
    async def _fallback(request: Request, exc: Exception):
        # Avoid leaking internal errors in production.
        msg = "Internal server error" if is_prod else f"{type(exc).__name__}: {exc}"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": msg},
        )
