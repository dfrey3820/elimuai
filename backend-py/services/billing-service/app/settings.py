from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "billing-service"
    port: int = 5103
    # Billing knobs (mirrored in DB admin_settings; env is a fallback)
    trial_days: int = 7
    # Cycle discount defaults if not present in admin_settings
    billing_quarterly_discount: int = 10
    billing_semi_annual_discount: int = 15
    billing_annual_discount: int = 20
    # Payment queue name shared with Node mpesa-service
    payment_queue_name: str = "mpesa-payments"
    # Shared secret used to authenticate inbound gateway webhook notifications
    # (HMAC-SHA256 of the raw request body, sent as `X-Elimu-Signature: sha256=<hex>`).
    # Leave empty to disable the endpoint (it will return 503).
    payment_webhook_secret: str = ""

    # ─── External payment gateway (venus.elimuai.africa) ───────────────────
    # When `payment_gateway_url` is set, /api/payments/mpesa/initiate calls the
    # gateway's STK-push endpoint instead of enqueueing to the legacy Node
    # mpesa-service BullMQ queue. Leave empty to keep the BullMQ path.
    payment_gateway_url: str = ""
    payment_gateway_api_key: str = ""
    payment_gateway_api_secret: str = ""

    # ─── Subscription reminder scheduler ──────────────────────────────────
    # Master toggle
    reminders_enabled: bool = True
    # How often the scheduler wakes up (seconds). Default = daily.
    reminders_interval_seconds: int = 86400
    # Delay before the first run after service start (seconds). Gives DB time to warm.
    reminders_startup_delay_seconds: int = 60
    # How many days before plan_expires we start warning.
    reminders_expiring_days: int = 7
    # For free-plan admins, how often we're allowed to re-send the "start subscription" nudge.
    reminders_free_cooldown_days: int = 7
    # Lapsed subscriptions: send a renewal invoice up to N times, spaced M days
    # apart (3 sends 3 days apart ≈ one week of nudges per expiry).
    reminders_renewal_max_sends: int = 3
    reminders_renewal_gap_days: int = 3
    # Public origin used for one-click renewal links in reminder emails.
    public_base_url: str = "https://elimuai.africa"

    # ─── Payment reconciliation sweeper ───────────────────────────────────
    # Periodically polls the payment gateway for pending payments whose
    # webhook we may have missed, and applies the authoritative status.
    reconciler_enabled: bool = True
    # How often the sweeper runs (seconds). Small so stuck payments recover
    # within a couple of minutes.
    reconciler_interval_seconds: int = 60
    # Delay before the first run after service start.
    reconciler_startup_delay_seconds: int = 45
    # Only query the gateway for payments older than this — younger rows are
    # still legitimately waiting for the user to enter their M-Pesa PIN.
    reconciler_min_age_seconds: int = 90
    # Stop reconciling payments older than this — very old rows have almost
    # certainly been abandoned and repeatedly polling them wastes gateway
    # quota. Default = 24h.
    reconciler_max_age_seconds: int = 86400
    # How many rows to process per sweep.
    reconciler_batch_size: int = 25
