"""ORM for learning-service tables."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy import Enum as PgEnum
from sqlalchemy import JSON as JSONB
from elimu_common.types import GUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


LanguageCode = PgEnum("en", "sw", name="language_code")


class AiSession(Base):
    __tablename__ = "ai_sessions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    type: Mapped[str] = mapped_column(String(30), server_default="tutor")
    language: Mapped[str] = mapped_column(LanguageCode, server_default="en")
    messages: Mapped[list] = mapped_column(JSONB, default=list)
    xp_earned: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    duration_mins: Mapped[int] = mapped_column(Integer, server_default="0")
    xp_earned: Mapped[int] = mapped_column(Integer, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)
    logged_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SubjectScore(Base):
    __tablename__ = "subject_scores"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    avg_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="0")
    attempts: Mapped[int] = mapped_column(Integer, server_default="0")
    last_updated: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False)
    scope: Mapped[str] = mapped_column(String(20), nullable=False)
    scope_id: Mapped[uuid.UUID | None] = mapped_column(GUID())
    country: Mapped[str | None] = mapped_column(String(5))
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    period_key: Mapped[str] = mapped_column(String(20), nullable=False)
    xp: Mapped[int] = mapped_column(Integer, server_default="0")
    rank: Mapped[int | None] = mapped_column(Integer)
    streak: Mapped[int] = mapped_column(Integer, server_default="0")
    tests_taken: Mapped[int] = mapped_column(Integer, server_default="0")
    avg_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="0")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
