"""Helpers shared by onboarding routes."""
from __future__ import annotations

import secrets
import string

import bcrypt


def gen_temp_password(n: int = 8) -> str:
    # Match Node's generator: mixed-case letters + digits, exclude ambiguous chars
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(n))


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()
