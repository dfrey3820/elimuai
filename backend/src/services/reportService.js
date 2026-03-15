const db = require('../config/database');
const { sendSMS } = require('./smsService');
const logger = require('../config/logger');

// ─── Send Weekly Parent Reports ───────────────────────────────────────────────
const sendWeeklyReports = async () => {
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();

  try {
    // Get all active student-parent pairs
    const { rows: pairs } = await db.query(`
      SELECT 
        pc.child_id AS student_id,
        pc.parent_id,
        u_child.name AS student_name,
        u_child.language,
        u_parent.phone AS parent_phone,
        u_parent.email AS parent_email,
        u_child.streak_days,
        u_child.total_xp
      FROM parent_children pc
      JOIN users u_child ON u_child.id = pc.child_id
      JOIN users u_parent ON u_parent.id = pc.parent_id
      WHERE u_child.is_active = TRUE
    `);

    for (const pair of pairs) {
      try {
        // Get weekly progress
        const { rows: progress } = await db.query(`
          SELECT 
            SUM(duration_mins) as total_mins,
            SUM(xp_earned) as total_xp,
            COUNT(*) as sessions,
            AVG(score) FILTER (WHERE score IS NOT NULL) as avg_score
          FROM progress_logs
          WHERE user_id = $1 AND logged_date >= $2
        `, [pair.student_id, weekStart.toISOString().split('T')[0]]);

        const stats = progress[0] || {};
        const isSw = pair.language === 'sw';
        const avgScore = stats.avg_score ? Math.round(stats.avg_score) : 0;
        const totalMins = stats.total_mins || 0;

        const message = isSw
          ? `📊 ElimuAI Ripoti ya Wiki - ${pair.student_name}\n✅ Muda wa kujifunza: ${totalMins} dakika\n📝 Alama ya wastani: ${avgScore}%\n🔥 Msururu: ${pair.streak_days} siku\n⭐ XP iliyopatikana: ${stats.total_xp || 0}\nEndelea kujifunza! elimuai.africa`
          : `📊 ElimuAI Weekly Report - ${pair.student_name}\n✅ Study time: ${totalMins} mins\n📝 Avg score: ${avgScore}%\n🔥 Streak: ${pair.streak_days} days\n⭐ XP earned: ${stats.total_xp || 0}\nKeep it up! elimuai.africa`;

        if (pair.parent_phone) {
          await sendSMS(pair.parent_phone, message);
        }

        // Save report
        await db.query(`
          INSERT INTO weekly_reports (student_id, parent_id, week_start, week_end, streak_days, total_xp, sent_sms)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [pair.student_id, pair.parent_id, weekStart, weekEnd, pair.streak_days, stats.total_xp || 0, !!pair.parent_phone]);

        logger.info(`Weekly report sent for student ${pair.student_id}`);
      } catch (err) {
        logger.error(`Report failed for ${pair.student_id}:`, err.message);
      }
    }
    logger.info(`Weekly reports complete: ${pairs.length} sent`);
  } catch (err) {
    logger.error('sendWeeklyReports failed:', err.message);
  }
};

module.exports = { sendWeeklyReports };
