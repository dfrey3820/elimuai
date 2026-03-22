const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db      = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getTrialConfig } = require('../services/settingsService');
const logger  = require('../config/logger');

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

const logAuthError = (label, err) => {
  logger.error(label, {
    error: err?.message,
    code: err?.code,
    stack: err?.stack,
  });
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false,
    }),
  body('phone').optional({ nullable: true }).isMobilePhone(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'teacher', 'parent', 'admin']),
  body('country').optional().isIn(['KE', 'TZ', 'UG']),
  body('language').optional().isIn(['en', 'sw']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password, role, country = 'KE', language = 'en', grade_level, school_id, curriculum, school_name } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const trialCfg = await getTrialConfig();

    let assignedSchoolId = school_id || null;

    // If registering as school admin, create a school
    if (role === 'admin' && school_name) {
      const { rows: schoolRows } = await db.query(
        `INSERT INTO schools (name, country, curriculum, email, phone, plan, plan_expires)
         VALUES ($1, $2, $3, $4, $5, 'free', NOW() + ($6 || ' days')::INTERVAL) RETURNING id`,
        [school_name, country, curriculum || 'CBC', email || null, phone || null, String(trialCfg.trialDays)]
      );
      assignedSchoolId = schoolRows[0].id;
    }

    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, country, language, grade_level, school_id, curriculum, trial_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + ($11 || ' days')::INTERVAL)
       RETURNING id, name, email, phone, role, plan, plan_expires, country, language, grade_level, school_id, total_xp, streak_days, trial_expires`,
      [name, email || null, phone || null, passwordHash, role, country, language, grade_level || null, assignedSchoolId, curriculum || 'CBC', String(trialCfg.trialDays)]
    );
    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
    logger.info(`New user registered: ${user.id} (${role})`);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email or phone already registered' });
    logAuthError('Register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', [
  body('identifier').notEmpty(), // email or phone
  body('password').notEmpty(),
], async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, password_hash, role, plan, plan_expires, country, language, school_id, grade_level, curriculum, total_xp, streak_days, is_active, trial_expires
       FROM users WHERE (email = $1 OR phone = $1) AND is_active = TRUE`,
      [identifier]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    delete user.password_hash;
    res.json({ user, accessToken, refreshToken });
  } catch (err) {
    logAuthError('Login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    const tokens = generateTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [decoded.userId, tokens.refreshToken, expiresAt]);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
