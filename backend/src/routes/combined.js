// ── users.js ──────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const usersRouter = express.Router();

usersRouter.get('/profile', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id,name,email,phone,role,plan,plan_expires,country,language,grade_level,curriculum,avatar_url,streak_days,total_xp,school_id FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

usersRouter.patch('/profile', authenticate, async (req, res) => {
  const allowed = ['name','language','grade_level','curriculum','avatar_url'];
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'No valid fields' });
  const setClauses = updates.map(([k], i) => `${k}=$${i+2}`).join(',');
  const values = [req.user.id, ...updates.map(([,v]) => v)];
  const { rows } = await db.query(`UPDATE users SET ${setClauses},updated_at=NOW() WHERE id=$1 RETURNING id,name,language,grade_level,curriculum`, values);
  res.json({ user: rows[0] });
});

usersRouter.get('/children', authenticate, requireRole('parent'), async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id,u.name,u.grade_level,u.streak_days,u.total_xp,u.last_login,
     (SELECT COUNT(*) FROM progress_logs WHERE user_id=u.id AND logged_date=CURRENT_DATE) as today_sessions
     FROM parent_children pc JOIN users u ON u.id=pc.child_id WHERE pc.parent_id=$1`,
    [req.user.id]
  );
  res.json({ children: rows });
});

// ── schools.js ────────────────────────────────────────────────────────────────
const schoolsRouter = express.Router();

schoolsRouter.get('/:id/stats', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.*,
     (SELECT COUNT(*) FROM users WHERE school_id=s.id AND role='student') as student_count,
     (SELECT COUNT(*) FROM users WHERE school_id=s.id AND role='teacher') as teacher_count,
     (SELECT AVG(p.score) FROM progress_logs p JOIN users u ON u.id=p.user_id WHERE u.school_id=s.id AND p.score IS NOT NULL) as avg_score
     FROM schools s WHERE s.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'School not found' });
  res.json({ school: rows[0] });
});

schoolsRouter.get('/:id/students', authenticate, requireRole('teacher','admin','super_admin'), async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id,u.name,u.grade_level,u.streak_days,u.total_xp,u.last_login,u.plan,
     (SELECT AVG(score) FROM progress_logs WHERE user_id=u.id AND score IS NOT NULL) as avg_score
     FROM users u WHERE u.school_id=$1 AND u.role='student' ORDER BY u.name`,
    [req.params.id]
  );
  res.json({ students: rows });
});

// ── exams.js ──────────────────────────────────────────────────────────────────
const examsRouter = express.Router();

examsRouter.get('/papers', authenticate, async (req, res) => {
  const { country, curriculum, level } = req.query;
  const { rows } = await db.query(
    `SELECT pp.*, s.name as subject_name FROM past_papers pp
     LEFT JOIN subjects s ON s.id=pp.subject_id
     WHERE ($1::text IS NULL OR pp.country=$1::country_code)
     AND ($2::text IS NULL OR pp.curriculum=$2)
     AND ($3::text IS NULL OR pp.grade_level=$3)
     AND pp.is_active=TRUE ORDER BY pp.year DESC`,
    [country||null, curriculum||null, level||null]
  );
  res.json({ papers: rows });
});

examsRouter.post('/attempts', authenticate, async (req, res) => {
  const { pastPaperId, questions, answers, score, total, timeTakenSecs } = req.body;
  const pct = Math.round(score/total*100);
  const xp = pct >= 100 ? 50 : pct >= 70 ? 20 : 10;
  const { rows } = await db.query(
    `INSERT INTO exam_attempts (user_id,past_paper_id,questions,answers,score,total,percentage,time_taken_secs,completed,xp_earned,completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,NOW()) RETURNING id`,
    [req.user.id, pastPaperId||null, JSON.stringify(questions), JSON.stringify(answers), score, total, pct, timeTakenSecs||0, xp]
  );
  const { awardXP } = require('../services/progressService');
  await awardXP(req.user.id, 'exam_complete', xp);
  res.json({ attemptId: rows[0].id, xpEarned: xp, percentage: pct });
});

examsRouter.get('/history', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT ea.*,pp.title as paper_title FROM exam_attempts ea
     LEFT JOIN past_papers pp ON pp.id=ea.past_paper_id
     WHERE ea.user_id=$1 ORDER BY ea.created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json({ attempts: rows });
});

// ── reports.js ────────────────────────────────────────────────────────────────
const reportsRouter = express.Router();

reportsRouter.get('/weekly', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM weekly_reports WHERE student_id=$1 ORDER BY week_start DESC LIMIT 10',
    [req.user.id]
  );
  res.json({ reports: rows });
});

reportsRouter.get('/school/:schoolId', authenticate, requireRole('teacher','admin','super_admin'), async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.name,u.grade_level,
     AVG(p.score) FILTER (WHERE p.score IS NOT NULL) as avg_score,
     COUNT(DISTINCT p.logged_date) as active_days,
     SUM(p.duration_mins) as total_mins,
     SUM(p.xp_earned) as total_xp
     FROM users u LEFT JOIN progress_logs p ON p.user_id=u.id
     WHERE u.school_id=$1 AND u.role='student'
     GROUP BY u.id,u.name,u.grade_level ORDER BY avg_score DESC NULLS LAST`,
    [req.params.schoolId]
  );
  res.json({ report: rows });
});

// ── curriculum.js ─────────────────────────────────────────────────────────────
const curriculumRouter = express.Router();

curriculumRouter.get('/subjects', authenticate, async (req, res) => {
  const { country, curriculum, level } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM subjects WHERE
     ($1::text IS NULL OR country=$1::country_code)
     AND ($2::text IS NULL OR curriculum=$2)
     AND ($3::text IS NULL OR grade_level=$3)
     ORDER BY name`,
    [country||null, curriculum||null, level||null]
  );
  res.json({ subjects: rows });
});

curriculumRouter.get('/offline-lessons', async (req, res) => {
  const { level, curriculum, lang } = req.query;
  const { rows } = await db.query(
    `SELECT id, title, title_sw, content, content_sw, grade_level, subject_id
     FROM offline_lessons WHERE is_active=TRUE
     AND ($1::text IS NULL OR grade_level=$1)
     AND ($2::text IS NULL OR curriculum=$2)
     ORDER BY order_index`,
    [level||null, curriculum||null]
  );
  const lessons = rows.map(r => ({
    id: r.id, gradeLevel: r.grade_level, subjectId: r.subject_id,
    title: lang === 'sw' ? (r.title_sw || r.title) : r.title,
    content: lang === 'sw' ? (r.content_sw || r.content) : r.content,
  }));
  res.json({ lessons });
});

module.exports = { usersRouter, schoolsRouter, examsRouter, reportsRouter, curriculumRouter };
