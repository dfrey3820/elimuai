const db = require('../config/database');
const logger = require('../config/logger');

const PLAN_DAILY_LIMITS = { free: 5, student: 999, family: 999, school: 999, enterprise: 9999 };

const XP_REWARDS = {
  ai_question: 5, homework: 8, exam_complete: 20, exam_perfect: 50,
  streak_day: 10, lesson_read: 3, login: 2,
};

// ─── Check AI quota ───────────────────────────────────────────────────────────
const checkAiQuota = async (userId, plan) => {
  const limit = PLAN_DAILY_LIMITS[plan] || 5;
  if (limit >= 999) return true;
  const { rows } = await db.query(
    `SELECT COUNT(*) as count FROM ai_sessions 
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );
  if (parseInt(rows[0].count) >= limit) throw new Error('QUOTA_EXCEEDED');
  return true;
};

// ─── Award XP and update leaderboards ────────────────────────────────────────
const awardXP = async (userId, activity, customXp = null) => {
  const xp = customXp || XP_REWARDS[activity] || 5;
  try {
    // Update user total XP
    await db.query('UPDATE users SET total_xp = total_xp + $1 WHERE id = $2', [xp, userId]);

    // Log progress
    await db.query(
      'INSERT INTO progress_logs (user_id, activity_type, xp_earned) VALUES ($1, $2, $3)',
      [userId, activity, xp]
    );

    // Update leaderboard entries
    const periods = [
      { period: 'weekly',   period_key: getCurrentPeriodKey('weekly') },
      { period: 'monthly',  period_key: getCurrentPeriodKey('monthly') },
      { period: 'all_time', period_key: 'all' },
    ];

    const { rows: userRows } = await db.query('SELECT country, school_id FROM users WHERE id = $1', [userId]);
    const user = userRows[0];

    for (const { period, period_key } of periods) {
      const scopes = [{ scope: 'global', scope_id: null }];
      if (user?.country) scopes.push({ scope: 'country', scope_id: null, country: user.country });
      if (user?.school_id) scopes.push({ scope: 'school', scope_id: user.school_id });

      for (const { scope, scope_id } of scopes) {
        await db.query(`
          INSERT INTO leaderboard_entries (user_id, scope, scope_id, country, period, period_key, xp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, scope, scope_id, period, period_key)
          DO UPDATE SET xp = leaderboard_entries.xp + $7, updated_at = NOW()
        `, [userId, scope, scope_id, user?.country, period, period_key, xp]);
      }
    }

    // Check and award achievements
    await checkAchievements(userId, activity);
    return xp;
  } catch (err) {
    logger.error('Award XP error:', err.message);
    return 0;
  }
};

// ─── Update daily streak ──────────────────────────────────────────────────────
const updateStreak = async (userId) => {
  try {
    const { rows } = await db.query('SELECT streak_days, streak_last FROM users WHERE id = $1', [userId]);
    const { streak_days, streak_last } = rows[0] || {};
    const today = new Date().toDateString();
    const lastActive = streak_last ? new Date(streak_last).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let newStreak = streak_days || 0;
    if (lastActive === today) return newStreak;
    if (lastActive === yesterday) newStreak += 1;
    else newStreak = 1;

    await db.query('UPDATE users SET streak_days = $1, streak_last = CURRENT_DATE WHERE id = $2', [newStreak, userId]);
    await awardXP(userId, 'streak_day');

    // Update streak in leaderboard
    await db.query(`
      UPDATE leaderboard_entries SET streak = $1 WHERE user_id = $2 AND period = 'weekly'
    `, [newStreak, userId]);

    return newStreak;
  } catch (err) {
    logger.error('Streak update error:', err.message);
    return 0;
  }
};

// ─── Check and award achievements ────────────────────────────────────────────
const checkAchievements = async (userId, trigger) => {
  try {
    const { rows: user } = await db.query(
      `SELECT u.streak_days, u.total_xp,
         (SELECT COUNT(*) FROM ai_sessions WHERE user_id = u.id) as ai_count,
         (SELECT COUNT(*) FROM exam_attempts WHERE user_id = u.id AND completed = true) as exam_count,
         (SELECT MAX(percentage) FROM exam_attempts WHERE user_id = u.id) as max_score
       FROM users u WHERE u.id = $1`, [userId]
    );
    const stats = user[0];

    const { rows: allAchievements } = await db.query('SELECT * FROM achievements');
    const { rows: earned } = await db.query('SELECT achievement_id FROM user_achievements WHERE user_id = $1', [userId]);
    const earnedIds = new Set(earned.map(e => e.achievement_id));

    for (const ach of allAchievements) {
      if (earnedIds.has(ach.id)) continue;
      const c = ach.criteria;
      let qualifies = false;
      if (c.streak_days  && stats.streak_days  >= c.streak_days)  qualifies = true;
      if (c.ai_questions && stats.ai_count     >= c.ai_questions) qualifies = true;
      if (c.tests_completed && stats.exam_count >= c.tests_completed) qualifies = true;
      if (c.exam_score   && stats.max_score    >= c.exam_score)   qualifies = true;
      if (qualifies) {
        await db.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, ach.id]);
        await db.query('UPDATE users SET total_xp = total_xp + $1 WHERE id = $2', [ach.xp_reward, userId]);
        await db.query(
          `INSERT INTO notifications (user_id, type, title, title_sw, body, body_sw)
           VALUES ($1, 'achievement', $2, $3, $4, $5)`,
          [userId, `Achievement Unlocked: ${ach.name}`, `Mafanikio Mapya: ${ach.name_sw || ach.name}`,
           ach.description, ach.desc_sw || ach.description]
        );
      }
    }
  } catch (err) {
    logger.error('Achievement check error:', err.message);
  }
};

const getCurrentPeriodKey = (period) => {
  const now = new Date();
  if (period === 'weekly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (period === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return 'all';
};

module.exports = { checkAiQuota, awardXP, updateStreak, checkAchievements };
