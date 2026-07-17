"""Password hashing + JWT issuance helpers for auth-service."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import jwt

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _now() -> datetime:
    return datetime.utcnow()


def generate_tokens(
    user_id: UUID | str,
    role: str | None,
    *,
    secret: str,
    access_ttl_min: int,
    refresh_ttl_min: int,
) -> tuple[str, str, str]:
    """Returns (access_token, refresh_token, jti)."""
    jti = secrets.token_hex(24)
    uid = str(user_id)
    now = _now()

    access_payload = {
        "userId": uid,
        "sub": uid,
        "role": role,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=access_ttl_min)).timestamp()),
    }
    refresh_payload = {
        "userId": uid,
        "sub": uid,
        "jti": jti,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=refresh_ttl_min)).timestamp()),
    }
    access = jwt.encode(access_payload, secret, algorithm=ALGORITHM)
    refresh = jwt.encode(refresh_payload, secret, algorithm=ALGORITHM)
    return access, refresh, jti
