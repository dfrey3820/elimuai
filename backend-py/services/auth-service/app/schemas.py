"""Pydantic request/response schemas for auth-service."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Response models that must serialize with camelCase field names to stay
# compatible with the existing Next.js frontend (which was built against the
# Node backend). Inputs continue to accept snake_case; outputs are aliased.
class _CamelOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=6)
    role: Literal["student", "teacher", "parent", "admin"]
    country: Literal["KE", "TZ", "UG"] = "KE"
    language: Literal["en", "sw"] = "en"
    grade_level: str | None = None
    school_id: UUID | None = None
    curriculum: str | None = "CBC"
    school_name: str | None = None
    signup_token: str | None = None  # required when SCHOOL_SIGNUP_TOKEN is set and role=admin


class UserOut(BaseModel):
    id: UUID
    name: str
    email: EmailStr | None
    phone: str | None
    role: str
    plan: str
    plan_expires: datetime | None = None
    country: str
    language: str
    grade_level: str | None = None
    school_id: UUID | None = None
    curriculum: str | None = None
    total_xp: int = 0
    streak_days: int = 0
    trial_expires: datetime | None = None

    class Config:
        from_attributes = True


class RegisterOut(_CamelOut):
    user: UserOut
    otp_sent: bool = Field(serialization_alias="otpSent")
    message: str
    requires_otp: bool = Field(default=True, serialization_alias="requiresOTP")
    dev_code: str | None = Field(default=None, serialization_alias="devCode")


class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    purpose: Literal["signup", "login", "verify_email"]


class ResendOtpIn(BaseModel):
    email: EmailStr
    purpose: Literal["signup", "login", "verify_email"]


class LoginIn(BaseModel):
    identifier: str  # email or phone
    password: str


class LoginOtpChallengeOut(_CamelOut):
    requires_otp: bool = Field(default=True, serialization_alias="requiresOTP")
    purpose: Literal["signup", "login"]
    email: EmailStr
    user_name: str | None = Field(default=None, serialization_alias="userName")
    message: str
    dev_code: str | None = Field(default=None, serialization_alias="devCode")


class TokenPairOut(_CamelOut):
    user: UserOut
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    verified: bool = True


class RefreshIn(BaseModel):
    refresh_token: str


class RefreshOut(_CamelOut):
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")


class LogoutIn(BaseModel):
    refresh_token: str | None = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class DeleteAccountIn(BaseModel):
    password: str


class SessionOut(BaseModel):
    id: UUID
    ip_address: str | None
    user_agent: str | None
    last_active: datetime
    created_at: datetime
    is_current: bool

    class Config:
        from_attributes = True


class InternalVerifyOut(BaseModel):
    user_id: UUID
    role: str
