const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { checkAiQuota, awardXP } = require('../services/progressService');
const logger = require('../config/logger');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const logAiError = (label, err) => {
  const details = {
    error: err?.message,
    name: err?.name,
    status: err?.status,
    code: err?.code,
    type: err?.type,
  };
  if (err?.response) {
    details.response_status = err.response.status || err.response.statusCode;
    details.response = err.response.data || err.response.body || err.response;
  }
  if (err?.error) details.sdk_error = err.error;
  if (err?.stack) details.stack = err.stack;
  logger.error(label, details);
};

// Language prompt fragments
const LANG = {
  en: {
    tutorIntro: 'You are ElimuAI, a friendly and encouraging AI tutor.',
    stepInstruct: 'Explain step-by-step in English. Use examples relevant to East Africa.',
    encourage: 'Always be encouraging and supportive.',
  },
  sw: {
    tutorIntro: 'Wewe ni ElimuAI, mwalimu wa AI mzuri na wa kusisimua.',
    stepInstruct: 'Eleza hatua kwa hatua kwa Kiswahili safi. Tumia mifano inayohusiana na Afrika Mashariki.',
    encourage: 'Daima kuwa wa kutia moyo na msaada.',
  },
};

const getCurriculumContext = (curriculum, country, gradeLevel) => {
  const ctx = {
    'CBC': `Kenya Competency Based Curriculum (CBC) for ${gradeLevel}. Focus on competencies, not rote learning. Reference KPSEA and Junior School Assessment standards.`,
    'NECTA': `Tanzania National Examinations Council curriculum for ${gradeLevel}. Follow TIE (Tanzania Institute of Education) 2023 revised syllabus. Reference PSLE/CSEE standards.`,
    'NCDC': `Uganda National Curriculum Development Centre (NCDC) revised 2020 curriculum for ${gradeLevel}. Reference PLE/UCE standards.`,
  };
  return ctx[curriculum] || ctx['CBC'];
};

// ─── POST /api/ai/tutor ──────────────────────────────────────────────────────
router.post('/tutor', authenticate, async (req, res) => {
  const { messages, subject, sessionId } = req.body;
  const user = req.user;
  const lang = user.language || 'en';
  const L = LANG[lang];

  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }
    if (!subject) return res.status(400).json({ error: 'Subject is required' });

    await checkAiQuota(user.id, user.plan);

    const curriculumCtx = getCurriculumContext(user.curriculum, user.country, user.grade_level);
    const systemPrompt = `${L.tutorIntro}
The student's currently selected subject is ${subject}, studying as ${user.grade_level} under ${curriculumCtx}
If the student asks about a different subject, help them anyway — NEVER refuse or say you are configured for only one subject.
${L.stepInstruct}
${L.encourage}
Never just give answers — teach the concept so the student understands WHY.
Keep responses concise and engaging. Use numbered steps for explanations.
${lang === 'sw' ? 'IMPORTANT: Respond entirely in Kiswahili.' : ''}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const reply = response.content[0]?.text || '';

    // Save session & award XP
    if (sessionId) {
      await db.query(
        'UPDATE ai_sessions SET messages = messages || $1::jsonb, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [JSON.stringify([...messages.slice(-1), { role: 'assistant', content: reply }]), sessionId, user.id]
      );
    } else {
      await db.query(
        'INSERT INTO ai_sessions (user_id, type, language, messages) VALUES ($1, $2, $3, $4)',
        [user.id, 'tutor', lang, JSON.stringify([...messages, { role: 'assistant', content: reply }])]
      );
    }

    const xpEarned = await awardXP(user.id, 'ai_question', 5);
    res.json({ reply, xpEarned });

  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      return res.status(402).json({ error: lang === 'sw' ? 'Kiwango chako kimeisha. Boresha mpango wako.' : 'Daily AI limit reached. Upgrade your plan.', upgrade: true });
    }
    logAiError('AI tutor error', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// ─── POST /api/ai/homework ───────────────────────────────────────────────────
router.post('/homework', authenticate, async (req, res) => {
  const { question, studentAnswer, mode, subject } = req.body;
  const user = req.user;
  const lang = user.language || 'en';

  try {
    await checkAiQuota(user.id, user.plan);
    const curriculumCtx = getCurriculumContext(user.curriculum, user.country, user.grade_level);

    const systemPrompt = lang === 'sw'
      ? `Wewe ni msaidizi wa kazi za nyumbani wa ElimuAI kwa wanafunzi wa ${user.grade_level} masomo ya ${subject} (${curriculumCtx}).
${mode === 'solve' ? 'Tatua tatizo hatua kwa hatua. Onyesha kazi yote. Eleza kila hatua kwa lugha rahisi. Malizia na ujumbe wa kutia moyo.' : 'Kagua jibu la mwanafunzi. Kwanza sifa kile kilichosahihi. Kisha eleza makosa kwa uwazi. Onyesha njia sahihi hatua kwa hatua.'}
JIBU KWA KISWAHILI KABISA.`
      : `You are ElimuAI homework helper for ${user.grade_level} ${subject} (${curriculumCtx}).
${mode === 'solve' ? 'Solve step-by-step showing ALL working. Explain each step simply. End with encouragement.' : 'Review the student answer. First praise what is correct. Then explain mistakes clearly. Show correct approach step-by-step.'}
Use simple language with East African context examples.`;

    const content = mode === 'solve'
      ? (lang === 'sw' ? `Swali: ${question}` : `Question: ${question}`)
      : (lang === 'sw' ? `Swali: ${question}\n\nJibu la mwanafunzi: ${studentAnswer}\n\nTafadhali kagua kazi yangu.`
                       : `Question: ${question}\n\nStudent's answer: ${studentAnswer}\n\nPlease check my work.`);

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    });

    const reply = response.content[0]?.text || '';
    const xpEarned = await awardXP(user.id, 'homework', 8);
    res.json({ reply, xpEarned });

  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') return res.status(402).json({ error: 'Quota exceeded', upgrade: true });
    logAiError('AI homework error', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// ─── POST /api/ai/generate-questions ─────────────────────────────────────────
router.post('/generate-questions', authenticate, async (req, res) => {
  const { paperId, subject, gradeLevel, year, count = 5 } = req.body;
  const user = req.user;
  const lang = user.language || 'en';

  try {
    const curriculumCtx = getCurriculumContext(user.curriculum, user.country, gradeLevel);
    const systemPrompt = `You are ElimuAI exam question generator for ${curriculumCtx}.
Generate exactly ${count} multiple-choice questions.
Return ONLY a valid JSON array, no markdown, no extra text:
[{"q":"question text","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"why A is correct${lang === 'sw' ? ' (in Kiswahili)' : ''}"}]
${lang === 'sw' ? 'Write all questions, options, and explanations in Kiswahili.' : ''}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate ${count} ${subject} exam questions for ${gradeLevel}, ${curriculumCtx} style, similar to ${year} past paper.` }],
    });

    const raw = response.content[0]?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(clean);
    res.json({ questions });

  } catch (err) {
    logAiError('Generate questions error', err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// ─── POST /api/ai/school-insights ────────────────────────────────────────────
router.post('/school-insights', authenticate, async (req, res) => {
  const { classData } = req.body;
  const lang = req.user.language || 'en';

  const systemPrompt = lang === 'sw'
    ? 'Wewe ni mshauri wa elimu wa ElimuAI. Toa mapendekezo 3 ya kufundisha yanayotekelezeka kulingana na data ya darasa. Jibu kwa Kiswahili.'
    : 'You are ElimuAI school analytics assistant. Provide 3 specific, actionable teaching recommendations based on class performance data. Be direct and practical.';

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Analyze class data and give recommendations: ${JSON.stringify(classData)}` }],
    });
    res.json({ insights: response.content[0]?.text || '' });
  } catch (err) {
    logAiError('School insights error', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// ─── POST /api/ai/photoscan/analyse ─────────────────────────────────────────
// Student photographs a question ("ask" mode) or their completed work
// ("mark" mode). The endpoint streams Claude's vision response back to
// the browser as Server-Sent Events (SSE) so the tutor bubble fills
// word-by-word, matching the existing chat UX.
const PHOTOSCAN_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PHOTOSCAN_MAX_RAW_BYTES = 5 * 1024 * 1024;

const buildPhotoscanSystemPrompt = ({ mode, subject, gradeLevel, curriculumCtx, country, lang }) => {
  const langNote = lang === 'sw'
    ? 'Jibu kwa Kiswahili, lakini tumia istilahi za Kiingereza za kihesabu/kisayansi zinapofafanua vizuri zaidi.'
    : "Respond primarily in English but weave in short Kiswahili phrases where they help (e.g. 'Hebu tujaribu' — Let us try this).";

  const commonContext = `STUDENT CONTEXT:
- Grade: ${gradeLevel || 'Grade 5'}
- Subject: ${subject || 'General'}
- Curriculum: ${curriculumCtx}
- Country: ${country || 'Kenya'}
`;

  if (mode === 'mark') {
    return `You are Elimi, ElimuAI's friendly and encouraging AI tutor for East African students.

${commonContext}
YOUR TASK — MARK THE STUDENT'S WORK:
The student has photographed their completed exercise and wants you to check their answers, give a mark, and explain any mistakes.

HOW TO RESPOND:
1. Start with an encouraging opening that recognises their effort.
2. Give an OVERALL SCORE as "Score: X / Y correct".
3. Go through each answer one by one:
   - CORRECT: Confirm the answer and briefly explain WHY.
   - WRONG: State the correct answer, then explain WHERE they went wrong and HOW to get it right.
   - PARTIALLY CORRECT: Credit what is right, correct what is wrong.
4. Summarise the ONE main weakness their mistakes show and give a targeted tip.
5. Close with encouragement and a specific next step.

FORMATTING:
- Use the emojis ✅ ❌ ⚠️ for each answer.
- Use **bold** for correct answers and key corrections.
- Keep each question's explanation to 1–3 sentences.
- ${langNote}
- Maximum 500 words. Be constructive, never discouraging.
- Never say "I cannot see the image" — always mark what is visible and note assumptions.`;
  }

  return `You are Elimi, ElimuAI's friendly and encouraging AI tutor for East African students.

${commonContext}
YOUR TASK — EXPLAIN THE QUESTION:
The student has photographed a question or textbook page and wants you to help them understand and solve it.

HOW TO RESPOND:
1. Restate what the question is asking in simple language.
2. Name the KEY CONCEPT this question is testing.
3. Walk through the solution STEP BY STEP. Number each step. Show all working.
4. Give a real-world example from ${country || 'East Africa'} where possible (market prices, farm measurements, distances).
5. End with a QUICK CHECK — one simple practice question.
6. Use encouraging language.

FORMATTING:
- Use **bold** for key terms and important steps.
- Use numbered lists for step-by-step working.
- Keep sentences short and clear.
- ${langNote}
- Maximum 400 words.
- Never say "I cannot see the image" — always do your best with what is visible and note assumptions clearly.`;
};

router.post('/photoscan/analyse', authenticate, async (req, res) => {
  const { image_b64: imageB64Snake, imageB64, mime_type: mimeSnake, mimeType, mode = 'ask', subject = 'General' } = req.body || {};
  const imageB64Value = imageB64 || imageB64Snake;
  const mimeTypeValue = mimeType || mimeSnake || 'image/jpeg';
  const user = req.user;
  const lang = user.language || 'en';

  if (!imageB64Value || typeof imageB64Value !== 'string' || imageB64Value.length < 32) {
    return res.status(400).json({ error: 'image_b64 is required' });
  }
  if (!PHOTOSCAN_ALLOWED_MIME.has(mimeTypeValue)) {
    return res.status(415).json({ error: 'Only JPEG, PNG, WebP, or GIF images are supported.' });
  }
  // base64 length ≈ 4/3 × raw bytes
  const approxRaw = Math.floor((imageB64Value.length * 3) / 4);
  if (approxRaw > PHOTOSCAN_MAX_RAW_BYTES) {
    return res.status(413).json({ error: 'Image is too large (max 5MB). Please use a lower-resolution photo.' });
  }
  if (mode !== 'ask' && mode !== 'mark') {
    return res.status(400).json({ error: 'mode must be "ask" or "mark"' });
  }

  try {
    await checkAiQuota(user.id, user.plan);
  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      return res.status(402).json({ error: lang === 'sw' ? 'Kiwango chako kimeisha. Boresha mpango wako.' : 'Daily AI limit reached. Upgrade your plan.', upgrade: true });
    }
    throw err;
  }

  const curriculumCtx = getCurriculumContext(user.curriculum, user.country, user.grade_level);
  const systemPrompt = buildPhotoscanSystemPrompt({
    mode,
    subject,
    gradeLevel: user.grade_level,
    curriculumCtx,
    country: user.country,
    lang,
  });
  const verb = mode === 'ask' ? 'explain and help me solve' : 'mark and give feedback on';
  const userText = `Please ${verb} the work shown in this photo. I am a ${user.grade_level || 'Grade 5'} student studying ${subject}.`;

  // SSE headers.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  try {
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeTypeValue, data: imageB64Value } },
            { type: 'text', text: userText },
          ],
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const text = event.delta.text;
        if (text) sendEvent({ text });
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Award XP after the response completes. Failures here should not
    // break the already-flushed response, so log and continue.
    awardXP(user.id, mode === 'mark' ? 'homework' : 'ai_question', mode === 'mark' ? 8 : 5)
      .catch((xpErr) => logger.error('photoscan_xp_failed', { error: xpErr?.message }));
  } catch (err) {
    logAiError('AI photoscan error', err);
    const friendly = err?.status === 400 || err?.name === 'BadRequestError'
      ? 'I could not read this image clearly. Please retake the photo in good lighting with the text fully visible.'
      : 'Something went wrong on our end. Please try again in a moment.';
    sendEvent({ text: friendly });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

router.get('/photoscan/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'photo_scan', version: '1.0.0' });
});

module.exports = router;
