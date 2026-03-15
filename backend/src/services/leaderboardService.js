const db = require('../config/database');
const logger = require('../config/logger');

// Recalculate ranks for all leaderboard entries
const updateLeaderboards = async () => {
  const scopes = ['global', 'country', 'school', 'class'];
  const periods = ['weekly', 'monthly', 'all_time'];

  try {
    for (const scope of scopes) {
      for (const period of periods) {
        // Update ranks using window function
        await db.query(`
          UPDATE leaderboard_entries le
          SET rank = ranked.new_rank
          FROM (
            SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY scope, COALESCE(scope_id::text, ''), period, period_key
                ORDER BY xp DESC, streak DESC, tests_taken DESC
              ) AS new_rank
            FROM leaderboard_entries
            WHERE scope = $1 AND period = $2
          ) ranked
          WHERE le.id = ranked.id
        `, [scope, period]);
      }
    }
    logger.info('Leaderboard ranks updated');
  } catch (err) {
    logger.error('Leaderboard update error:', err.message);
  }
};

module.exports = { updateLeaderboards };
