const { getConnection } = require('./redis');
const logger = require('./logger');

const CONFIG_KEY = 'mpesa:config';

// Default config — overridden by Redis-stored admin settings
const DEFAULTS = {
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortcode: process.env.MPESA_SHORTCODE || '',
  passkey: process.env.MPESA_PASSKEY || '',
  callbackBaseUrl: process.env.MPESA_CALLBACK_BASE_URL || '',
};

/**
 * Get the full M-Pesa config. Redis overrides take precedence over env vars.
 */
const getMpesaConfig = async () => {
  const redis = getConnection();
  let stored = {};
  try {
    const raw = await redis.get(CONFIG_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (err) {
    logger.warn('Failed to read M-Pesa config from Redis:', err.message);
  }

  const env = stored.environment || DEFAULTS.environment;
  const baseUrl = env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  return {
    consumerKey: stored.consumerKey || DEFAULTS.consumerKey,
    consumerSecret: stored.consumerSecret || DEFAULTS.consumerSecret,
    shortcode: stored.shortcode || DEFAULTS.shortcode,
    passkey: stored.passkey || DEFAULTS.passkey,
    callbackBaseUrl: stored.callbackBaseUrl || DEFAULTS.callbackBaseUrl,
    baseUrl,
    environment: env,
  };
};

/**
 * Update M-Pesa config in Redis (called by admin API).
 */
const setMpesaConfig = async (updates) => {
  const redis = getConnection();
  const current = await getMpesaConfig();

  const merged = {
    environment: updates.environment || current.environment,
    consumerKey: updates.consumerKey || current.consumerKey,
    consumerSecret: updates.consumerSecret || current.consumerSecret,
    shortcode: updates.shortcode || current.shortcode,
    passkey: updates.passkey || current.passkey,
    callbackBaseUrl: updates.callbackBaseUrl || current.callbackBaseUrl,
  };

  await redis.set(CONFIG_KEY, JSON.stringify(merged));
  logger.info('M-Pesa config updated in Redis');
  return merged;
};

/**
 * Get a sanitized version (no secrets) for display.
 */
const getSafeConfig = async () => {
  const cfg = await getMpesaConfig();
  return {
    environment: cfg.environment,
    shortcode: cfg.shortcode,
    callbackBaseUrl: cfg.callbackBaseUrl,
    hasConsumerKey: !!cfg.consumerKey,
    hasConsumerSecret: !!cfg.consumerSecret,
    hasPasskey: !!cfg.passkey,
  };
};

module.exports = { getMpesaConfig, setMpesaConfig, getSafeConfig };
