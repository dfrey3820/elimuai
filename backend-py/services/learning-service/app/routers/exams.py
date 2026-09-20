"""Past papers + exam attempts.

Past papers are now generated on-demand by AI for the calling student's grade
level and chosen subject. Each generated paper is persisted as a ``past_papers``
row (with the questions stored inline as JSONB) so students can revisit or
retake them without re-billing the AI provider.
"""
from __future__ import annotations

import datetime as _dt
import json
import re
import uuid
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_principal, get_anthropic, get_session
from ..progress import award_xp
from ..prompts import questions_system_prompt
from .ai import _call_claude, _require_ai_access, _user_ctx

router = APIRouter(prefix="/api/exams", tags=["exams"])


class ExamAttemptIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    past_paper_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("past_paper_id", "pastPaperId"),
    )
    questions: list[Any] = Field(default_factory=list)
    answers: dict[str, Any] | list[Any] = Field(default_factory=dict)
    score: int = 0
    total: int = 0
    time_taken_secs: int = Field(
        default=0,
        validation_alias=AliasChoices("time_taken_secs", "timeTakenSecs"),
    )


class GeneratePaperIn(BaseModel):
    """Payload for generating a new AI practice paper."""

    model_config = ConfigDict(populate_by_name=True)

    subject_id: uuid.UUID = Field(
        validation_alias=AliasChoices("subject_id", "subjectId"),
    )
    year: int | None = Field(
        default=None,
        ge=1990,
        le=2100,
        description="Optional target year the paper should mimic (e.g. 2022).",
    )
    count: int = Field(default=20, ge=5, le=40)
    # Optional overrides — used when the caller is not a student and therefore
    # has no ``grade_level`` / ``curriculum`` / ``country`` on their own profile.
    country: str | None = Field(default=None, min_length=2, max_length=5)
    curriculum: str | None = Field(default=None, min_length=1, max_length=50)
    grade_level: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )


@router.get("/papers")
async def list_papers(
    country: str | None = Query(None),
    curriculum: str | None = Query(None),
    level: str | None = Query(None),
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """List AI-generated papers the caller has previously created.

    Students see their own history so they can revisit or retake past attempts.
    Country / curriculum / level query params are honoured for extra filtering
    but the primary scope is always ``created_by = caller``.
    """
    await _require_ai_access(sess, uuid.UUID(principal.user_id))
    rows = (await sess.execute(
        text(
            """
            SELECT pp.*, s.name AS subject_name
            FROM past_papers pp
            LEFT JOIN subjects s ON s.id = pp.subject_id
            WHERE pp.is_active = TRUE
              AND pp.created_by = :uid
              AND (CAST(:c AS text) IS NULL OR pp.country = CAST(:c AS country_code))
              AND (CAST(:cu AS text) IS NULL OR pp.curriculum = :cu)
              AND (CAST(:l AS text) IS NULL OR pp.grade_level = :l)
            ORDER BY pp.created_at DESC
            LIMIT 50
            """
        ),
        {
            "uid": uuid.UUID(principal.user_id),
            "c": country,
            "cu": curriculum,
            "l": level,
        },
    )).mappings().all()
    return {"papers": [dict(r) for r in rows]}


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_paper(
    body: GeneratePaperIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    """Generate a fresh AI practice paper for the caller's grade level.

    The generated questions are persisted inline on the ``past_papers`` row so
    the paper can be retaken without re-billing the AI provider.
    """
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")

    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)

    ctx = await _user_ctx(sess, user_id)
    grade_level = body.grade_level or ctx.get("grade_level")
    curriculum = body.curriculum or ctx.get("curriculum")
    country = body.country or ctx.get("country")
    lang = ctx.get("language") or "en"
    if not grade_level or not curriculum or not country:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Provide country, curriculum and grade level (or set them on your profile) before generating exams.",
        )

    subject = (await sess.execute(
        text("SELECT id, name, name_sw FROM subjects WHERE id = :sid"),
        {"sid": body.subject_id},
    )).mappings().first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    subject_name = subject["name"]

    year = body.year or _dt.datetime.utcnow().year - 1

    system = questions_system_prompt(
        count=body.count,
        curriculum=curriculum,
        grade_level=grade_level,
        language=lang,
    )
    user_content = (
        f"Generate {body.count} {subject_name} exam questions for {grade_level}, "
        f"{curriculum} style, similar to a {year} past paper."
    )
    raw = _call_claude(
        client,
        system=system,
        messages=[{"role": "user", "content": user_content}],
        max_tokens=4000,
    )
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI returned invalid JSON") from exc
    if not isinstance(questions, list) or not questions:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI returned empty question set")

    title = f"{subject_name} {year} — AI Practice"

    row = (await sess.execute(
        text(
            """
            INSERT INTO past_papers
              (title, subject_id, country, curriculum, grade_level, year,
               is_active, school_id, created_by, questions, ai_generated)
            VALUES (:title, :sub, CAST(:c AS country_code), :cu, :lvl, :yr,
                    TRUE, NULL, :uid, CAST(:q AS jsonb), TRUE)
            RETURNING id, title, subject_id, country, curriculum, grade_level, year, created_at
            """
        ),
        {
            "title": title,
            "sub": subject["id"],
            "c": country,
            "cu": curriculum,
            "lvl": grade_level,
            "yr": year,
            "uid": user_id,
            "q": json.dumps(questions),
        },
    )).mappings().first()
    await sess.commit()

    return {
        "id": str(row["id"]),
        "title": row["title"],
        "subject_id": str(row["subject_id"]),
        "subject_name": subject_name,
        "grade_level": row["grade_level"],
        "year": row["year"],
        "questions": questions,
    }


@router.get("/papers/{paper_id}/questions")
async def paper_questions(
    paper_id: uuid.UUID,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Return the stored questions for a previously generated paper.

    Callers may only fetch papers they created (or as super_admin).
    """
    await _require_ai_access(sess, uuid.UUID(principal.user_id))
    row = (await sess.execute(
        text(
            """
            SELECT pp.id, pp.title, pp.subject_id, pp.grade_level, pp.year,
                   pp.created_by, pp.questions, s.name AS subject_name
            FROM past_papers pp
            LEFT JOIN subjects s ON s.id = pp.subject_id
            WHERE pp.id = :pid AND pp.is_active = TRUE
            """
        ),
        {"pid": paper_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    if (
        not principal.has_role("super_admin")
        and str(row["created_by"] or "") != principal.user_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed to view this paper")
    if not row["questions"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper has no stored questions")
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "subject_id": str(row["subject_id"]) if row["subject_id"] else None,
        "subject_name": row["subject_name"],
        "grade_level": row["grade_level"],
        "year": row["year"],
        "questions": row["questions"],
    }


@router.post("/attempts")
async def create_attempt(
    body: ExamAttemptIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    total = body.total or 0
    pct = round((body.score / total) * 100) if total > 0 else 0
    xp = 50 if pct >= 100 else 20 if pct >= 70 else 10

    row = (await sess.execute(
        text(
            """
            INSERT INTO exam_attempts
              (user_id, past_paper_id, questions, answers, score, total, percentage,
               time_taken_secs, completed, xp_earned, completed_at)
            VALUES (:uid, :pid, CAST(:q AS jsonb), CAST(:a AS jsonb), :s, :t, :pct, :tt, TRUE, :xp, NOW())
            RETURNING id
            """
        ),
        {
            "uid": uuid.UUID(principal.user_id),
            "pid": body.past_paper_id,
            "q": json.dumps(body.questions),
            "a": json.dumps(body.answers),
            "s": body.score,
            "t": total,
            "pct": Decimal(str(pct)),
            "tt": body.time_taken_secs,
            "xp": xp,
        },
    )).mappings().first()
    await award_xp(sess, uuid.UUID(principal.user_id), "exam_complete", xp)
    await sess.commit()
    return {"attemptId": str(row["id"]), "xpEarned": xp, "percentage": pct}


@router.get("/history")
async def history(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(
        text(
            """
            SELECT ea.*, pp.title AS paper_title
            FROM exam_attempts ea
            LEFT JOIN past_papers pp ON pp.id = ea.past_paper_id
            WHERE ea.user_id = :uid
            ORDER BY ea.created_at DESC LIMIT 20
            """
        ),
        {"uid": uuid.UUID(principal.user_id)},
    )).mappings().all()
    return {"attempts": [dict(r) for r in rows]}
