"""HTTP client for the external payment gateway (venus.elimuai.africa).

The gateway exposes provider-agnostic payment endpoints. For M-Pesa STK Push:

    POST {base_url}/api/v1/payments/mpesa/stkpush
    Headers:
        X-API-Key:    <public key>
        X-API-Secret: <secret key>
        Content-Type: application/json
    Body:
        {
            "phone_number": "254712345678",
            "amount":        100,
            "reference":     "ORDER-001",
            "description":   "Subscription payment"
        }

Transaction status can be polled with:

    GET {base_url}/api/v1/transactions/{transaction_id}
    Headers: X-API-Key, X-API-Secret

The gateway later POSTs the outcome to our webhook at
``/api/payments/webhook/gateway`` (see routers/webhook.py). The callback
envelope is:

    {
      "event": "transaction.completed" | "transaction.failed",
      "data": {
        "reference":         "<the reference we submitted>",
        "gateway":           "mpesa",
        "mode":              "stk_push",
        "status":            "completed" | "failed",
        "amount":            1.0,
        "amount_paid":       1.0,
        "currency":          "KES",
        "phone_number":      "254712345678",
        "description":       "Subscription payment",
        "gateway_reference": "SHJ7ABCDE0",           // provider receipt (M-Pesa)
        "failure_reason":    null
      }
    }
"""
from __future__ import annotations

import httpx


class PaymentGatewayError(RuntimeError):
    """Raised when the gateway returns a non-2xx response or is unreachable."""

    def __init__(self, message: str, *, status_code: int | None = None, body: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class PaymentGatewayClient:
    def __init__(self, base_url: str, api_key: str, api_secret: str, *, timeout: float = 15.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._api_secret = api_secret
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "X-API-Key": self._api_key,
            "X-API-Secret": self._api_secret,
            "Content-Type": "application/json",
        }

    async def stk_push(
        self,
        *,
        phone_number: str,
        amount: float,
        reference: str,
        description: str,
    ) -> dict:
        """Trigger an M-Pesa STK Push. Returns the gateway's JSON response."""
        payload = {
            "phone_number": phone_number,
            "amount": amount,
            "reference": reference,
            "description": description,
        }
        url = f"{self._base_url}/api/v1/payments/mpesa/stkpush"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                resp = await client.post(url, json=payload, headers=self._headers())
            except httpx.HTTPError as exc:
                raise PaymentGatewayError(f"Gateway unreachable: {exc}") from exc

        if resp.status_code >= 400:
            raise PaymentGatewayError(
                f"Gateway returned {resp.status_code}",
                status_code=resp.status_code,
                body=resp.text,
            )
        try:
            return resp.json()
        except ValueError as exc:
            raise PaymentGatewayError(
                "Gateway returned non-JSON response",
                status_code=resp.status_code,
                body=resp.text,
            ) from exc

    async def get_transaction(self, transaction_id: str) -> dict:
        """Poll the gateway for the current status of a transaction."""
        url = f"{self._base_url}/api/v1/transactions/{transaction_id}"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                resp = await client.get(url, headers=self._headers())
            except httpx.HTTPError as exc:
                raise PaymentGatewayError(f"Gateway unreachable: {exc}") from exc
        if resp.status_code >= 400:
            raise PaymentGatewayError(
                f"Gateway returned {resp.status_code}",
                status_code=resp.status_code,
                body=resp.text,
            )
        return resp.json()
