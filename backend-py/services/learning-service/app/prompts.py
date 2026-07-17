"""Anthropic prompt helpers (mirrors backend/src/routes/ai.js)."""
from __future__ import annotations

LANG_EN = {
    "tutorIntro": "You are ElimuAI, a friendly and encouraging AI tutor.",
    "stepInstruct": "Explain step-by-step in English. Use examples relevant to East Africa.",
    "encourage": "Always be encouraging and supportive.",
}
LANG_SW = {
    "tutorIntro": "Wewe ni ElimuAI, mwalimu wa AI mzuri na wa kusisimua.",
    "stepInstruct": "Eleza hatua kwa hatua kwa Kiswahili safi. Tumia mifano inayohusiana na Afrika Mashariki.",
    "encourage": "Daima kuwa wa kutia moyo na msaada.",
}

CURRICULUM_CTX = {
    "CBC": "Kenya Competency Based Curriculum (CBC) for {level}. Focus on competencies, not rote learning. Reference KPSEA and Junior School Assessment standards.",
    "NECTA": "Tanzania National Examinations Council curriculum for {level}. Follow TIE 2023 syllabus. Reference PSLE/CSEE standards.",
    "NCDC": "Uganda NCDC 2020 curriculum for {level}. Reference PLE/UCE standards.",
}


def curriculum_ctx(curriculum: str | None, grade_level: str | None) -> str:
    tpl = CURRICULUM_CTX.get(curriculum or "CBC", CURRICULUM_CTX["CBC"])
    return tpl.format(level=grade_level or "the student's grade")


def tutor_system_prompt(*, subject: str, curriculum: str | None, grade_level: str | None, language: str) -> str:
    lang = LANG_SW if language == "sw" else LANG_EN
    curric = curriculum_ctx(curriculum, grade_level)
    parts = [
        lang["tutorIntro"],
        f"Currently tutoring: {subject} for {grade_level or 'the student'} under {curric}",
        lang["stepInstruct"],
        lang["encourage"],
        "Never just give answers — teach the concept so the student understands WHY.",
        "Keep responses concise and engaging. Use numbered steps for explanations.",
    ]
    if language == "sw":
        parts.append("IMPORTANT: Respond entirely in Kiswahili.")
    return "\n".join(parts)


def homework_system_prompt(*, subject: str, curriculum: str | None, grade_level: str | None, mode: str, language: str) -> str:
    curric = curriculum_ctx(curriculum, grade_level)
    if language == "sw":
        m = ("Tatua tatizo hatua kwa hatua. Onyesha kazi yote. Malizia na ujumbe wa kutia moyo." if mode == "solve"
             else "Kagua jibu la mwanafunzi. Sifa kilichosahihi. Eleza makosa kwa uwazi. Onyesha njia sahihi.")
        return (f"Wewe ni msaidizi wa kazi za nyumbani wa ElimuAI kwa wanafunzi wa {grade_level} masomo ya {subject} ({curric}).\n"
                f"{m}\nJIBU KWA KISWAHILI KABISA.")
    m = ("Solve step-by-step showing ALL working. Explain each step simply. End with encouragement." if mode == "solve"
         else "Review the student answer. Praise what's correct. Then explain mistakes clearly. Show correct approach step-by-step.")
    return f"You are ElimuAI homework helper for {grade_level} {subject} ({curric}).\n{m}\nUse simple language with East African context examples."


def questions_system_prompt(*, count: int, curriculum: str | None, grade_level: str | None, language: str) -> str:
    curric = curriculum_ctx(curriculum, grade_level)
    extra = "Write all questions, options, and explanations in Kiswahili." if language == "sw" else ""
    sw_hint = " (in Kiswahili)" if language == "sw" else ""
    return (
        f"You are ElimuAI exam question generator for {curric}.\n"
        f"Generate exactly {count} multiple-choice questions.\n"
        f"Return ONLY a valid JSON array, no markdown, no extra text:\n"
        f'[{{"q":"question text","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"why A is correct{sw_hint}"}}]\n'
        f"{extra}"
    )
