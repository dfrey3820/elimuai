"""AI tutor / homework / question generation routes."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_principal, get_anthropic, get_session, settings
from ..progress import award_xp
from ..prompts import homework_system_prompt, questions_system_prompt, tutor_system_prompt
from ..schemas import GenerateQuestionsIn, HomeworkIn, SchoolInsightsIn, SchoolInsightsOut, TutorIn, TutorOut

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def _user_ctx(sess: AsyncSession, user_id: uuid.UUID) -> dict:
    row = (await sess.execute(
        text(
            "SELECT language, curriculum, grade_level, country, plan FROM users WHERE id = :uid"
        ),
        {"uid": user_id},
    )).mappings().first()
    return dict(row) if row else {}


async def _require_ai_access(sess: AsyncSession, user_id: uuid.UUID) -> None:
    """Gate AI endpoints on a live subscription check.

    Access is granted when any of these are true:
      * role is admin / super_admin
      * user's school has a paid, non-expired plan
      * user has a paid, non-expired personal plan
      * user is still within their free trial window

    Otherwise raises HTTP 402 Payment Required so the frontend can surface
    an "activate a plan" prompt.
    """
    row = (await sess.execute(
        text(
            """
            SELECT u.plan, u.plan_expires, u.trial_expires, u.role, u.school_id,
                   s.plan AS school_plan, s.plan_expires AS school_plan_expires
            FROM users u
            LEFT JOIN schools s ON s.id = u.school_id
            WHERE u.id = :uid
            """
        ),
        {"uid": user_id},
    )).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if row["role"] in ("admin", "super_admin"):
        return

    now = datetime.utcnow()
    school_active = (
        row["school_id"] is not None
        and row["school_plan"] not in (None, "free")
        and row["school_plan_expires"] is not None
        and row["school_plan_expires"] > now
    )
    plan_active = (
        row["plan"] not in (None, "free")
        and row["plan_expires"] is not None
        and row["plan_expires"] > now
    )
    trial_active = row["trial_expires"] is not None and row["trial_expires"] > now

    if school_active or plan_active or trial_active:
        return

    raise HTTPException(
        status.HTTP_402_PAYMENT_REQUIRED,
        "Your free trial has ended. Activate a plan to keep using AI features.",
    )


def _call_claude(client, *, system: str, messages: list[dict], max_tokens: int) -> str:
    try:
        resp = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        # anthropic sdk returns list of ContentBlock; .text on the first block
        block = resp.content[0]
        return getattr(block, "text", "") or ""
    except Exception as exc:  # noqa: BLE001
        log.error("anthropic_error", error=str(exc))
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI provider error") from exc


@router.post("/tutor", response_model=TutorOut, response_model_by_alias=True)
async def tutor(
    body: TutorIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")
    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)
    ctx = await _user_ctx(sess, user_id)
    lang = ctx.get("language") or "en"

    system = tutor_system_prompt(
        subject=body.subject,
        curriculum=ctx.get("curriculum"),
        grade_level=ctx.get("grade_level"),
        language=lang,
    )
    reply = _call_claude(
        client,
        system=system,
        messages=[m.model_dump() for m in body.messages],
        max_tokens=settings.anthropic_max_tokens,
    )

    # Persist / update session
    new_messages_json = json.dumps([*[m.model_dump() for m in body.messages[-1:]], {"role": "assistant", "content": reply}])
    if body.session_id:
        await sess.execute(
            text(
                "UPDATE ai_sessions SET messages = messages || CAST(:m AS jsonb), updated_at = NOW() "
                "WHERE id = :sid AND user_id = :uid"
            ),
            {"m": new_messages_json, "sid": body.session_id, "uid": user_id},
        )
    else:
        full = json.dumps([*[m.model_dump() for m in body.messages], {"role": "assistant", "content": reply}])
        await sess.execute(
            text(
                "INSERT INTO ai_sessions (user_id, type, language, messages) "
                "VALUES (:uid, 'tutor', :lang, CAST(:m AS jsonb))"
            ),
            {"uid": user_id, "lang": lang, "m": full},
        )
    await sess.commit()

    xp = await award_xp(sess, user_id, "ai_question")
    return TutorOut(reply=reply, xp_earned=xp)


@router.post("/homework", response_model=TutorOut, response_model_by_alias=True)
async def homework(
    body: HomeworkIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")
    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)
    ctx = await _user_ctx(sess, user_id)
    lang = ctx.get("language") or "en"

    system = homework_system_prompt(
        subject=body.subject,
        curriculum=ctx.get("curriculum"),
        grade_level=ctx.get("grade_level"),
        mode=body.mode,
        language=lang,
    )
    if body.mode == "solve":
        content = f"{'Swali' if lang == 'sw' else 'Question'}: {body.question}"
    else:
        if lang == "sw":
            content = f"Swali: {body.question}\n\nJibu la mwanafunzi: {body.student_answer}\n\nTafadhali kagua kazi yangu."
        else:
            content = f"Question: {body.question}\n\nStudent's answer: {body.student_answer}\n\nPlease check my work."
    reply = _call_claude(
        client,
        system=system,
        messages=[{"role": "user", "content": content}],
        max_tokens=settings.anthropic_max_tokens,
    )
    xp = await award_xp(sess, user_id, "homework")
    return TutorOut(reply=reply, xp_earned=xp)


@router.post("/generate-questions")
async def generate_questions(
    body: GenerateQuestionsIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")
    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)
    ctx = await _user_ctx(sess, user_id)
    lang = ctx.get("language") or "en"

    system = questions_system_prompt(
        count=body.count,
        curriculum=ctx.get("curriculum"),
        grade_level=body.grade_level,
        language=lang,
    )
    user_content = (
        f"Generate {body.count} {body.subject} exam questions for {body.grade_level}, "
        f"{ctx.get('curriculum') or 'CBC'} style"
        + (f", similar to {body.year} past paper." if body.year else ".")
    )
    raw = _call_claude(
        client,
        system=system,
        messages=[{"role": "user", "content": user_content}],
        max_tokens=2000,
    )
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI returned invalid JSON") from exc
    return {"questions": questions}


@router.post("/school-insights", response_model=SchoolInsightsOut)
async def school_insights(
    body: SchoolInsightsIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")
    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)
    ctx = await _user_ctx(sess, user_id)
    lang = ctx.get("language") or "en"

    role_hint = body.class_data.get("role") or "school admin"
    system = (
        "You are ElimuAI school-analytics assistant. Given aggregate class data, "
        "produce a concise report (300–400 words) with: (1) headline insights, "
        "(2) student cohorts needing attention, (3) 3 actionable recommendations. "
        f"Audience: {role_hint}. "
        + ("Respond entirely in Kiswahili." if lang == "sw" else "Respond in English.")
    )
    user_content = "Class data JSON:\n" + json.dumps(body.class_data, default=str)
    reply = _call_claude(
        client,
        system=system,
        messages=[{"role": "user", "content": user_content}],
        max_tokens=1200,
    )
    return SchoolInsightsOut(insights=reply)
