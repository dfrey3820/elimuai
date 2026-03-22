const db = require('../config/database');
const logger = require('../config/logger');

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;

const getLeaderboardColumns = async () => {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;
  try {
    const { rows } = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'leaderboard_entries'`
    );
    const set = new Set(rows.map(r => r.column_name));
    cached = {
      rank: set.has('rank'),
      streak: set.has('streak'),
      tests_taken: set.has('tests_taken'),
      avg_score: set.has('avg_score'),
      country: set.has('country'),
      scope_id: set.has('scope_id'),
    };
    cachedAt = now;
  } catch (err) {
    logger.warn('Failed to read leaderboard columns, using defaults:', err.message);
    cached = {
      rank: true,
      streak: true,
      tests_taken: true,
      avg_score: true,
      country: true,
      scope_id: true,
    };
    cachedAt = now;
  }
  return cached;
};

module.exports = { getLeaderboardColumns };
