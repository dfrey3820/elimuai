"""Leaderboard routes (mirrors backend/src/routes/leaderboard.js)."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import AdminOnly, current_principal, get_principal, get_session

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def _period_key(period: str) -> str:
    now = datetime.utcnow()
    if period == "weekly":
        year, week, _ = now.isocalendar()
        return f"{year}-W{week:02d}"
    if period == "monthly":
        return f"{now.year}-{now.month:02d}"
    return "all"


@router.get("")
async def leaderboard(
    scope: str = Query("global"),
    period: str = Query("weekly"),
    limit: int = Query(50, ge=1, le=200),
    scope_id: uuid.UUID | None = Query(None, alias="scopeId"),
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    period_key = _period_key(period)
    user_id = uuid.UUID(principal.user_id) if principal else None

    filters = []
    params = {"uid": user_id, "sc": scope, "p": period, "pk": period_key, "lim": limit}
    if scope == "country":
        # Country needs looking up on the user
        row = (await sess.execute(
            text("SELECT country FROM users WHERE id = :uid"), {"uid": user_id}
        )).mappings().first()
        country = (row and row["country"]) if row else None
        if country:
            filters.append("AND le.country = :ctry")
            params["ctry"] = country
    elif scope == "class":
        # "Class" leaderboard = students at the same grade_level. If the caller belongs
        # to a school, we further restrict to that school so it reads as *their* class,
        # not every student globally at that grade.
        row = (await sess.execute(
            text("SELECT grade_level, school_id, country FROM users WHERE id = :uid"),
            {"uid": user_id},
        )).mappings().first()
        grade_level = row and row["grade_level"]
        caller_school = row and row["school_id"]
        caller_country = row and row["country"]
        if not grade_level:
            # No class set yet — return an empty list rather than a 500.
            return {
                "leaderboard": [],
                "userRank": None,
                "scope": scope,
                "period": period,
                "periodKey": period_key,
                "totalEntries": 0,
                "note": "no_grade_level",
            }
        # Query on global scope entries because we don't materialise per-class entries;
        # instead we filter users by grade_level.
        params["sc"] = "global"
        filters.append("AND u.grade_level = :grade")
        params["grade"] = grade_level
        if caller_school:
            filters.append("AND u.school_id = :school")
            params["school"] = caller_school
        elif caller_country:
            filters.append("AND u.country = :ctry")
            params["ctry"] = caller_country
        # Only compare students to other students.
        filters.append("AND u.role = 'student'")
    elif scope in ("school", "class") and scope_id:
        filters.append("AND le.scope_id = :sid")
        params["sid"] = scope_id

    # The public leaderboard is a student-only ranking across all scopes.
    # Teachers/admins are ranked separately via /api/leaderboard/school-rankings.
    if "AND u.role = 'student'" not in filters:
        filters.append("AND u.role = 'student'")

    q = text(
        f"""
        SELECT
          le.rank, le.xp, le.streak, le.tests_taken, le.avg_score,
          u.id, u.name, u.avatar_url, u.country, u.grade_level, u.school_id,
          s.name AS school_name,
          CASE WHEN u.id = :uid THEN TRUE ELSE FALSE END AS is_current_user
        FROM leaderboard_entries le
        JOIN users u ON u.id = le.user_id
        LEFT JOIN schools s ON s.id = u.school_id
        WHERE le.scope = :sc AND le.period = :p AND le.period_key = :pk
        {' '.join(filters)}
        ORDER BY le.xp DESC, le.streak DESC
        LIMIT :lim
        """
    )
    rows = (await sess.execute(q, params)).mappings().all()

    user_rank = None
    if user_id:
        rank_row = (await sess.execute(
            text(
                "SELECT rank, xp, streak FROM leaderboard_entries le "
                "JOIN users u ON u.id = le.user_id "
                "WHERE le.user_id = :uid AND le.scope = :sc "
                "AND le.period = :p AND le.period_key = :pk "
                "AND u.role = 'student'"
            ),
            {"uid": user_id, "sc": params["sc"], "p": period, "pk": period_key},
        )).mappings().first()
        if rank_row:
            user_rank = dict(rank_row)

    return {
        "leaderboard": [dict(r) for r in rows],
        "userRank": user_rank,
        "scope": scope,
        "period": period,
        "periodKey": period_key,
        "totalEntries": len(rows),
    }


@router.get("/my-ranks")
async def my_ranks(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    uid = uuid.UUID(principal.user_id)
    out: dict[str, dict[str, dict]] = {}
    for period in ("weekly", "monthly", "all_time"):
        out[period] = {}
        pk = _period_key(period)
        for scope in ("global", "country", "school"):
            row = (await sess.execute(
                text(
                    "SELECT rank, xp, streak, tests_taken, avg_score FROM leaderboard_entries "
                    "WHERE user_id = :uid AND scope = :sc AND period = :p AND period_key = :pk"
                ),
                {"uid": uid, "sc": scope, "p": period, "pk": pk},
            )).mappings().first()
            out[period][scope] = dict(row) if row else {"rank": None, "xp": 0}
    return {"ranks": out}


@router.get("/school-rankings")
async def school_rankings(
    period: str = Query("weekly"),
    principal=AdminOnly,
    sess: AsyncSession = Depends(get_session),
):
    """School admin: student + teacher-aggregated rankings."""
    # Find requester's school
    me_row = (await sess.execute(
        text("SELECT school_id FROM users WHERE id = :uid"),
        {"uid": uuid.UUID(principal.user_id)},
    )).mappings().first()
    school_id = me_row and me_row["school_id"]
    if not school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No school associated")

    period_key = _period_key(period)

    student_rankings = (await sess.execute(
        text(
            """
            SELECT le.xp, le.streak, le.tests_taken, le.avg_score,
                   u.id, u.name, u.grade_level, u.avatar_url
            FROM leaderboard_entries le
            JOIN users u ON u.id = le.user_id
            WHERE u.school_id = :sid AND u.role = 'student'
              AND le.scope = 'school' AND le.period = :p AND le.period_key = :pk
            ORDER BY le.xp DESC LIMIT 100
            """
        ),
        {"sid": school_id, "p": period, "pk": period_key},
    )).mappings().all()

    teacher_rankings = (await sess.execute(
        text(
            """
            SELECT t.id AS teacher_id, t.name AS teacher_name,
                   COUNT(DISTINCT le.user_id) AS student_count,
                   COALESCE(SUM(le.xp), 0) AS total_xp,
                   COALESCE(ROUND(AVG(le.xp)), 0) AS avg_xp,
                   COALESCE(ROUND(AVG(le.avg_score), 1), 0) AS avg_score,
                   COALESCE(SUM(le.tests_taken), 0) AS total_tests,
                   COALESCE(ROUND(AVG(le.streak), 1), 0) AS avg_streak
            FROM users t
            LEFT JOIN users s ON s.school_id = t.school_id AND s.role = 'student'
            LEFT JOIN leaderboard_entries le ON le.user_id = s.id
              AND le.scope = 'school' AND le.period = :p AND le.period_key = :pk
            WHERE t.school_id = :sid AND t.role = 'teacher'
            GROUP BY t.id, t.name
            ORDER BY avg_xp DESC
            """
        ),
        {"sid": school_id, "p": period, "pk": period_key},
    )).mappings().all()

    return {
        "studentRankings": [dict(r) for r in student_rankings],
        "teacherRankings": [dict(r) for r in teacher_rankings],
        "period": period,
        "periodKey": period_key,
    }
