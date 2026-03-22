const axios = require('axios');
const logger = require('../config/logger');
const db = require('../config/database');
const { getATConfig } = require('./settingsService');

// ─── SMS via Africa's Talking ─────────────────────────────────────────────────
const sendSMS = async (to, message) => {
  try {
    const at = await getATConfig();
    const params = { username: at.username, to, message };
    if (at.senderId) params.from = at.senderId;
    const { data } = await axios.post(
      `${at.baseUrl}/version1/messaging`,
      new URLSearchParams(params),
      { headers: { apiKey: at.apiKey, Accept: 'application/json' } }
    );
    logger.info(`SMS sent to ${to}: ${data.SMSMessageData?.Message}`);
    await db.query(
      'INSERT INTO sms_logs (recipient, message, status, metadata) VALUES ($1, $2, $3, $4)',
      [to, message, 'sent', JSON.stringify(data.SMSMessageData || {})]
    ).catch(e => logger.error('SMS log insert failed:', e.message));
    return true;
  } catch (err) {
    logger.error(`SMS failed to ${to}:`, err.message);
    await db.query(
      'INSERT INTO sms_logs (recipient, message, status, metadata) VALUES ($1, $2, $3, $4)',
      [to, message, 'failed', JSON.stringify({ error: err.message })]
    ).catch(e => logger.error('SMS log insert failed:', e.message));
    return false;
  }
};

module.exports = { sendSMS };
