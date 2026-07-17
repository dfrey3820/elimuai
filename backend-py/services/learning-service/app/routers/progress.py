"""Progress log + summary routes."""
from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_principal, get_session
from ..progress import award_xp, check_achievements, update_streak
from ..schemas import ProgressLogIn, ProgressLogOut, ProgressSummaryOut

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/summary", response_model=ProgressSummaryOut)
async def progress_summary(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    uid = uuid.UUID(principal.user_id)
    user_row = (await sess.execute(
        text("SELECT streak_days, total_xp FROM users WHERE id = :uid"),
        {"uid": uid},
    )).mappings().first()
    xp_row = (await sess.execute(
        text(
            "SELECT COALESCE(SUM(xp_earned),0) AS week_xp, COALESCE(SUM(duration_mins),0) AS week_mins "
            "FROM progress_logs WHERE user_id = :uid AND logged_date >= NOW() - INTERVAL '7 days'"
        ),
        {"uid": uid},
    )).mappings().first()
    subjects = (await sess.execute(
        text(
            "SELECT s.name, ss.avg_score, ss.attempts FROM subject_scores ss "
            "JOIN subjects s ON s.id = ss.subject_id WHERE ss.user_id = :uid ORDER BY ss.avg_score DESC"
        ),
        {"uid": uid},
    )).mappings().all()
    logs = (await sess.execute(
        text(
            "SELECT activity_type, xp_earned, score, logged_date FROM progress_logs "
            "WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20"
        ),
        {"uid": uid},
    )).mappings().all()
    return ProgressSummaryOut(
        streak=(user_row and user_row["streak_days"]) or 0,
        total_xp=(user_row and user_row["total_xp"]) or 0,
        week_xp=int(xp_row["week_xp"]) if xp_row else 0,
        week_mins=int(xp_row["week_mins"]) if xp_row else 0,
        subjects=[dict(r) for r in subjects],
        recent_activity=[dict(r) for r in logs],
    )


@router.post("/log", response_model=ProgressLogOut, response_model_by_alias=True)
async def progress_log(
    body: ProgressLogIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    uid = uuid.UUID(principal.user_id)
    streak = await update_streak(sess, uid)
    xp = await award_xp(sess, uid, body.activity_type)

    await sess.execute(
        text(
            "INSERT INTO progress_logs (user_id, subject_id, activity_type, score, duration_mins, xp_earned) "
            "VALUES (:uid, :sid, :at, :sc, :dm, :xp)"
        ),
        {
            "uid": uid,
            "sid": body.subject_id,
            "at": body.activity_type,
            "sc": body.score,
            "dm": body.duration_mins,
            "xp": xp,
        },
    )
    if body.subject_id and body.score is not None:
        await sess.execute(
            text(
                """
                INSERT INTO subject_scores (user_id, subject_id, avg_score, attempts)
                VALUES (:uid, :sid, :sc, 1)
                ON CONFLICT (user_id, subject_id) DO UPDATE SET
                  avg_score = (subject_scores.avg_score * subject_scores.attempts + :sc)
                              / (subject_scores.attempts + 1),
                  attempts = subject_scores.attempts + 1,
                  last_updated = NOW()
                """
            ),
            {"uid": uid, "sid": body.subject_id, "sc": Decimal(str(body.score))},
        )
    await sess.commit()
    # Re-evaluate achievements after each activity so newly-unlocked badges
    # appear in the UI right away.
    await check_achievements(sess, uid)
    return ProgressLogOut(xp_earned=xp, streak=streak)


@router.get("/achievements")
async def list_user_achievements(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Return every achievement in the catalogue with earned status for the caller.

    Payload:
      {
        "achievements": [
          { "id", "code", "name", "name_sw", "description", "desc_sw",
            "icon", "xp_reward", "criteria", "earned": bool, "earned_at": iso|null }
        ]
      }
    """
    uid = uuid.UUID(principal.user_id)
    # Re-check silently so the response reflects the very latest state.
    await check_achievements(sess, uid)

    rows = (await sess.execute(
        text(
            """
            SELECT a.id, a.code, a.name, a.name_sw, a.description, a.desc_sw,
                   a.icon, a.xp_reward, a.criteria,
                   ua.earned_at
            FROM achievements a
            LEFT JOIN user_achievements ua
                   ON ua.achievement_id = a.id AND ua.user_id = :uid
            ORDER BY (ua.earned_at IS NULL), a.xp_reward, a.code
            """
        ),
        {"uid": uid},
    )).mappings().all()
    return {
        "achievements": [
            {
                "id": str(r["id"]),
                "code": r["code"],
                "name": r["name"],
                "name_sw": r["name_sw"],
                "description": r["description"],
                "desc_sw": r["desc_sw"],
                "icon": r["icon"],
                "xp_reward": r["xp_reward"],
                "criteria": r["criteria"],
                "earned": r["earned_at"] is not None,
                "earned_at": r["earned_at"].isoformat() if r["earned_at"] else None,
            }
            for r in rows
        ],
    }
