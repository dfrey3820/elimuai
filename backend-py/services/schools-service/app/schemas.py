from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class _CamelIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class TeacherIn(_CamelIn):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = None
    subject: str | None = Field(default=None, max_length=100)
    class_name: str | None = Field(
        default=None,
        max_length=100,
        validation_alias=AliasChoices("class_name", "className"),
    )
    grade_level: str | None = Field(
        default=None,
        max_length=50,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )


class BulkTeachersIn(BaseModel):
    teachers: list[TeacherIn] = Field(..., min_length=1, max_length=50)


class StudentIn(_CamelIn):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    grade_level: str | None = Field(
        default=None,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )


class BulkStudentsIn(_CamelIn):
    students: list[StudentIn] = Field(..., min_length=1, max_length=100)
    class_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("class_id", "classId"),
    )


class OnboardResult(BaseModel):
    created: list[dict] = []
    skipped: list[dict] = []
    errors: list[dict] = []
    message: str


class ClassIn(_CamelIn):
    name: str = Field(..., min_length=1, max_length=100)
    grade_level: str | None = Field(
        default=None,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )
    teacher_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("teacher_id", "teacherId"),
    )
    subject: str | None = Field(default=None, max_length=100)


class ClassOut(BaseModel):
    id: uuid.UUID
    name: str
    grade_level: str | None = None
    subject: str | None = None
    teacher_name: str | None = None
    student_count: int = 0


class SchoolOut(BaseModel):
    id: uuid.UUID
    name: str
    country: str
    curriculum: str
    plan: str
    plan_expires: datetime | None = None
    is_active: bool


class SchoolStatsOut(SchoolOut):
    student_count: int = 0
    teacher_count: int = 0
    avg_score: float | None = None
