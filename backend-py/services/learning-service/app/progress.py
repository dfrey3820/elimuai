"""XP / streak / leaderboard mirror of backend/src/services/progressService.js."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger(__name__)

XP_REWARDS = {
    "ai_question": 5,
    "homework": 8,
    "exam_complete": 20,
    "exam_perfect": 50,
    "streak_day": 10,
    "lesson_read": 3,
    "login": 2,
}


def current_period_key(period: str) -> str:
    now = datetime.utcnow()
    if period == "weekly":
        year, week, _ = now.isocalendar()
        return f"{year}-W{week:02d}"
    if period == "monthly":
        return f"{now.year}-{now.month:02d}"
    return "all"


async def award_xp(
    sess: AsyncSession,
    user_id: uuid.UUID,
    activity: str,
    custom_xp: int | None = None,
) -> int:
    xp = custom_xp if custom_xp is not None else XP_REWARDS.get(activity, 5)
    try:
        await sess.execute(
            text("UPDATE users SET total_xp = total_xp + :xp WHERE id = :uid"),
            {"xp": xp, "uid": user_id},
        )
        await sess.execute(
            text(
                "INSERT INTO progress_logs (user_id, activity_type, xp_earned) "
                "VALUES (:uid, :at, :xp)"
            ),
            {"uid": user_id, "at": activity, "xp": xp},
        )
        user_row = (await sess.execute(
            text("SELECT country, school_id FROM users WHERE id = :uid"),
            {"uid": user_id},
        )).mappings().first()
        country = user_row["country"] if user_row else None
        school_id = user_row["school_id"] if user_row else None
        for period, period_key in (
            ("weekly", current_period_key("weekly")),
            ("monthly", current_period_key("monthly")),
            ("all_time", "all"),
        ):
            scopes: list[tuple[str, uuid.UUID | None, str | None]] = [("global", None, None)]
            if country:
                scopes.append(("country", None, country))
            if school_id:
                scopes.append(("school", school_id, country))
            for scope, scope_id, ctry in scopes:
                await sess.execute(
                    text(
                        """
                        INSERT INTO leaderboard_entries
                          (user_id, scope, scope_id, country, period, period_key, xp)
                        VALUES (:uid, :sc, :sid, :ctry, :p, :pk, :xp)
                        ON CONFLICT (user_id, scope, scope_id, period, period_key)
                        DO UPDATE SET xp = leaderboard_entries.xp + :xp, updated_at = NOW()
                        """
                    ),
                    {"uid": user_id, "sc": scope, "sid": scope_id, "ctry": ctry,
                     "p": period, "pk": period_key, "xp": xp},
                )
        await sess.commit()
        return xp
    except Exception as exc:  # noqa: BLE001
        await sess.rollback()
        log.error("award_xp_failed", user_id=str(user_id), error=str(exc))
        return 0


async def update_streak(sess: AsyncSession, user_id: uuid.UUID) -> int:
    row = (await sess.execute(
        text("SELECT streak_days, streak_last FROM users WHERE id = :uid"),
        {"uid": user_id},
    )).mappings().first()
    if not row:
        return 0
    streak_days = row["streak_days"] or 0
    streak_last = row["streak_last"]
    today = date.today()
    yesterday = today - timedelta(days=1)

    if streak_last == today:
        return streak_days
    if streak_last == yesterday:
        new_streak = streak_days + 1
    else:
        new_streak = 1
    await sess.execute(
        text("UPDATE users SET streak_days = :s, streak_last = CURRENT_DATE WHERE id = :uid"),
        {"s": new_streak, "uid": user_id},
    )
    await sess.commit()
    await award_xp(sess, user_id, "streak_day")
    return new_streak


async def check_achievements(sess: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """Award any newly-earned achievements. Returns the list of codes awarded now."""
    try:
        stats_row = (await sess.execute(
            text(
                """
                SELECT u.streak_days, u.total_xp,
                    (SELECT COUNT(*) FROM ai_sessions WHERE user_id = u.id) AS ai_count,
                    (SELECT COUNT(*) FROM exam_attempts WHERE user_id = u.id AND completed = TRUE) AS exam_count,
                    (SELECT MAX(percentage) FROM exam_attempts WHERE user_id = u.id) AS max_score
                FROM users u WHERE u.id = :uid
                """
            ),
            {"uid": user_id},
        )).mappings().first()
        if not stats_row:
            return []

        stats = dict(stats_row)
        all_rows = (await sess.execute(text("SELECT id, code, xp_reward, criteria FROM achievements"))).mappings().all()
        earned_rows = (await sess.execute(
            text("SELECT achievement_id FROM user_achievements WHERE user_id = :uid"),
            {"uid": user_id},
        )).mappings().all()
        earned_ids = {r["achievement_id"] for r in earned_rows}

        awarded: list[str] = []
        for ach in all_rows:
            if ach["id"] in earned_ids:
                continue
            criteria = ach["criteria"] or {}
            qualifies = False
            if "streak_days" in criteria and (stats["streak_days"] or 0) >= criteria["streak_days"]:
                qualifies = True
            if "ai_questions" in criteria and (stats["ai_count"] or 0) >= criteria["ai_questions"]:
                qualifies = True
            if "tests_completed" in criteria and (stats["exam_count"] or 0) >= criteria["tests_completed"]:
                qualifies = True
            if "exam_score" in criteria and (stats["max_score"] or 0) >= criteria["exam_score"]:
                qualifies = True
            # Rank / language-based criteria are checked elsewhere (leaderboard job).
            if not qualifies:
                continue
            await sess.execute(
                text(
                    "INSERT INTO user_achievements (user_id, achievement_id) VALUES (:uid, :aid) "
                    "ON CONFLICT DO NOTHING"
                ),
                {"uid": user_id, "aid": ach["id"]},
            )
            await sess.execute(
                text("UPDATE users SET total_xp = total_xp + :xp WHERE id = :uid"),
                {"xp": ach["xp_reward"] or 0, "uid": user_id},
            )
            awarded.append(ach["code"])
        if awarded:
            await sess.commit()
        return awarded
    except Exception as exc:  # noqa: BLE001
        await sess.rollback()
        log.error("check_achievements_failed", user_id=str(user_id), error=str(exc))
        return []
