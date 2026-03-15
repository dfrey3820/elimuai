const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { updateStreak, awardXP } = require('../services/progressService');
const router = express.Router();

// GET /api/progress/summary
router.get('/summary', authenticate, async (req, res) => {
  const uid = req.user.id;
  try {
    const [streakRes, xpRes, subjectRes, logsRes] = await Promise.all([
      db.query('SELECT streak_days, total_xp FROM users WHERE id=$1', [uid]),
      db.query('SELECT SUM(xp_earned) as week_xp, SUM(duration_mins) as week_mins FROM progress_logs WHERE user_id=$1 AND logged_date >= NOW()-INTERVAL\'7 days\'', [uid]),
      db.query('SELECT s.name, ss.avg_score, ss.attempts FROM subject_scores ss JOIN subjects s ON s.id=ss.subject_id WHERE ss.user_id=$1 ORDER BY ss.avg_score DESC', [uid]),
      db.query('SELECT activity_type, xp_earned, score, logged_date FROM progress_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [uid]),
    ]);
    res.json({
      streak: streakRes.rows[0]?.streak_days || 0,
      totalXp: streakRes.rows[0]?.total_xp || 0,
      weekXp: xpRes.rows[0]?.week_xp || 0,
      weekMins: xpRes.rows[0]?.week_mins || 0,
      subjects: subjectRes.rows,
      recentActivity: logsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /api/progress/log — log any activity
router.post('/log', authenticate, async (req, res) => {
  const { activityType, subjectId, score, durationMins } = req.body;
  const uid = req.user.id;
  try {
    const streak = await updateStreak(uid);
    const xp = await awardXP(uid, activityType);
    await db.query(
      'INSERT INTO progress_logs (user_id, subject_id, activity_type, score, duration_mins, xp_earned) VALUES ($1,$2,$3,$4,$5,$6)',
      [uid, subjectId||null, activityType, score||null, durationMins||0, xp]
    );
    if (subjectId && score != null) {
      await db.query(`
        INSERT INTO subject_scores (user_id, subject_id, avg_score, attempts)
        VALUES ($1,$2,$3,1)
        ON CONFLICT (user_id, subject_id) DO UPDATE SET
          avg_score = (subject_scores.avg_score * subject_scores.attempts + $3) / (subject_scores.attempts + 1),
          attempts = subject_scores.attempts + 1,
          last_updated = NOW()
      `, [uid, subjectId, score]);
    }
    res.json({ xpEarned: xp, streak });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log progress' });
  }
});

// GET /api/progress/achievements
router.get('/achievements', authenticate, async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, ua.earned_at FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id=a.id AND ua.user_id=$1
    ORDER BY ua.earned_at DESC NULLS LAST
  `, [req.user.id]);
  res.json({ achievements: rows });
});

// GET /api/progress/notifications
router.get('/notifications', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json({ notifications: rows });
});

module.exports = router;
