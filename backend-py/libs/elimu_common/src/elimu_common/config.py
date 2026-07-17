"""Shared config base. Each service subclasses BaseServiceSettings to add its own fields."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Runtime ────────────────────────────────────────────────────────────
    env: str = Field(default="development")
    log_level: str = Field(default="INFO")
    service_name: str = "unnamed-service"
    port: int = 8000

    # ─── Infra ──────────────────────────────────────────────────────────────
    database_url: str = Field(..., description="postgresql+asyncpg://... URL")
    redis_url: str = Field(default="redis://redis:6379")

    # ─── Auth (all services need JWT_SECRET to verify tokens) ───────────────
    jwt_secret: str = Field(..., min_length=32)
    jwt_access_ttl_min: int = 10080  # 7 days
    jwt_refresh_ttl_min: int = 43200  # 30 days

    # ─── Queue HMAC (for BullMQ payload signing, shared with mpesa-service) ─
    queue_hmac_secret: str = Field(default="")

    # ─── Cross-service URLs (used by http_client.py) ────────────────────────
    auth_service_url: str = "http://auth-service:5100"
    users_service_url: str = "http://users-service:5101"
    schools_service_url: str = "http://schools-service:5102"
    billing_service_url: str = "http://billing-service:5103"
    learning_service_url: str = "http://learning-service:5104"
    admin_service_url: str = "http://admin-service:5105"

    # ─── Object storage (S3-compatible: MinIO for dev, AWS S3 in prod) ──────
    # For AWS: leave s3_endpoint_url empty, set region + access keys.
    # For MinIO: point s3_endpoint_url at http://minio:9000 (internal) and
    # s3_public_url at the browser-reachable URL (e.g. http://localhost:9000).
    s3_endpoint_url: str = Field(default="")
    s3_public_url: str = Field(default="")
    s3_region: str = Field(default="us-east-1")
    s3_access_key: str = Field(default="")
    s3_secret_key: str = Field(default="")
    s3_bucket: str = Field(default="elimuai-uploads")
    s3_force_path_style: bool = Field(default=True)


@lru_cache(maxsize=1)
def get_settings(settings_cls: type[BaseServiceSettings] = BaseServiceSettings) -> BaseServiceSettings:
    """Cached singleton. Services should import their own settings_cls."""
    return settings_cls()  # type: ignore[call-arg]
