"""M-Pesa Daraja API client + Redis-backed config store."""
from __future__ import annotations

import base64
import json
import time
from datetime import datetime, timezone

import httpx
import redis.asyncio as aioredis
import structlog

log = structlog.get_logger(__name__)

CONFIG_KEY = "mpesa:config"
_TOKEN_TTL = 3500  # seconds — Safaricom tokens live ~3599s
_token_cache: dict[str, tuple[str, float]] = {}  # consumer_key -> (token, expiry)


def _base_url(env: str) -> str:
    return "https://api.safaricom.co.ke" if env == "production" else "https://sandbox.safaricom.co.ke"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def _password(shortcode: str, passkey: str, ts: str) -> str:
    return base64.b64encode(f"{shortcode}{passkey}{ts}".encode()).decode()


async def get_config(redis: aioredis.Redis, defaults: dict) -> dict:
    """Merge Redis overrides on top of env defaults."""
    stored: dict = {}
    try:
        raw = await redis.get(CONFIG_KEY)
        if raw:
            stored = json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        log.warning("mpesa.config.read_failed", error=str(exc))
    env = stored.get("environment") or defaults.get("environment", "sandbox")
    return {
        "environment": env,
        "consumerKey": stored.get("consumerKey") or defaults.get("consumerKey", ""),
        "consumerSecret": stored.get("consumerSecret") or defaults.get("consumerSecret", ""),
        "shortcode": stored.get("shortcode") or defaults.get("shortcode", ""),
        "passkey": stored.get("passkey") or defaults.get("passkey", ""),
        "callbackBaseUrl": stored.get("callbackBaseUrl") or defaults.get("callbackBaseUrl", ""),
        "baseUrl": _base_url(env),
    }


async def set_config(redis: aioredis.Redis, updates: dict, current: dict) -> dict:
    merged = {
        "environment": updates.get("environment") or current.get("environment"),
        "consumerKey": updates.get("consumerKey") or current.get("consumerKey"),
        "consumerSecret": updates.get("consumerSecret") or current.get("consumerSecret"),
        "shortcode": updates.get("shortcode") or current.get("shortcode"),
        "passkey": updates.get("passkey") or current.get("passkey"),
        "callbackBaseUrl": updates.get("callbackBaseUrl") or current.get("callbackBaseUrl"),
    }
    await redis.set(CONFIG_KEY, json.dumps(merged))
    log.info("mpesa.config.updated")
    return merged


async def get_access_token(cfg: dict) -> str:
    ck = cfg["consumerKey"]
    cached = _token_cache.get(ck)
    if cached and cached[1] > time.time():
        return cached[0]
    auth = base64.b64encode(f"{ck}:{cfg['consumerSecret']}".encode()).decode()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{cfg['baseUrl']}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {auth}"},
        )
        r.raise_for_status()
        token = r.json()["access_token"]
    _token_cache[ck] = (token, time.time() + _TOKEN_TTL)
    log.info("mpesa.oauth.refreshed")
    return token


async def stk_push(cfg: dict, *, phone: str, amount: float, account_reference: str,
                   transaction_desc: str, callback_url: str) -> dict:
    token = await get_access_token(cfg)
    ts = _timestamp()
    payload = {
        "BusinessShortCode": cfg["shortcode"],
        "Password": _password(cfg["shortcode"], cfg["passkey"], ts),
        "Timestamp": ts,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(round(float(amount))),
        "PartyA": phone,
        "PartyB": cfg["shortcode"],
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{cfg['baseUrl']}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        return r.json()


async def stk_query(cfg: dict, checkout_request_id: str) -> dict:
    token = await get_access_token(cfg)
    ts = _timestamp()
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{cfg['baseUrl']}/mpesa/stkpushquery/v1/query",
            json={
                "BusinessShortCode": cfg["shortcode"],
                "Password": _password(cfg["shortcode"], cfg["passkey"], ts),
                "Timestamp": ts,
                "CheckoutRequestID": checkout_request_id,
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        return r.json()


async def register_c2b_urls(cfg: dict, confirmation_url: str, validation_url: str) -> dict:
    token = await get_access_token(cfg)
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{cfg['baseUrl']}/mpesa/c2b/v1/registerurl",
            json={
                "ShortCode": cfg["shortcode"],
                "ResponseType": "Completed",
                "ConfirmationURL": confirmation_url,
                "ValidationURL": validation_url,
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        r.raise_for_status()
        return r.json()
