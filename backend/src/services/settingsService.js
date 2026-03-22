const db = require('../config/database');
const logger = require('../config/logger');

// In-memory cache for settings (refreshed on update)
let settingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

const getSettings = async () => {
  if (settingsCache && Date.now() - cacheTime < CACHE_TTL) return settingsCache;
  try {
    const { rows } = await db.query('SELECT key, value FROM admin_settings');
    settingsCache = {};
    rows.forEach(r => { settingsCache[r.key] = r.value; });
    cacheTime = Date.now();
    return settingsCache;
  } catch (err) {
    logger.error('Failed to load admin settings:', err.message);
    return settingsCache || {};
  }
};

const getSetting = async (key) => {
  const all = await getSettings();
  return all[key] || '';
};

const setSetting = async (key, value, userId) => {
  await db.query(
    `INSERT INTO admin_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
    [key, value, userId]
  );
  // Invalidate cache
  settingsCache = null;
};

const invalidateCache = () => { settingsCache = null; };

// Get M-Pesa config: prefer DB settings, fall back to env vars
const getMpesaConfig = async () => {
  const s = await getSettings();
  const env = s.mpesa_environment || process.env.MPESA_ENVIRONMENT || 'sandbox';
  const baseUrl = env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  return {
    consumerKey: s.mpesa_consumer_key || process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: s.mpesa_consumer_secret || process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: s.mpesa_shortcode || process.env.MPESA_SHORTCODE || '',
    passkey: s.mpesa_passkey || process.env.MPESA_PASSKEY || '',
    callbackUrl: s.mpesa_callback_url || process.env.MPESA_CALLBACK_URL || '',
    baseUrl,
    environment: env,
  };
};

// Get Africa's Talking config: prefer DB settings, fall back to env vars
const getATConfig = async () => {
  const s = await getSettings();
  const env = s.at_environment || 'sandbox';
  return {
    apiKey: s.at_api_key || process.env.AFRICASTALKING_API_KEY || '',
    username: s.at_username || process.env.AFRICASTALKING_USERNAME || 'sandbox',
    senderId: s.at_sender_id || process.env.AFRICASTALKING_SENDER_ID || '',
    environment: env,
    baseUrl: env === 'production'
      ? 'https://api.africastalking.com'
      : 'https://api.sandbox.africastalking.com',
  };
};

const getTrialConfig = async () => {
  const s = await getSettings();
  const trialDays = parseInt(s.trial_days, 10) || 7;
  return {
    trialDays,
    plans: {
      school:  { amount: parseInt(s.school_subscription_amount, 10) || 15000, days: parseInt(s.school_subscription_days, 10) || 120 },
      teacher: { amount: parseInt(s.teacher_subscription_amount, 10) || 999,  days: parseInt(s.teacher_subscription_days, 10) || 30 },
      parent:  { amount: parseInt(s.parent_subscription_amount, 10) || 499,   days: parseInt(s.parent_subscription_days, 10) || 30 },
      student: { amount: parseInt(s.student_subscription_amount, 10) || 299,  days: parseInt(s.student_subscription_days, 10) || 30 },
    },
  };
};

module.exports = { getSettings, getSetting, setSetting, invalidateCache, getMpesaConfig, getATConfig, getTrialConfig };
