from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import ParentOnly, current_principal, get_session
from ..models import ParentChild, User
from ..schemas import ChildOut, OnboardChildIn, OnboardChildOut, ProfilePatchIn, SummaryOut, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])

# Students may change their own grade_level only once per this many days.
GRADE_CHANGE_COOLDOWN_DAYS = 365


def _gen_temp_password(n: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


@router.get("/profile", response_model=dict)
async def get_profile(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return {"user": UserOut.model_validate(user).model_dump(mode="json")}


@router.patch("/profile", response_model=dict)
async def update_profile(
    body: ProfilePatchIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    updates = body.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid fields")

    # ─── grade_level change is rate-limited for students ────────────────────
    if "grade_level" in updates and principal.role == "student":
        user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one_or_none()
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        _assert_grade_change_allowed(user)
        updates["grade_level_updated_at"] = datetime.utcnow()

    try:
        await sess.execute(update(User).where(User.id == uuid.UUID(principal.user_id)).values(**updates))
        await sess.commit()
    except IntegrityError as exc:
        await sess.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or phone already registered") from exc

    user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one()
    return {"user": UserOut.model_validate(user).model_dump(mode="json")}


# ─── Grade / Class self-service (student) ────────────────────────────────────

class GradeIn(BaseModel):
    grade_level: str = Field(..., min_length=1, max_length=50)


def _assert_grade_change_allowed(user: User) -> None:
    """Raise 403 if the student is not allowed to change grade_level right now.

    Rules:
      - If grade_level is currently unset → allowed (first-time selection).
      - Else if grade_level_updated_at is None or older than the cooldown → allowed.
      - Else → 403 with days-remaining message.
    """
    if not user.grade_level:
        return
    last = user.grade_level_updated_at
    if last is None:
        return
    elapsed = datetime.utcnow() - last
    if elapsed >= timedelta(days=GRADE_CHANGE_COOLDOWN_DAYS):
        return
    days_left = GRADE_CHANGE_COOLDOWN_DAYS - elapsed.days
    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        f"You can only change your class once a year. Try again in {days_left} day(s).",
    )


@router.post("/grade", response_model=dict)
async def set_grade(
    body: GradeIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    """Student sets or promotes their class. First-time set is always allowed;
    subsequent changes are rate-limited to once per year."""
    if principal.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only students may set their own class here.")
    user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    _assert_grade_change_allowed(user)
    await sess.execute(
        update(User)
        .where(User.id == user.id)
        .values(grade_level=body.grade_level.strip(), grade_level_updated_at=datetime.utcnow())
    )
    await sess.commit()
    user = (await sess.execute(select(User).where(User.id == user.id))).scalar_one()
    return {"user": UserOut.model_validate(user).model_dump(mode="json")}


@router.get("/summary", response_model=SummaryOut)
async def get_summary(
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
):
    user = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    stats_row = (await sess.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM ai_sessions WHERE user_id = :uid) AS ai_sessions,
              (SELECT COUNT(*) FROM exam_attempts WHERE user_id = :uid AND completed = TRUE) AS exams,
              (SELECT COALESCE(SUM(xp_earned),0) FROM progress_logs
                 WHERE user_id = :uid AND logged_date >= NOW() - INTERVAL '7 days') AS week_xp
            """
        ),
        {"uid": user.id},
    )).mappings().first()
    return SummaryOut(
        user=UserOut.model_validate(user),
        stats=dict(stats_row) if stats_row else {},
    )


children_router = APIRouter(prefix="/api/users", tags=["children"])


@children_router.get("/children", response_model=dict)
async def list_children(
    principal=ParentOnly,
    sess: AsyncSession = Depends(get_session),
):
    rows = (await sess.execute(
        text(
            """
            SELECT u.id, u.name, u.grade_level, u.streak_days, u.total_xp, u.last_login,
                   (SELECT COUNT(*) FROM progress_logs
                     WHERE user_id = u.id AND logged_date = CURRENT_DATE) AS today_sessions
            FROM parent_children pc
            JOIN users u ON u.id = pc.child_id
            WHERE pc.parent_id = :pid
            """
        ),
        {"pid": uuid.UUID(principal.user_id)},
    )).mappings().all()
    return {"children": [dict(r) for r in rows]}


@children_router.post("/onboard-child", response_model=dict, status_code=status.HTTP_201_CREATED)
async def onboard_child(
    body: OnboardChildIn,
    principal=ParentOnly,
    sess: AsyncSession = Depends(get_session),
):
    if not body.email and not body.phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email or phone required")

    # Copy parent's country/language/curriculum onto the child
    parent = (await sess.execute(select(User).where(User.id == uuid.UUID(principal.user_id)))).scalar_one()

    temp_password = _gen_temp_password()
    hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt(rounds=12)).decode()

    try:
        child = User(
            name=body.name,
            email=body.email,
            phone=body.phone,
            password_hash=hashed,
            role="student",
            country=parent.country,
            language=parent.language,
            curriculum=parent.curriculum or "CBC",
            grade_level=body.grade_level,
        )
        sess.add(child)
        await sess.flush()
        sess.add(ParentChild(parent_id=parent.id, child_id=child.id))
        await sess.commit()
    except IntegrityError as exc:
        await sess.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or phone already registered") from exc

    return {
        "child": OnboardChildOut(
            id=child.id, name=child.name, email=child.email, temp_password=temp_password
        ).model_dump(by_alias=True, mode="json")
    }
