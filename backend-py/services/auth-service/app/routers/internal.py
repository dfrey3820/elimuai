"""Internal endpoint used by the nginx gateway's auth_request subrequest.

nginx calls GET /internal/verify with the caller's Authorization header. On
success this returns 200 and sets X-User-Id / X-User-Role response headers,
which nginx then forwards to downstream services. On failure it returns 401.

This endpoint is exposed at /api/auth/internal/verify by include_router but
nginx blocks that path publicly (see gateway/nginx.conf).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from elimu_common.auth import decode_jwt

from app.deps import get_session, settings
from app.models import User, UserSession

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/verify")
async def verify(request: Request, response: Response, session: AsyncSession = Depends(get_session)):
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")

    token = header.split(" ", 1)[1].strip()
    payload = decode_jwt(token, settings.jwt_secret)
    user_id = payload.get("userId") or payload.get("sub")
    jti = payload.get("jti")
    if not user_id:
        raise HTTPException(401, "Token missing subject")

    # Verify session is still active (matches Node middleware/auth.js)
    if jti:
        sess = await session.scalar(
            select(UserSession)
            .where(UserSession.token_jti == jti)
            .where(UserSession.is_revoked.is_(False))
            .where(UserSession.expires_at > datetime.utcnow())
        )
        if sess is None:
            raise HTTPException(401, "Session expired or revoked")

    user = await session.scalar(
        select(User.role).where(User.id == user_id).where(User.is_active.is_(True))
    )
    if user is None:
        raise HTTPException(401, "User not found or inactive")

    response.headers["X-User-Id"] = str(user_id)
    response.headers["X-User-Role"] = str(user)
    return {"ok": True}
