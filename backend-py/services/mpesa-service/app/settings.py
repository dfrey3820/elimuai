from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "mpesa-service"
    port: int = 5002

    # ─── M-Pesa Daraja (env defaults; Redis overrides at runtime) ───────────
    mpesa_environment: str = "sandbox"  # 'sandbox' | 'production'
    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = ""
    mpesa_passkey: str = ""
    mpesa_callback_base_url: str = ""

    # ─── Queues (must match billing-service.payment_queue_name) ─────────────
    payment_queue_name: str = "mpesa-payments"
    result_queue_name: str = "mpesa-results"
    queue_concurrency: int = 5
