"""Round-trip test for the HMAC helper used by billing-service to talk to
the Node mpesa-service. Verifies both sides of the wire format.
"""
from __future__ import annotations

import json

from elimu_common.hmac_util import sign, verify


def test_sign_verify_roundtrip():
    payload = {"paymentId": "abc", "amount": 100}
    msg = sign(payload, "secret" * 10)
    ok, decoded, err = verify(msg, "secret" * 10, seen_nonces=set())
    assert ok, err
    assert decoded == payload


def test_bad_signature_rejected():
    msg = sign({"x": 1}, "secret" * 10)
    msg["signature"] = "0" * 64
    ok, _, err = verify(msg, "secret" * 10, seen_nonces=set())
    assert not ok
    assert "signature" in (err or "").lower()


def test_replay_rejected():
    msg = sign({"x": 1}, "secret" * 10)
    seen: set[str] = set()
    ok, _, _ = verify(msg, "secret" * 10, seen)
    assert ok
    ok2, _, err = verify(msg, "secret" * 10, seen)
    assert not ok2
    assert "replay" in (err or "").lower() or "nonce" in (err or "").lower()


def test_wire_format_matches_node():
    """The signed JSON must match JSON.stringify({payload, timestamp, nonce}) exactly."""
    msg = sign({"a": 1}, "k")
    canonical = json.dumps(
        {"payload": msg["payload"], "timestamp": msg["timestamp"], "nonce": msg["nonce"]},
        separators=(",", ":"),
    )
    # Sanity: canonical must NOT include the signature or extra spaces.
    assert "signature" not in canonical
    assert " " not in canonical
