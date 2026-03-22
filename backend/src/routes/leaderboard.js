const express = require('express');
const db = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const logger = require('../config/logger');
const { getLeaderboardColumns } = require('../services/leaderboardColumns');

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
    const cols = await getLeaderboardColumns();
    const redis = req.app?.locals?.redis;
    const scopeKey = scopeId || user?.country || 'all';
    const cacheKey = `lb:${scope}:${period}:${periodKey}:${scopeKey}:${limit}:${user?.id || 'anon'}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const params = [user?.id || null, scope, period, periodKey];
    let paramIndex = params.length + 1;
    const filters = [];

    if (scope === 'country') {
      const country = scopeId || user?.country;
      if (country && cols.country) {
        filters.push(`AND le.country = $${paramIndex}`);
        params.push(country);
        paramIndex += 1;
      } else if (country && !cols.country) {
        logger.warn('leaderboard_entries.country missing; skipping country filter');
      }
    } else if (scope === 'school' || scope === 'class') {
      if (scopeId && cols.scope_id) {
        filters.push(`AND le.scope_id = $${paramIndex}`);
        params.push(scopeId);
        paramIndex += 1;
      } else if (scopeId && !cols.scope_id) {
        logger.warn('leaderboard_entries.scope_id missing; skipping scope filter');
      }
    }

    const limitParam = `$${paramIndex}`;
    params.push(parseInt(limit));

    const rankCol = cols.rank ? 'le.rank' : 'NULL::int as rank';
    const streakCol = cols.streak ? 'le.streak' : '0::int as streak';
    const testsCol = cols.tests_taken ? 'le.tests_taken' : '0::int as tests_taken';
    const avgCol = cols.avg_score ? 'le.avg_score' : '0::numeric as avg_score';

    const query = `
      SELECT 
        ${rankCol},
        le.xp,
        ${streakCol},
        ${testsCol},
        ${avgCol},
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
        ${filters.join('\n')}
      ORDER BY le.xp DESC, le.streak DESC
      LIMIT ${limitParam}
    `;

    const { rows } = await db.query(query, params);

    // Get current user's rank if authenticated
    let userRank = null;
    if (user) {
      const userRankCols = [
        cols.rank ? 'rank' : 'NULL::int as rank',
        'xp',
        cols.streak ? 'streak' : '0::int as streak',
      ].join(', ');
      const rankResult = await db.query(
        `SELECT ${userRankCols} FROM leaderboard_entries 
         WHERE user_id = $1 AND scope = $2 AND period = $3 AND period_key = $4`,
        [user.id, scope, period, periodKey]
      );
      userRank = rankResult.rows[0] || null;
    }

    const payload = {
      leaderboard: rows,
      userRank,
      scope,
      period,
      periodKey,
      totalEntries: rows.length,
    };

    if (redis) await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 });
    res.json(payload);

  } catch (err) {
    logger.error('Leaderboard fetch error', { error: err.message, stack: err.stack });
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
