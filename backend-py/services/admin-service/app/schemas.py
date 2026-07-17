from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class DashboardOut(BaseModel):
    users: dict[str, Any]
    payments: dict[str, Any]
    sms: dict[str, Any]


class UserListOut(BaseModel):
    users: list[dict[str, Any]]
    total: int
    page: int
    limit: int


class UserRoleIn(BaseModel):
    role: str = Field(..., pattern=r"^(student|teacher|parent|admin|super_admin)$")


class SettingsUpdate(BaseModel):
    # accept arbitrary keys — validation done against ALLOWED_KEYS at handler time
    model_config = {"extra": "allow"}
