from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "learning-service"
    port: int = 5104
    anthropic_api_key: str = ""
    # Verified available; override with ANTHROPIC_MODEL env if needed.
    anthropic_model: str = "claude-haiku-4-5-20251001"
    anthropic_max_tokens: int = 1000
