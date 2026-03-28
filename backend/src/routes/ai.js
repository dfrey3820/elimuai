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
Currently tutoring: ${subject} for ${user.grade_level} under ${curriculumCtx}
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

module.exports = router;
