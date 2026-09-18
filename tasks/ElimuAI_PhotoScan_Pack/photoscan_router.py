# ============================================================
# ElimuAI Photo Scan — FastAPI Backend
# app/routers/photoscan_router.py
#
# POST /api/photoscan/analyse
#   Receives a base64 image + mode + student context
#   Sends to Claude vision API with CBC-aware prompt
#   Streams SSE response back to the React frontend
# ============================================================

import anthropic
import base64
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum

router = APIRouter(prefix="/api/photoscan", tags=["photoscan"])

# ── Anthropic client (uses ANTHROPIC_API_KEY from env) ──
client = anthropic.Anthropic()


# ── Request schema ───────────────────────────────────────
class PhotoScanRequest(BaseModel):
    image_b64: str                         # Base64-encoded image (no data: prefix)
    mime_type: str = "image/jpeg"          # image/jpeg | image/png | image/webp
    mode: Literal["ask", "mark"] = "ask"  # ask = explain, mark = grade work
    grade: str = "Grade 5"
    curriculum: Literal["CBC", "TIE", "NCDC"] = "CBC"
    subject: str = "Mathematics"
    language: Literal["English", "Kiswahili"] = "English"


# ── Curriculum metadata ──────────────────────────────────
CURRICULUM_META = {
    "CBC": {
        "full_name": "Kenya Competency Based Curriculum (CBC)",
        "exams": "KPSEA (Grade 6) and KCSE (Grade 9 / Form 4)",
        "country": "Kenya",
        "regulator": "Kenya Institute of Curriculum Development (KICD)",
        "grades": "Pre-Primary 1 (PP1) to Grade 9",
        "key_note": "CBC emphasises competency demonstration over rote memorisation. Answers should be framed in terms of what the student can DO, not just what they know.",
    },
    "TIE": {
        "full_name": "Tanzania Institute of Education Curriculum (TIE 2023)",
        "exams": "PSLE (Primary School Leaving Examination) and CSEE (Certificate of Secondary Education Examination)",
        "country": "Tanzania",
        "regulator": "Tanzania Institute of Education (TIE)",
        "grades": "Standard 1 to Form 4",
        "key_note": "TIE 2023 curriculum is outcome-based. Answers should connect to real-world Tanzanian contexts where possible.",
    },
    "NCDC": {
        "full_name": "Uganda National Curriculum Development Centre Curriculum (NCDC 2020)",
        "exams": "PLE (Primary Leaving Examination) and UCE (Uganda Certificate of Education)",
        "country": "Uganda",
        "regulator": "National Curriculum Development Centre (NCDC)",
        "grades": "Primary 1 to Senior 4",
        "key_note": "NCDC 2020 curriculum is thematic and learner-centred. Connect answers to Ugandan contexts and real-life applications.",
    },
}


# ── System prompts ────────────────────────────────────────
def build_system_prompt(req: PhotoScanRequest) -> str:
    meta = CURRICULUM_META.get(req.curriculum, CURRICULUM_META["CBC"])
    lang_note = (
        "Respond primarily in English, but use Kiswahili phrases where helpful to aid understanding (e.g. 'Hebu tujaribu' — Let us try this). "
        if req.language == "English"
        else "Respond primarily in Kiswahili, but use English mathematical/scientific terms where they are more precise."
    )

    if req.mode == "ask":
        return f"""You are Elimi, ElimuAI's friendly and encouraging AI tutor for East African students.

STUDENT CONTEXT:
- Grade: {req.grade}
- Curriculum: {meta['full_name']}
- Subject: {req.subject}
- Country: {meta['country']}
- Relevant exams: {meta['exams']}
- Curriculum note: {meta['key_note']}

YOUR TASK — EXPLAIN THE QUESTION:
The student has taken a photo of a question or textbook page and wants you to help them understand and solve it.

HOW TO RESPOND:
1. Start by clearly restating what the question is asking, in simple language the student will understand.
2. Identify the KEY CONCEPT or TOPIC this question is testing (e.g. "This is testing your understanding of fractions").
3. Walk through the solution STEP BY STEP. Number each step clearly. Show all working.
4. Where relevant, give a REAL-WORLD EXAMPLE from {meta['country']} to make the concept concrete (e.g. market prices, farm measurements, distances between towns).
5. End with a QUICK CHECK — give the student one simple practice question to test their understanding. Keep it shorter and simpler than the original.
6. Use encouraging language. This student is learning, not being examined.

FORMATTING RULES:
- Use **bold** for key terms and important steps
- Use numbered lists for step-by-step working
- Keep sentences short and clear
- {lang_note}
- Maximum response: 400 words. Be thorough but not overwhelming.
- Never say "I cannot see the image" — always do your best with what is visible.

IMPORTANT: If the image is blurry or partially unclear, work with what you can see and note any assumptions you are making."""

    else:  # mode == "mark"
        return f"""You are Elimi, ElimuAI's friendly and encouraging AI tutor for East African students.

STUDENT CONTEXT:
- Grade: {req.grade}
- Curriculum: {meta['full_name']}
- Subject: {req.subject}
- Country: {meta['country']}
- Relevant exams: {meta['exams']}
- Curriculum note: {meta['key_note']}

YOUR TASK — MARK THE STUDENT'S WORK:
The student has taken a photo of their completed exercise or homework and wants you to check their answers, give a mark, and explain any mistakes.

HOW TO RESPOND:
1. START with an encouraging opening — recognise their effort.
2. Give an OVERALL SCORE in format: "Score: X / Y correct" (or estimate if questions are not numbered).
3. Go through each answer ONE BY ONE:
   - ✅ CORRECT: Confirm the answer is right and briefly explain WHY it is correct.
   - ❌ WRONG: State what the correct answer is, then explain step by step WHERE they went wrong and HOW to get the right answer.
   - ⚠️ PARTIALLY CORRECT: Credit what is right, then correct what is wrong.
4. END with a SUMMARY: identify the ONE main area of weakness shown by their mistakes (e.g. "You are mixing up multiplication and division of fractions"). Give a targeted tip to address it.
5. Close with encouragement and a specific next step (e.g. "Try questions 5–8 on page 47 of your textbook to practise this skill").

FORMATTING RULES:
- Use ✅ ❌ ⚠️ emojis clearly for each answer
- Use **bold** for correct answers and key corrections
- Keep explanations for each question brief — 1–3 sentences
- {lang_note}
- Maximum response: 500 words.
- Be constructive and never discouraging. Mistakes are part of learning.
- Never say "I cannot see the image" — always mark what is visible and note any unreadable parts.

IMPORTANT: If handwriting is difficult to read, make your best interpretation and state any assumptions clearly."""


# ── SSE streaming helper ──────────────────────────────────
async def stream_photoscan(req: PhotoScanRequest):
    """Stream Claude's response as SSE events."""
    system_prompt = build_system_prompt(req)
    meta = CURRICULUM_META.get(req.curriculum, CURRICULUM_META["CBC"])

    # Validate mime type
    allowed_mimes = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if req.mime_type not in allowed_mimes:
        yield f"data: {json.dumps({'text': 'Sorry — only JPEG, PNG, WebP, and GIF images are supported.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Map mime_type to Anthropic media type
    media_type_map = {
        "image/jpeg": "image/jpeg",
        "image/png": "image/png",
        "image/webp": "image/webp",
        "image/gif": "image/gif",
    }
    media_type = media_type_map[req.mime_type]

    user_message = (
        f"Please {'explain and help me solve' if req.mode == 'ask' else 'mark and give feedback on'} "
        f"the work shown in this photo. I am a {req.grade} student studying {req.subject} "
        f"under the {meta['full_name']}."
    )

    try:
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": req.image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": user_message,
                        },
                    ],
                }
            ],
        ) as stream:
            for text_chunk in stream.text_stream:
                yield f"data: {json.dumps({'text': text_chunk})}\n\n"

        yield "data: [DONE]\n\n"

    except anthropic.BadRequestError as e:
        # Image could not be processed
        error_msg = "I could not read this image clearly. Please try retaking the photo in good lighting with the text fully visible."
        yield f"data: {json.dumps({'text': error_msg})}\n\n"
        yield "data: [DONE]\n\n"

    except anthropic.APIError as e:
        error_msg = f"Something went wrong on our end. Please try again in a moment. ({str(e)[:80]})"
        yield f"data: {json.dumps({'text': error_msg})}\n\n"
        yield "data: [DONE]\n\n"


# ── Route ─────────────────────────────────────────────────
@router.post("/analyse")
async def analyse_photo(req: PhotoScanRequest):
    """
    Analyse a student's photo and stream back an SSE response.

    - mode="ask"  → explain the question and walk through the solution
    - mode="mark" → mark the completed work and give corrective feedback

    Returns: text/event-stream (SSE)
    Each event: data: {"text": "..."}\n\n
    Final event: data: [DONE]\n\n
    """
    # Basic validation
    if not req.image_b64:
        raise HTTPException(status_code=400, detail="image_b64 is required")

    # Check approximate image size (base64 ~ 1.37x raw; limit to ~5MB raw)
    approx_raw_bytes = len(req.image_b64) * 3 / 4
    if approx_raw_bytes > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image is too large. Please use a photo under 5MB. Try reducing your camera resolution."
        )

    return StreamingResponse(
        stream_photoscan(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable Nginx buffering for SSE
        },
    )


# ── Health check ──────────────────────────────────────────
@router.get("/health")
async def photoscan_health():
    return {"status": "ok", "feature": "photo_scan", "version": "1.0.0"}
