"""Photo Scan — student uploads a photo of a question or their completed work.

Two modes:
  * ``ask``  — explain the question and walk through the solution
  * ``mark`` — mark the student's completed work and give feedback

The response is streamed back as Server-Sent Events (SSE) so the frontend can
render Claude's answer word-by-word, matching the existing chat UX.

Mounted at ``/api/ai/photoscan/*`` so it inherits the gateway ``/api/ai/``
auth_request rule (the gateway still adds SSE-friendly overrides).
"""
from __future__ import annotations

import json
import uuid
from typing import AsyncIterator, Literal

import anthropic
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..deps import current_principal, get_anthropic, get_session, settings
from ..progress import award_xp
from .ai import _require_ai_access, _user_ctx

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/ai/photoscan", tags=["photoscan"])


# ── Request schema ──────────────────────────────────────────────────────────
class PhotoScanIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_b64: str = Field(
        ...,
        min_length=32,
        validation_alias=AliasChoices("image_b64", "imageB64"),
    )
    mime_type: str = Field(
        default="image/jpeg",
        validation_alias=AliasChoices("mime_type", "mimeType"),
    )
    mode: Literal["ask", "mark"] = "ask"
    subject: str = "Mathematics"


# ── Curriculum metadata ─────────────────────────────────────────────────────
# Keyed on the ``curriculum`` string that ``users.curriculum`` stores. We map
# CBC (Kenya), TIE (Tanzania), NCDC (Uganda), plus a graceful default.
CURRICULUM_META: dict[str, dict[str, str]] = {
    "CBC": {
        "full_name": "Kenya Competency Based Curriculum (CBC)",
        "exams": "KPSEA (Grade 6) and KCSE (Grade 9 / Form 4)",
        "country": "Kenya",
        "key_note": (
            "CBC emphasises competency demonstration over rote memorisation. "
            "Frame answers in terms of what the student can DO."
        ),
    },
    "TIE": {
        "full_name": "Tanzania Institute of Education Curriculum (TIE 2023)",
        "exams": "PSLE and CSEE",
        "country": "Tanzania",
        "key_note": (
            "TIE 2023 is outcome-based. Connect answers to real-world "
            "Tanzanian contexts where possible."
        ),
    },
    "NCDC": {
        "full_name": "Uganda NCDC Curriculum (2020)",
        "exams": "PLE and UCE",
        "country": "Uganda",
        "key_note": (
            "NCDC 2020 is thematic and learner-centred. Connect answers to "
            "Ugandan contexts and real-life applications."
        ),
    },
}
_DEFAULT_META = CURRICULUM_META["CBC"]

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_RAW_BYTES = 5 * 1024 * 1024  # 5MB
_MAX_TOKENS = 1024


def _meta_for(curriculum: str | None) -> dict[str, str]:
    if not curriculum:
        return _DEFAULT_META
    key = curriculum.upper()
    return CURRICULUM_META.get(key, _DEFAULT_META)


def _build_system_prompt(mode: str, subject: str, grade: str | None,
                         curriculum: str | None, language: str) -> str:
    meta = _meta_for(curriculum)
    grade_str = grade or "Grade 5"
    lang_note = (
        "Respond primarily in English, but use Kiswahili phrases where "
        "helpful (e.g. 'Hebu tujaribu' — Let us try this)."
        if language != "sw"
        else "Respond primarily in Kiswahili, but keep mathematical / "
             "scientific terms in English where they are more precise."
    )

    common_context = (
        f"STUDENT CONTEXT:\n"
        f"- Grade: {grade_str}\n"
        f"- Curriculum: {meta['full_name']}\n"
        f"- Subject: {subject}\n"
        f"- Country: {meta['country']}\n"
        f"- Relevant exams: {meta['exams']}\n"
        f"- Curriculum note: {meta['key_note']}\n"
    )

    if mode == "ask":
        return (
            "You are Elimi, ElimuAI's friendly and encouraging AI tutor "
            "for East African students.\n\n"
            f"{common_context}\n"
            "YOUR TASK — EXPLAIN THE QUESTION:\n"
            "The student has taken a photo of a question or textbook page "
            "and wants you to help them understand and solve it.\n\n"
            "HOW TO RESPOND:\n"
            "1. Restate what the question is asking in simple language.\n"
            "2. Name the KEY CONCEPT this question is testing.\n"
            "3. Walk through the solution STEP BY STEP. Number each step. "
            "Show all working.\n"
            f"4. Where relevant, give a real-world example from "
            f"{meta['country']} (market prices, farm measurements, etc.).\n"
            "5. End with a QUICK CHECK — one simple practice question.\n"
            "6. Use encouraging language.\n\n"
            "FORMATTING:\n"
            "- Use **bold** for key terms and important steps.\n"
            "- Use numbered lists for step-by-step working.\n"
            "- Keep sentences short and clear.\n"
            f"- {lang_note}\n"
            "- Maximum 400 words.\n"
            "- Never say 'I cannot see the image' — always do your best "
            "with what is visible. Note any assumptions clearly."
        )

    return (
        "You are Elimi, ElimuAI's friendly and encouraging AI tutor "
        "for East African students.\n\n"
        f"{common_context}\n"
        "YOUR TASK — MARK THE STUDENT'S WORK:\n"
        "The student has taken a photo of their completed exercise and "
        "wants you to check their answers, give a mark, and explain "
        "mistakes.\n\n"
        "HOW TO RESPOND:\n"
        "1. Start with an encouraging opening that recognises their effort.\n"
        "2. Give an OVERALL SCORE as 'Score: X / Y correct'.\n"
        "3. Go through each answer one by one:\n"
        "   - CORRECT: Confirm the answer and briefly explain WHY.\n"
        "   - WRONG: State the correct answer, then explain WHERE they "
        "went wrong and HOW to get the right answer.\n"
        "   - PARTIALLY CORRECT: Credit what is right, correct what is wrong.\n"
        "4. Summarise the ONE main area of weakness and give a targeted tip.\n"
        "5. Close with encouragement and a concrete next step.\n\n"
        "FORMATTING:\n"
        "- Use the emojis \u2705 \u274C \u26A0\uFE0F for each answer.\n"
        "- Use **bold** for correct answers and key corrections.\n"
        "- Keep each question's explanation to 1\u20133 sentences.\n"
        f"- {lang_note}\n"
        "- Maximum 500 words.\n"
        "- Be constructive; never discouraging.\n"
        "- If handwriting is hard to read, make your best interpretation "
        "and state assumptions clearly."
    )


async def _stream_response(
    client: anthropic.Anthropic,
    body: PhotoScanIn,
    grade: str | None,
    curriculum: str | None,
    language: str,
) -> AsyncIterator[bytes]:
    system_prompt = _build_system_prompt(
        body.mode, body.subject, grade, curriculum, language,
    )
    meta = _meta_for(curriculum)
    verb = "explain and help me solve" if body.mode == "ask" else "mark and give feedback on"
    user_text = (
        f"Please {verb} the work shown in this photo. I am a "
        f"{grade or 'Grade 5'} student studying {body.subject} under the "
        f"{meta['full_name']}."
    )

    try:
        with client.messages.stream(
            model=settings.anthropic_model,
            max_tokens=_MAX_TOKENS,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": body.mime_type,
                                "data": body.image_b64,
                            },
                        },
                        {"type": "text", "text": user_text},
                    ],
                }
            ],
        ) as stream:
            for chunk in stream.text_stream:
                if chunk:
                    yield f"data: {json.dumps({'text': chunk})}\n\n".encode()
        yield b"data: [DONE]\n\n"

    except anthropic.BadRequestError as exc:
        log.warning("photoscan_bad_request", error=str(exc))
        msg = (
            "I could not read this image clearly. Please try retaking the "
            "photo in good lighting with the text fully visible."
        )
        yield f"data: {json.dumps({'text': msg})}\n\n".encode()
        yield b"data: [DONE]\n\n"

    except anthropic.APIError as exc:
        log.error("photoscan_api_error", error=str(exc))
        msg = "Something went wrong on our end. Please try again in a moment."
        yield f"data: {json.dumps({'text': msg})}\n\n".encode()
        yield b"data: [DONE]\n\n"


@router.post("/analyse")
async def analyse_photo(
    body: PhotoScanIn,
    principal=current_principal,
    sess: AsyncSession = Depends(get_session),
    client=Depends(get_anthropic),
):
    """Analyse a student photo and stream an SSE response.

    Streams ``data: {"text": "..."}\\n\\n`` events, terminating with
    ``data: [DONE]\\n\\n``.
    """
    if client is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI not configured")
    if body.mime_type not in _ALLOWED_MIME:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Only JPEG, PNG, WebP, or GIF images are supported.",
        )
    # base64 length ~= 4/3 * raw bytes
    approx_raw = int(len(body.image_b64) * 3 / 4)
    if approx_raw > _MAX_RAW_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "Image is too large (max 5MB). Please use a lower-resolution photo.",
        )

    user_id = uuid.UUID(principal.user_id)
    await _require_ai_access(sess, user_id)
    ctx = await _user_ctx(sess, user_id)
    grade = ctx.get("grade_level")
    curriculum = ctx.get("curriculum")
    language = ctx.get("language") or "en"

    # Award XP up-front (same pattern used by tutor/homework routes). We use
    # the ``homework`` reward for mark-mode and ``ai_question`` for ask-mode.
    await award_xp(sess, user_id, "homework" if body.mode == "mark" else "ai_question")

    return StreamingResponse(
        _stream_response(client, body, grade, curriculum, language),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/health")
async def photoscan_health():
    return {"status": "ok", "feature": "photo_scan", "version": "1.0.0"}
