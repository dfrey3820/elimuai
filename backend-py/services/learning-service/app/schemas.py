from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

Role = Literal["user", "assistant", "system"]


class _CamelIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ChatMessage(BaseModel):
    role: Role
    content: str


class TutorIn(_CamelIn):
    messages: list[ChatMessage] = Field(..., min_length=1)
    subject: str
    session_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("session_id", "sessionId"),
    )


class TutorOut(BaseModel):
    reply: str
    xp_earned: int = Field(..., serialization_alias="xpEarned")

    model_config = ConfigDict(populate_by_name=True)


class HomeworkIn(_CamelIn):
    question: str
    student_answer: str | None = Field(
        default=None,
        validation_alias=AliasChoices("student_answer", "studentAnswer"),
    )
    mode: Literal["solve", "check"] = "solve"
    subject: str


class GenerateQuestionsIn(_CamelIn):
    subject: str
    grade_level: str = Field(
        ...,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )
    year: int | None = None
    count: int = Field(default=5, ge=1, le=20)
    paper_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("paper_id", "paperId"),
    )


class SchoolInsightsIn(_CamelIn):
    class_data: dict[str, Any] = Field(
        ...,
        validation_alias=AliasChoices("class_data", "classData"),
    )


class SchoolInsightsOut(BaseModel):
    insights: str


class GeneratedQuestion(BaseModel):
    q: str
    options: list[str]
    answer: str
    explanation: str | None = None


class ProgressLogIn(_CamelIn):
    activity_type: str = Field(
        ...,
        validation_alias=AliasChoices("activity_type", "activityType"),
    )
    subject_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("subject_id", "subjectId"),
    )
    score: float | None = None
    duration_mins: int = Field(
        default=0,
        validation_alias=AliasChoices("duration_mins", "durationMins"),
    )


class ProgressLogOut(BaseModel):
    xp_earned: int = Field(..., serialization_alias="xpEarned")
    streak: int

    model_config = ConfigDict(populate_by_name=True)


class ProgressSummaryOut(BaseModel):
    streak: int
    total_xp: int
    week_xp: int
    week_mins: int
    subjects: list[dict[str, Any]]
    recent_activity: list[dict[str, Any]]


class LeaderboardEntry(BaseModel):
    rank: int | None = None
    xp: int
    streak: int = 0
    tests_taken: int = 0
    avg_score: Decimal | None = None
    id: uuid.UUID
    name: str
    avatar_url: str | None = None
    country: str | None = None
    grade_level: str | None = None
    school_id: uuid.UUID | None = None
    school_name: str | None = None
    is_current_user: bool = False


class LeaderboardOut(BaseModel):
    leaderboard: list[dict[str, Any]]
    user_rank: dict[str, Any] | None = None
    scope: str
    period: str
    period_key: str
    total_entries: int
