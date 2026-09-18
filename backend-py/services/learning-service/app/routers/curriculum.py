"""Curriculum: offline lessons + subjects list (mirrors backend/src/routes/combined.js curriculumRouter)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import TeacherOrAbove, current_principal, get_session

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])


class LessonIn(BaseModel):
    """Payload for creating or editing an offline lesson."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(min_length=1, max_length=255)
    title_sw: str | None = Field(default=None, max_length=255)
    content: str = Field(min_length=1)
    content_sw: str | None = None
    subject_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("subject_id", "subjectId"),
    )
    curriculum: str | None = Field(default=None, max_length=50)
    grade_level: str | None = Field(
        default=None,
        max_length=50,
        validation_alias=AliasChoices("grade_level", "gradeLevel"),
    )
    order_index: int = Field(
        default=0,
        validation_alias=AliasChoices("order_index", "orderIndex"),
    )
    is_active: bool = Field(
        default=True,
        validation_alias=AliasChoices("is_active", "isActive"),
    )
    # super_admin only — for regular teachers/admins the caller's own school_id is forced.
    school_id: uuid.UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("school_id", "schoolId"),
    )


async def _get_user_school_id(sess: AsyncSession, user_id: str) -> uuid.UUID | None:
    row = (await sess.execute(
        text("SELECT school_id FROM users WHERE id = :uid"),
        {"uid": uuid.UUID(user_id)},
    )).mappings().first()
    return row["school_id"] if row and row.get("school_id") else None


@router.get("/subjects")
async def list_subjects(
    country: str | None = Query(None),
    curriculum: str | None = Query(None),
    level: str | None = Query(None),
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    # Tolerant grade matching: users may have grade_level stored as "9" while
    # subjects are seeded as "Grade 9 (JSS)" (or vice versa).
    rows = (await sess.execute(
        text(
            """
            SELECT * FROM subjects
            WHERE (CAST(:c AS text) IS NULL OR country = CAST(:c AS country_code))
              AND (CAST(:cu AS text) IS NULL OR curriculum = :cu)
              AND (CAST(:l AS text) IS NULL
                   OR grade_level = :l
                   OR grade_level ILIKE 'Grade ' || :l || '%'
                   OR :l ILIKE 'Grade ' || grade_level || '%')
            ORDER BY name
            """
        ),
        {"c": country, "cu": curriculum, "l": level},
    )).mappings().all()
    return {"subjects": [dict(r) for r in rows]}


@router.get("/offline-lessons")
async def offline_lessons(
    request: Request,
    level: str | None = Query(None),
    curriculum: str | None = Query(None),
    lang: str | None = Query(None),
    sess: AsyncSession = Depends(get_session),
):
    """Read endpoint. Public (auth optional) but respects school scoping when authenticated:
    unauthenticated callers only see global lessons (school_id IS NULL);
    authenticated callers see globals + lessons authored for their own school.
    """
    # Gateway-injected header; if absent the caller is unauthenticated.
    x_user_id = request.headers.get("x-user-id")
    caller_school_id: uuid.UUID | None = None
    if x_user_id:
        try:
            caller_school_id = await _get_user_school_id(sess, x_user_id)
        except Exception:  # noqa: BLE001
            caller_school_id = None

    rows = (await sess.execute(
        text(
            """
            SELECT id, title, title_sw, content, content_sw, grade_level, subject_id
            FROM offline_lessons
            WHERE is_active = TRUE
              AND (CAST(:l AS text) IS NULL OR grade_level = :l)
              AND (CAST(:cu AS text) IS NULL OR curriculum = :cu)
              AND (school_id IS NULL OR school_id = CAST(:sid AS uuid))
            ORDER BY order_index
            """
        ),
        {"l": level, "cu": curriculum, "sid": caller_school_id},
    )).mappings().all()

    lessons = [
        {
            "id": str(r["id"]),
            "gradeLevel": r["grade_level"],
            "subjectId": str(r["subject_id"]) if r["subject_id"] else None,
            "title": (r["title_sw"] or r["title"]) if lang == "sw" else r["title"],
            "content": (r["content_sw"] or r["content"]) if lang == "sw" else r["content"],
        }
        for r in rows
    ]
    return {"lessons": lessons}


@router.get("/offline-lessons/manage")
async def list_lessons_manage(
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    """Return every lesson the caller may edit — used by the admin/teacher manager screen."""
    is_super = principal.has_role("super_admin")
    school_id = None if is_super else await _get_user_school_id(sess, principal.user_id)
    if not is_super and not school_id:
        rows = (await sess.execute(
            text(
                """
                SELECT ol.*, s.name AS subject_name FROM offline_lessons ol
                LEFT JOIN subjects s ON s.id = ol.subject_id
                WHERE ol.created_by = :uid AND ol.school_id IS NULL
                ORDER BY ol.order_index, ol.created_at DESC
                """
            ),
            {"uid": uuid.UUID(principal.user_id)},
        )).mappings().all()
        return {"lessons": [dict(r) for r in rows]}

    rows = (await sess.execute(
        text(
            """
            SELECT ol.*, s.name AS subject_name FROM offline_lessons ol
            LEFT JOIN subjects s ON s.id = ol.subject_id
            WHERE (:is_super = TRUE OR ol.school_id = CAST(:sid AS uuid))
            ORDER BY ol.order_index, ol.created_at DESC
            """
        ),
        {"is_super": is_super, "sid": school_id},
    )).mappings().all()
    return {"lessons": [dict(r) for r in rows]}


@router.post("/offline-lessons", status_code=status.HTTP_201_CREATED)
async def create_lesson(
    body: LessonIn,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    is_super = principal.has_role("super_admin")
    target_school = body.school_id if is_super else await _get_user_school_id(sess, principal.user_id)

    row = (await sess.execute(
        text(
            """
            INSERT INTO offline_lessons
              (title, title_sw, content, content_sw, subject_id, curriculum,
               grade_level, order_index, is_active, school_id, created_by)
            VALUES (:title, :title_sw, :content, :content_sw, :sub, :cu,
                    :lvl, :ord, :active, CAST(:sid AS uuid), :uid)
            RETURNING id
            """
        ),
        {
            "title": body.title,
            "title_sw": body.title_sw,
            "content": body.content,
            "content_sw": body.content_sw,
            "sub": body.subject_id,
            "cu": body.curriculum,
            "lvl": body.grade_level,
            "ord": body.order_index,
            "active": body.is_active,
            "sid": target_school,
            "uid": uuid.UUID(principal.user_id),
        },
    )).mappings().first()
    await sess.commit()
    return {"id": str(row["id"])}


async def _load_lesson_for_edit(sess: AsyncSession, lesson_id: uuid.UUID, principal) -> dict:
    row = (await sess.execute(
        text("SELECT * FROM offline_lessons WHERE id = :lid"),
        {"lid": lesson_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    if principal.has_role("super_admin"):
        return dict(row)
    school_id = await _get_user_school_id(sess, principal.user_id)
    if row["school_id"] and row["school_id"] == school_id:
        return dict(row)
    if row["created_by"] and str(row["created_by"]) == principal.user_id:
        return dict(row)
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed to modify this lesson")


@router.put("/offline-lessons/{lesson_id}")
async def update_lesson(
    lesson_id: uuid.UUID,
    body: LessonIn,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    existing = await _load_lesson_for_edit(sess, lesson_id, principal)
    is_super = principal.has_role("super_admin")
    target_school = body.school_id if is_super else existing["school_id"]

    await sess.execute(
        text(
            """
            UPDATE offline_lessons SET
              title = :title,
              title_sw = :title_sw,
              content = :content,
              content_sw = :content_sw,
              subject_id = :sub,
              curriculum = :cu,
              grade_level = :lvl,
              order_index = :ord,
              is_active = :active,
              school_id = CAST(:sid AS uuid),
              updated_at = NOW()
            WHERE id = :lid
            """
        ),
        {
            "title": body.title,
            "title_sw": body.title_sw,
            "content": body.content,
            "content_sw": body.content_sw,
            "sub": body.subject_id,
            "cu": body.curriculum,
            "lvl": body.grade_level,
            "ord": body.order_index,
            "active": body.is_active,
            "sid": target_school,
            "lid": lesson_id,
        },
    )
    await sess.commit()
    return {"ok": True}


@router.delete("/offline-lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    await _load_lesson_for_edit(sess, lesson_id, principal)
    # Soft delete keeps the row queryable if referenced later.
    await sess.execute(
        text("UPDATE offline_lessons SET is_active = FALSE, updated_at = NOW() WHERE id = :lid"),
        {"lid": lesson_id},
    )
    await sess.commit()
    return {"ok": True}


class TutorSaveIn(BaseModel):
    """Payload for saving an AI tutor exchange as an offline lesson."""

    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    subject: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=255)


def _derive_title(question: str, subject: str | None) -> str:
    q = question.strip().replace("\n", " ")
    if len(q) > 80:
        q = q[:80].rstrip() + "…"
    if subject:
        return f"{subject}: {q}"
    return q


@router.post("/offline-lessons/from-tutor", status_code=status.HTTP_201_CREATED)
async def save_tutor_session(
    body: TutorSaveIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Save an AI tutor Q&A pair as an offline lesson visible to the caller
    (and, if they belong to a school, to their schoolmates at the same grade).

    Available to any authenticated user — students can build a personal library
    of tutor-derived lessons they can revisit while offline.
    """
    uid = uuid.UUID(principal.user_id)
    me = (await sess.execute(
        text(
            "SELECT school_id, grade_level, curriculum FROM users WHERE id = :uid"
        ),
        {"uid": uid},
    )).mappings().first()
    if not me:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Look up subject id by name within the caller's curriculum/grade — optional.
    subject_id: uuid.UUID | None = None
    if body.subject:
        sub_row = (await sess.execute(
            text(
                """
                SELECT id FROM subjects
                WHERE LOWER(name) = LOWER(:name)
                  AND (CAST(:cu AS text) IS NULL OR curriculum = :cu)
                LIMIT 1
                """
            ),
            {"name": body.subject, "cu": me["curriculum"]},
        )).mappings().first()
        if sub_row:
            subject_id = sub_row["id"]

    title = body.title or _derive_title(body.question, body.subject)
    content = (
        f"**Question:**\n{body.question.strip()}\n\n"
        f"**Answer:**\n{body.answer.strip()}"
    )

    row = (await sess.execute(
        text(
            """
            INSERT INTO offline_lessons
              (title, content, subject_id, curriculum, grade_level,
               order_index, is_active, school_id, created_by)
            VALUES (:title, :content, :sub, :cu, :lvl,
                    0, TRUE, :sid, :uid)
            RETURNING id
            """
        ),
        {
            "title": title,
            "content": content,
            "sub": subject_id,
            "cu": me["curriculum"],
            "lvl": me["grade_level"],
            "sid": me["school_id"],
            "uid": uid,
        },
    )).mappings().first()
    await sess.commit()
    return {"id": str(row["id"]), "title": title}
