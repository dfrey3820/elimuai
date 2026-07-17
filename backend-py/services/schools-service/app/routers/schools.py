"""Read-only school routes: /api/schools/{id}[/stats/students]."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import TeacherOrAbove, current_principal, get_session
from ..schemas import SchoolStatsOut

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("/{school_id}")
async def get_school(
    school_id: uuid.UUID,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text("SELECT id, name, country, curriculum, plan, plan_expires, is_active FROM schools WHERE id = :id"),
        {"id": school_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "School not found")
    return {"school": dict(row)}


@router.get("/{school_id}/stats", response_model=dict)
async def school_stats(
    school_id: uuid.UUID,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    row = (await sess.execute(
        text(
            """
            SELECT s.id, s.name, s.country, s.curriculum, s.plan, s.plan_expires, s.is_active,
              (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'student') AS student_count,
              (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'teacher') AS teacher_count,
              (SELECT AVG(p.score) FROM progress_logs p
                 JOIN users u ON u.id = p.user_id
                 WHERE u.school_id = s.id AND p.score IS NOT NULL) AS avg_score
            FROM schools s WHERE s.id = :id
            """
        ),
        {"id": school_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "School not found")
    return {"school": dict(row)}


@router.get("/{school_id}/students")
async def school_students(
    school_id: uuid.UUID,
    principal=TeacherOrAbove,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(
        text(
            """
            SELECT u.id, u.name, u.grade_level, u.streak_days, u.total_xp, u.last_login, u.plan,
              (SELECT AVG(score) FROM progress_logs
                 WHERE user_id = u.id AND score IS NOT NULL) AS avg_score
            FROM users u WHERE u.school_id = :sid AND u.role = 'student'
            ORDER BY u.name
            """
        ),
        {"sid": school_id},
    )).mappings().all()
    return {"students": [dict(r) for r in rows]}
