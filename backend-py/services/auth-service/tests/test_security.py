"""Pure-unit tests that don't need a DB."""
from __future__ import annotations

from jose import jwt

from app.security import generate_tokens, hash_password, verify_password


def test_hash_and_verify_password():
    h = hash_password("s3cret-pw")
    assert verify_password("s3cret-pw", h)
    assert not verify_password("wrong", h)


def test_generate_tokens_shape():
    access, refresh, jti = generate_tokens(
        "11111111-1111-1111-1111-111111111111",
        role="teacher",
        secret="a" * 40,
        access_ttl_min=60,
        refresh_ttl_min=1440,
    )
    payload = jwt.decode(access, "a" * 40, algorithms=["HS256"])
    assert payload["userId"] == "11111111-1111-1111-1111-111111111111"
    assert payload["jti"] == jti
    assert payload["role"] == "teacher"
    payload_r = jwt.decode(refresh, "a" * 40, algorithms=["HS256"])
    assert payload_r["type"] == "refresh"
    assert payload_r["jti"] == jti
