"""HMAC signing/verification compatible with backend/src/services/hmac.js.

Wire format (JSON):
    {
      "payload": <arbitrary JSON>,
      "timestamp": <ms since epoch>,
      "nonce": <32-char hex>,
      "signature": <sha256 hex hmac over JSON.stringify({payload, timestamp, nonce})>
    }

Signature is computed over the canonical JSON string produced by JavaScript's
JSON.stringify with keys in insertion order (payload, timestamp, nonce).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from typing import Any

MAX_AGE_MS = 5 * 60 * 1000


def _canonical(payload: Any, timestamp: int, nonce: str) -> bytes:
    # Matches JSON.stringify({payload, timestamp, nonce}) — insertion order,
    # no spaces, unicode as-is.
    return json.dumps(
        {"payload": payload, "timestamp": timestamp, "nonce": nonce},
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def sign(payload: Any, secret: str) -> dict[str, Any]:
    timestamp = int(time.time() * 1000)
    nonce = secrets.token_hex(16)
    data = _canonical(payload, timestamp, nonce)
    signature = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()
    return {
        "payload": payload,
        "timestamp": timestamp,
        "nonce": nonce,
        "signature": signature,
    }


def verify(message: dict[str, Any], secret: str, seen_nonces: set[str] | None = None) -> tuple[bool, Any, str | None]:
    """Returns (valid, payload_or_None, error_message_or_None)."""
    try:
        payload = message["payload"]
        timestamp = int(message["timestamp"])
        nonce = message["nonce"]
        signature = message["signature"]
    except (KeyError, TypeError, ValueError):
        return False, None, "Missing required fields"

    age = int(time.time() * 1000) - timestamp
    if age > MAX_AGE_MS or age < -30_000:
        return False, None, f"Message too old or from the future (age={age}ms)"

    if seen_nonces is not None and nonce in seen_nonces:
        return False, None, "Duplicate nonce — possible replay"

    expected = hmac.new(secret.encode("utf-8"), _canonical(payload, timestamp, nonce), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return False, None, "Invalid HMAC signature"

    if seen_nonces is not None:
        seen_nonces.add(nonce)
    return True, payload, None
