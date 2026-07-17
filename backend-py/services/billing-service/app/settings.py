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
