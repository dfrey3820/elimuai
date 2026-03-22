const express = require('express');
const crypto = require('crypto');
const { getMpesaConfig, setMpesaConfig, getSafeConfig } = require('../config/mpesaConfig');
const mpesa = require('../services/mpesa');
const logger = require('../config/logger');

const router = express.Router();

const ADMIN_API_KEY = process.env.MPESA_ADMIN_API_KEY || '';

// Simple API key auth for admin endpoints
const requireAdminKey = (req, res, next) => {
  const key = req.headers['x-api-key'] || '';
  if (!ADMIN_API_KEY) {
    return res.status(503).json({ error: 'Admin API key not configured' });
  }
  // Hash both to ensure equal-length buffers for timing-safe comparison
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const expectedHash = crypto.createHash('sha256').update(ADMIN_API_KEY).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(keyHash), Buffer.from(expectedHash))) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// ─── GET /admin/config ───────────────────────────────────────────────────────
// View current config (no secrets)
router.get('/config', requireAdminKey, async (req, res) => {
  try {
    const config = await getSafeConfig();
    res.json({ config });
  } catch (err) {
    logger.error('Get config error:', err.message);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// ─── PUT /admin/config ───────────────────────────────────────────────────────
// Update M-Pesa credentials
router.put('/config', requireAdminKey, async (req, res) => {
  const { environment, consumerKey, consumerSecret, shortcode, passkey, callbackBaseUrl } = req.body;

  if (!environment && !consumerKey && !consumerSecret && !shortcode && !passkey && !callbackBaseUrl) {
    return res.status(400).json({ error: 'No config fields provided' });
  }

  try {
    await setMpesaConfig({ environment, consumerKey, consumerSecret, shortcode, passkey, callbackBaseUrl });
    const safe = await getSafeConfig();
    logger.info('M-Pesa config updated via admin API');
    res.json({ success: true, config: safe });
  } catch (err) {
    logger.error('Update config error:', err.message);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// ─── POST /admin/test-auth ──────────────────────────────────────────────────
// Test M-Pesa OAuth (verify credentials work)
router.post('/test-auth', requireAdminKey, async (req, res) => {
  try {
    const config = await getMpesaConfig();
    if (!config.consumerKey || !config.consumerSecret) {
      return res.status(400).json({ error: 'M-Pesa credentials not configured' });
    }
    const token = await mpesa.getAccessToken(config);
    res.json({ success: true, tokenPreview: token.slice(0, 10) + '...' });
  } catch (err) {
    logger.error('Auth test error:', err.message);
    res.status(502).json({ error: 'M-Pesa auth failed', details: err.message });
  }
});

// ─── POST /admin/register-c2b ───────────────────────────────────────────────
// Register C2B URLs with Safaricom (go-live step)
router.post('/register-c2b', requireAdminKey, async (req, res) => {
  try {
    const config = await getMpesaConfig();
    const confirmationUrl = `${config.callbackBaseUrl}/c2b/confirmation`;
    const validationUrl = `${config.callbackBaseUrl}/c2b/validation`;

    const data = await mpesa.registerC2BUrls(config, { confirmationUrl, validationUrl });
    logger.info('C2B URLs registered via admin API');
    res.json({ success: true, confirmationUrl, validationUrl, response: data });
  } catch (err) {
    logger.error('C2B registration error:', err.message);
    res.status(502).json({ error: 'Failed to register C2B URLs', details: err.message });
  }
});

module.exports = router;
