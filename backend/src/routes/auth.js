const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db      = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger  = require('../config/logger');

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'teacher', 'parent']),
  body('country').optional().isIn(['KE', 'TZ', 'UG']),
  body('language').optional().isIn(['en', 'sw']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password, role, country = 'KE', language = 'en', grade_level, school_id, curriculum } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, country, language, grade_level, school_id, curriculum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, phone, role, plan, country, language, grade_level, school_id, total_xp, streak_days`,
      [name, email || null, phone || null, passwordHash, role, country, language, grade_level || null, school_id || null, curriculum || 'CBC']
    );
    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
    logger.info(`New user registered: ${user.id} (${role})`);
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email or phone already registered' });
    logger.error('Register error:', err.message);
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
      `SELECT id, name, email, phone, password_hash, role, plan, plan_expires, country, language, school_id, grade_level, curriculum, total_xp, streak_days, is_active
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
    logger.error('Login error:', err.message);
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
