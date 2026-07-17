"""DB integration tests for auth flow. Require a running Postgres with the
ElimuAI schema loaded (see backend/src/db/schema.sql).
"""
from __future__ import annotations

import pytest


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
