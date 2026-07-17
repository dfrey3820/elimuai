from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "auth-service"
    port: int = 5100

    # ─── Signup guardrails ─────────────────────────────────────────────────
    school_signup_token: str = ""  # if non-empty, /register with role=admin needs body.signup_token

    # ─── OTP ───────────────────────────────────────────────────────────────
    otp_expiry_min: int = 10
    otp_max_attempts: int = 5
    otp_cooldown_sec: int = 60

    # ─── Trial ─────────────────────────────────────────────────────────────
    trial_days: int = 7
