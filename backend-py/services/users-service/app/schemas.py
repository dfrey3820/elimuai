from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    role: str
    plan: str
    plan_expires: datetime | None = None
    country: str
    language: str
    grade_level: str | None = None
    grade_level_updated_at: datetime | None = None
    curriculum: str | None = None
    avatar_url: str | None = None
    streak_days: int = 0
    total_xp: int = 0
    school_id: uuid.UUID | None = None
    trial_expires: datetime | None = None


class ProfilePatchIn(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    language: str | None = Field(default=None, pattern=r"^(en|sw)$")
    grade_level: str | None = None
    curriculum: str | None = None
    avatar_url: str | None = None


class ChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    grade_level: str | None = None
    streak_days: int = 0
    total_xp: int = 0
    last_login: datetime | None = None
    today_sessions: int = 0


class OnboardChildIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = None
    grade_level: str | None = Field(
        default=None,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )


class OnboardChildOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: uuid.UUID
    name: str
    email: EmailStr | None = None
    temp_password: str = Field(..., serialization_alias="tempPassword")


class SummaryOut(BaseModel):
    user: UserOut
    stats: dict[str, Any]
