const express = require('express');
const db = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Get current period keys
const getPeriodKey = (period) => {
  const now = new Date();
  if (period === 'weekly') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (period === 'monthly') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return 'all';
};

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────
// Query: ?scope=global|country|school|class&period=weekly|monthly|all_time&limit=50
router.get('/', optionalAuth, async (req, res) => {
  const { scope = 'global', period = 'weekly', limit = 50, scopeId } = req.query;
  const periodKey = getPeriodKey(period);
  const user = req.user;

  try {
    let query = `
      SELECT 
        le.rank,
        le.xp,
        le.streak,
        le.tests_taken,
        le.avg_score,
        u.id,
        u.name,
        u.avatar_url,
        u.country,
        u.grade_level,
        u.school_id,
        s.name AS school_name,
        CASE WHEN u.id = $1 THEN true ELSE false END AS is_current_user
      FROM leaderboard_entries le
      JOIN users u ON u.id = le.user_id
      LEFT JOIN schools s ON s.id = u.school_id
      WHERE le.scope = $2 
        AND le.period = $3 
        AND le.period_key = $4
        ${scope === 'country' && user ? "AND le.country = $5" : ''}
        ${scope === 'school' && scopeId ? "AND le.scope_id = $5" : ''}
        ${scope === 'class' && scopeId ? "AND le.scope_id = $5" : ''}
      ORDER BY le.xp DESC, le.streak DESC
      LIMIT $${scope !== 'global' ? '6' : '5'}
    `;

    const params = [user?.id || null, scope, period, periodKey];
    if (scope !== 'global' && (user?.country || scopeId)) params.push(scopeId || user?.country);
    params.push(parseInt(limit));

    const { rows } = await db.query(query, params);

    // Get current user's rank if authenticated
    let userRank = null;
    if (user) {
      const rankResult = await db.query(
        `SELECT rank, xp, streak FROM leaderboard_entries 
         WHERE user_id = $1 AND scope = $2 AND period = $3 AND period_key = $4`,
        [user.id, scope, period, periodKey]
      );
      userRank = rankResult.rows[0] || null;
    }

    res.json({
      leaderboard: rows,
      userRank,
      scope,
      period,
      periodKey,
      totalEntries: rows.length,
    });

  } catch (err) {
    logger.error('Leaderboard fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ─── GET /api/leaderboard/my-ranks ───────────────────────────────────────────
router.get('/my-ranks', authenticate, async (req, res) => {
  const user = req.user;
  const periods = ['weekly', 'monthly', 'all_time'];
  const scopes = ['global', 'country', 'school'];
  const results = {};

  try {
    for (const period of periods) {
      results[period] = {};
      const periodKey = getPeriodKey(period);
      for (const scope of scopes) {
        const { rows } = await db.query(
          `SELECT rank, xp, streak, tests_taken, avg_score FROM leaderboard_entries
           WHERE user_id = $1 AND scope = $2 AND period = $3 AND period_key = $4`,
          [user.id, scope, period, periodKey]
        );
        results[period][scope] = rows[0] || { rank: null, xp: 0 };
      }
    }
    res.json({ ranks: results });
  } catch (err) {
    logger.error('My ranks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch your rankings' });
  }
});

module.exports = router;
