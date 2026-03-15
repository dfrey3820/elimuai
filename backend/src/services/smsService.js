const axios = require('axios');
const logger = require('../config/logger');

// ─── SMS via Africa's Talking ─────────────────────────────────────────────────
const sendSMS = async (to, message) => {
  try {
    const { data } = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      new URLSearchParams({ username: process.env.AFRICASTALKING_USERNAME, to, message, from: process.env.AFRICASTALKING_SENDER_ID }),
      { headers: { apiKey: process.env.AFRICASTALKING_API_KEY, Accept: 'application/json' } }
    );
    logger.info(`SMS sent to ${to}: ${data.SMSMessageData?.Message}`);
    return true;
  } catch (err) {
    logger.error(`SMS failed to ${to}:`, err.message);
    return false;
  }
};

module.exports = { sendSMS };
