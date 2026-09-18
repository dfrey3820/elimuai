"""mpesa-service — Python port of the legacy Node service.

Responsibilities
----------------
1. Consume BullMQ ``mpesa-payments`` queue → send STK Push via Daraja.
2. Publish results to BullMQ ``mpesa-results`` for billing-service to consume.
3. Serve Safaricom callbacks over HTTP (``/mpesa/callback``, ``/c2b/*``).
4. Optional STK-query helper (``POST /stk/query``).

Config precedence: Redis key ``mpesa:config`` (admin-editable) → env vars.
"""
