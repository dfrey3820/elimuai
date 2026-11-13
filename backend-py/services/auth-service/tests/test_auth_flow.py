"""DB integration tests for auth flow. Require a running Postgres with the
ElimuAI schema loaded (see backend/src/db/schema.sql).
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_recovery_response_does_not_disclose_unknown_accounts():
    from app.routers.auth import forgot_password
    from app.schemas import ForgotPasswordIn

    session = SimpleNamespace(scalar=AsyncMock(), execute=AsyncMock(), commit=AsyncMock())
    user = SimpleNamespace(id=uuid4(), email="recovery@example.com", password_hash="old-hash")
    session.scalar.side_effect = [user, None]
    with patch("app.routers.auth.send_otp", new_callable=AsyncMock) as send:
        registered = await forgot_password(ForgotPasswordIn(email=user.email), session, object())
        unknown = await forgot_password(ForgotPasswordIn(email="unknown@example.com"), session, object())
    assert registered == unknown
    assert registered["success"] is True
    send.assert_awaited_once()
    assert send.call_args.kwargs["purpose"] == "password_reset"
    assert send.call_args.kwargs["is_prod"] is True
    assert "dev_code" not in registered


@pytest.mark.asyncio
async def test_password_reset_consumes_code_and_revokes_sessions_atomically():
    from app.routers.auth import reset_password
    from app.schemas import ResetPasswordIn

    user = SimpleNamespace(id=uuid4(), password_hash="old-hash")
    otp = SimpleNamespace(code="123456", attempts=0, max_attempts=5, verified=False,
                          expires_at=datetime.utcnow() + timedelta(minutes=5))
    session = SimpleNamespace(scalar=AsyncMock(side_effect=[user, otp]), execute=AsyncMock(), commit=AsyncMock())
    with patch("app.routers.auth.hash_password", return_value="new-hash"):
        result = await reset_password(ResetPasswordIn(email="recovery@example.com", code="123456",
                                                     new_password="replacement-password"), session)
    assert result["success"] is True
    assert user.password_hash == "new-hash"
    assert otp.verified is True
    session.commit.assert_awaited_once()
    mutations = [str(call.args[0]) for call in session.execute.call_args_list]
    assert any("DELETE FROM refresh_tokens" in query for query in mutations)
    assert any("UPDATE user_sessions" in query for query in mutations)
    assert any("UPDATE otp_tokens" in query for query in mutations)
    for call in session.scalar.call_args_list:
        assert call.args[0]._for_update_arg is not None
    assert "password_reset" in session.scalar.call_args_list[1].args[0].compile().params.values()


@pytest.mark.asyncio
@pytest.mark.parametrize("code,attempts,minutes", [("654321", 0, 5), ("123456", 5, 5), ("123456", 0, -1)])
async def test_reset_rejects_wrong_expired_or_exhausted_codes(code, attempts, minutes):
    from app.routers.auth import reset_password
    from app.schemas import ResetPasswordIn

    user = SimpleNamespace(id=uuid4(), password_hash="unchanged")
    otp = SimpleNamespace(code=code, attempts=attempts, max_attempts=5, verified=False,
                          expires_at=datetime.utcnow() + timedelta(minutes=minutes))
    session = SimpleNamespace(scalar=AsyncMock(side_effect=[user, otp]), execute=AsyncMock(), commit=AsyncMock())
    with pytest.raises(HTTPException) as failure:
        await reset_password(ResetPasswordIn(email="recovery@example.com", code="123456",
                                             new_password="replacement-password"), session)
    assert failure.value.status_code == 400
    assert user.password_hash == "unchanged"
    session.execute.assert_not_awaited()


def test_reset_schema_rejects_invalid_codes_and_overlong_password_bytes():
    from app.schemas import ResetPasswordIn

    for code, password in [("abcdef", "valid-password"), ("\u0661\u0662\u0663\u0664\u0665\u0666", "valid-password"),
                           ("123456", "short"), ("123456", "\u00e9" * 40)]:
        with pytest.raises(ValidationError):
            ResetPasswordIn(email="recovery@example.com", code=code, new_password=password)


@pytest.mark.asyncio
async def test_auth_dependency_applies_monolith_session_revocation(monkeypatch):
    from fastapi import Request
    from elimu_common.auth import Principal, make_principal_dependency
    from app.security import generate_tokens

    monkeypatch.setenv("TRUST_GATEWAY_HEADERS", "false")
    secret = "test-secret-for-session-validation"
    user_id = uuid4()
    access, refresh, _ = generate_tokens(user_id, "student", secret=secret,
                                        access_ttl_min=5, refresh_ttl_min=10)
    validator = AsyncMock(side_effect=HTTPException(401, "Session expired or revoked"))
    application = SimpleNamespace(state=SimpleNamespace(validate_principal=validator))
    dependency = make_principal_dependency(secret)
    request = Request({"type": "http", "headers": [(b"authorization", f"Bearer {access}".encode())],
                       "query_string": b"", "app": application})
    with pytest.raises(HTTPException) as revoked:
        await dependency(request, None, None)
    assert revoked.value.status_code == 401
    validator.assert_awaited_once()
    validator.reset_mock()
    validator.side_effect = None
    validator.return_value = Principal(user_id=str(user_id), role="student", jti="active")
    assert (await dependency(request, None, None)).jti == "active"
    refresh_request = Request({"type": "http", "headers": [(b"authorization", f"Bearer {refresh}".encode())],
                               "query_string": b"", "app": application})
    validator.reset_mock()
    with pytest.raises(HTTPException) as invalid:
        await dependency(refresh_request, None, None)
    assert invalid.value.status_code == 401
    validator.assert_not_awaited()


@pytest.mark.integration
async def test_register_login_flow(client):
    email = "qa+intg@example.com"
    # Register
    r = await client.post(
        "/api/auth/register",
        json={
            "name": "Intg User",
            "email": email,
            "password": "correct-horse",
            "role": "student",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["otp_sent"] is True
    dev_code = body.get("dev_code")
    assert dev_code, "expected a dev_code in non-prod env"

    # Verify OTP
    r = await client.post(
        "/api/auth/verify-otp",
        json={"email": email, "code": dev_code, "purpose": "signup"},
    )
    assert r.status_code == 200, r.text
    tokens = r.json()
    assert "access_token" in tokens and "refresh_token" in tokens

    # /me
    r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == email


@pytest.mark.integration
async def test_admin_signup_requires_school_name(client):
    r = await client.post(
        "/api/auth/register",
        json={
            "name": "Admin",
            "email": "no-school@example.com",
            "password": "correct-horse",
            "role": "admin",
        },
    )
    assert r.status_code == 400
    assert "school_name" in r.json()["error"].lower()
