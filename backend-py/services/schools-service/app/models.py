"""Tables schools-service reads/writes."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


UserRole = PgEnum(
    "student", "teacher", "parent", "admin", "super_admin",
    name="user_role", create_type=False,
)
PlanType = PgEnum(
    "free", "student", "family", "school", "enterprise",
    name="plan_type", create_type=False,
)
CountryCode = PgEnum("KE", "TZ", "UG", name="country_code", create_type=False)
LanguageCode = PgEnum("en", "sw", name="language_code", create_type=False)


class School(Base):
    __tablename__ = "schools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(CountryCode, nullable=False, server_default="KE")
    county: Mapped[str | None] = mapped_column(String(100))
    curriculum: Mapped[str] = mapped_column(String(50), server_default="CBC")
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    plan: Mapped[str] = mapped_column(PlanType, server_default="free")
    plan_expires: Mapped[datetime | None] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(UserRole, nullable=False, server_default="student")
    country: Mapped[str] = mapped_column(CountryCode, server_default="KE")
    language: Mapped[str] = mapped_column(LanguageCode, server_default="en")
    grade_level: Mapped[str | None] = mapped_column(String(50))
    curriculum: Mapped[str | None] = mapped_column(String(50), server_default="CBC")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    email_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    onboarded: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ClassRoom(Base):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[str | None] = mapped_column(String(50))
    curriculum: Mapped[str | None] = mapped_column(String(50))
    subject: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ClassStudent(Base):
    __tablename__ = "class_students"

    class_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
