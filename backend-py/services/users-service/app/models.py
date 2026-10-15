"""ORM for tables users-service touches: users + parent_children + progress rollups."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as PgEnum
from elimu_common.types import GUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


UserRole = PgEnum(
    "student", "teacher", "parent", "admin", "super_admin",
    name="user_role",
)
PlanType = PgEnum(
    "free", "student", "teacher", "parent", "family", "school", "enterprise",
    name="plan_type",  # kept in sync with billing-service / DB enum
)
CountryCode = PgEnum("KE", "TZ", "UG", name="country_code")
LanguageCode = PgEnum("en", "sw", name="language_code")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(UserRole, nullable=False, server_default="student")
    plan: Mapped[str] = mapped_column(PlanType, nullable=False, server_default="free")
    plan_expires: Mapped[datetime | None] = mapped_column(DateTime)
    country: Mapped[str] = mapped_column(CountryCode, nullable=False, server_default="KE")
    language: Mapped[str] = mapped_column(LanguageCode, nullable=False, server_default="en")
    grade_level: Mapped[str | None] = mapped_column(String(50))
    grade_level_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    curriculum: Mapped[str | None] = mapped_column(String(50), server_default="CBC")
    avatar_url: Mapped[str | None] = mapped_column(Text)
    streak_days: Mapped[int] = mapped_column(Integer, server_default="0")
    streak_last: Mapped[date | None] = mapped_column(Date)
    total_xp: Mapped[int] = mapped_column(Integer, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    phone_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    trial_expires: Mapped[datetime | None] = mapped_column(DateTime)
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    onboarded: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ParentChild(Base):
    __tablename__ = "parent_children"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
