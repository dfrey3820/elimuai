const db = require('../config/database');
const { sendExpiryWarning, sendUpgradeNudge } = require('./emailService');
const { sendSMS } = require('./smsService');
const logger = require('../config/logger');

// Notification windows: 7 days, 3 days, 1 day before expiry, and on expiry day
const WARN_DAYS = [7, 3, 1, 0];

/**
 * Check for expiring subscriptions and send email + SMS notifications.
 * Tracks sent notifications to avoid duplicates.
 */
const checkExpiringSubscriptions = async () => {
  logger.info('Running subscription expiry check...');
  let sentCount = 0;

  try {
    // ── Paid users whose plan_expires is within 7 days ──────────────────────
    for (const days of WARN_DAYS) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      startOfDay.setDate(startOfDay.getDate() + days);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const { rows: expiringUsers } = await db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.plan, u.plan_expires, u.language, u.role
          FROM users u
         WHERE u.is_active = TRUE
           AND u.plan != 'free'
           AND u.plan_expires >= $1
           AND u.plan_expires <= $2
           AND u.email IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM subscription_notifications sn
              WHERE sn.user_id = u.id
                AND sn.notification_type = 'expiry_warning'
                AND sn.days_before = $3
                AND sn.created_at > NOW() - INTERVAL '24 hours'
           )
      `, [startOfDay.toISOString(), endOfDay.toISOString(), days]);

      for (const user of expiringUsers) {
        try {
          const daysLeft = Math.max(0, Math.ceil((new Date(user.plan_expires) - new Date()) / (1000 * 60 * 60 * 24)));

          // Send email
          const emailSent = await sendExpiryWarning(user.email, {
            name: user.name,
            plan: user.plan,
            daysLeft,
            expiresAt: user.plan_expires,
            lang: user.language || 'en',
          });

          // Send SMS
          let smsSent = false;
          if (user.phone && daysLeft <= 3) {
            const isSw = user.language === 'sw';
            const msg = isSw
              ? `⚠️ ElimuAI: Mpango wako wa ${user.plan} ${daysLeft <= 0 ? 'umeisha leo' : `utaisha siku ${daysLeft}`}. Huisha sasa: elimuai.africa`
              : `⚠️ ElimuAI: Your ${user.plan} plan ${daysLeft <= 0 ? 'expires today' : `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}. Renew now: elimuai.africa`;
            smsSent = await sendSMS(user.phone, msg);
          }

          // Track notification
          await db.query(`
            INSERT INTO subscription_notifications (user_id, notification_type, days_before, channel, sent_email, sent_sms)
            VALUES ($1, 'expiry_warning', $2, 'email', $3, $4)
          `, [user.id, days, emailSent, smsSent]);

          if (emailSent || smsSent) sentCount++;
          logger.info(`Expiry warning sent to ${user.email} (${daysLeft} days left)`);
        } catch (err) {
          logger.error(`Failed to notify ${user.email}:`, err.message);
        }
      }
    }

    // ── Free plan users — weekly upgrade nudge ───────────────────────────────
    // Only send once per 7 days to free users who have been active in last 14 days
    const { rows: freeUsers } = await db.query(`
      SELECT u.id, u.name, u.email, u.language
        FROM users u
       WHERE u.is_active = TRUE
         AND u.plan = 'free'
         AND u.email IS NOT NULL
         AND u.email_verified = TRUE
         AND u.last_login > NOW() - INTERVAL '14 days'
         AND NOT EXISTS (
           SELECT 1 FROM subscription_notifications sn
            WHERE sn.user_id = u.id
              AND sn.notification_type = 'upgrade_nudge'
              AND sn.created_at > NOW() - INTERVAL '7 days'
         )
    `);

    for (const user of freeUsers) {
      try {
        const emailSent = await sendUpgradeNudge(user.email, {
          name: user.name,
          lang: user.language || 'en',
        });

        await db.query(`
          INSERT INTO subscription_notifications (user_id, notification_type, days_before, channel, sent_email, sent_sms)
          VALUES ($1, 'upgrade_nudge', 0, 'email', $2, FALSE)
        `, [user.id, emailSent]);

        if (emailSent) sentCount++;
      } catch (err) {
        logger.error(`Failed to send upgrade nudge to ${user.email}:`, err.message);
      }
    }

    logger.info(`Subscription notifications complete: ${sentCount} sent`);
    return sentCount;
  } catch (err) {
    logger.error('Subscription check failed:', err.message);
    throw err;
  }
};

/**
 * Clean up old notification records (> 90 days).
 */
const cleanupNotifications = async () => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM subscription_notifications WHERE created_at < NOW() - INTERVAL '90 days'"
    );
    if (rowCount > 0) logger.info(`Cleaned up ${rowCount} old subscription notifications`);
  } catch (err) {
    logger.error('Notification cleanup failed:', err.message);
  }
};

/**
 * Clean up expired/revoked sessions (> 7 days past expiry).
 */
const cleanupSessions = async () => {
  try {
    const { rowCount } = await db.query(
      "DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '7 days' OR (is_revoked = TRUE AND last_active < NOW() - INTERVAL '7 days')"
    );
    if (rowCount > 0) logger.info(`Cleaned up ${rowCount} expired sessions`);
  } catch (err) {
    logger.error('Session cleanup failed:', err.message);
  }
};

module.exports = { checkExpiringSubscriptions, cleanupNotifications, cleanupSessions };
