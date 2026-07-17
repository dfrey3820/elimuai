"""JWT and role helpers.

Every service can:
  1. Verify a JWT in the Authorization header directly (defensive), OR
  2. Trust the X-User-Id / X-User-Role headers injected by the nginx gateway
     after it validated the JWT via auth-service `/internal/verify`.

`get_current_principal` prefers (2) when trusted headers are present and (1) as
fallback. When called from tests without a gateway, (1) is used.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Depends, Header, HTTPException, Request, status
from jose import ExpiredSignatureError, JWTError, jwt

ROLE_HIERARCHY: dict[str, int] = {
    "student": 0,
    "parent": 1,
    "marketing_agent": 1,
    "teacher": 2,
    "admin": 3,
    "super_admin": 4,
}


@dataclass(frozen=True)
class Principal:
    user_id: str
    role: str | None = None
    jti: str | None = None

    def has_role(self, *required: str) -> bool:
        if not self.role:
            return False
        needed = min(ROLE_HIERARCHY.get(r, 99) for r in required)
        have = ROLE_HIERARCHY.get(self.role, -1)
        return have >= needed


def decode_jwt(token: str, secret: str) -> dict[str, Any]:
    """Raises HTTPException(401) on any failure."""
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired") from exc
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc


def _extract_bearer(request: Request) -> str | None:
    header = request.headers.get("authorization")
    if header and header.lower().startswith("bearer "):
        return header.split(" ", 1)[1].strip()
    # PDF downloads etc. may pass ?token=
    return request.query_params.get("token")


def make_principal_dependency(secret: str):
    """Factory: returns a FastAPI dependency that produces a Principal."""

    async def get_principal(
        request: Request,
        x_user_id: str | None = Header(default=None),
        x_user_role: str | None = Header(default=None),
    ) -> Principal:
        # Trust gateway-injected headers when present.
        if x_user_id:
            return Principal(user_id=x_user_id, role=x_user_role)

        # Fallback: verify JWT ourselves.
        token = _extract_bearer(request)
        if not token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No token provided")
        payload = decode_jwt(token, secret)
        user_id = payload.get("userId") or payload.get("sub")
        if not user_id:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing user id")
        return Principal(user_id=str(user_id), role=payload.get("role"), jti=payload.get("jti"))

    return get_principal


def require_role(*roles: str):
    """Dependency factory. Usage: `dependencies=[Depends(require_role('admin'))]`."""

    def _checker(principal: Principal = Depends(lambda: None)) -> Principal:  # placeholder
        raise RuntimeError(
            "require_role must be wired with the service's principal dependency; "
            "use elimu_common.auth.role_checker(get_principal, ...) instead."
        )

    return _checker


def role_checker(principal_dep, *roles: str):
    """Wire the role check onto a service's principal dependency.

    Example:
        get_principal = make_principal_dependency(settings.jwt_secret)
        AdminOnly = Depends(role_checker(get_principal, 'admin', 'super_admin'))
    """
    async def _check(principal: Principal = Depends(principal_dep)) -> Principal:
        if not principal.has_role(*roles):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return principal

    return _check
