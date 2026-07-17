from __future__ import annotations

from elimu_common.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "users-service"
    port: int = 5101
