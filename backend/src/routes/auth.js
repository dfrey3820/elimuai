const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db      = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getTrialConfig } = require('../services/settingsService');
const { sendOTP, verifyOTP } = require('../services/otpService');
const logger  = require('../config/logger');

const router = express.Router();

const generateTokens = (userId) => {
  const jti = crypto.randomBytes(24).toString('hex'); // session identifier
  const accessToken = jwt.sign({ userId, jti }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId, jti, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken, jti };
};

const createSession = async (userId, jti, req) => {
  const ip = req.ip || req.connection?.remoteAddress || null;
  const ua = req.headers['user-agent'] || null;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.query(
    `INSERT INTO user_sessions (user_id, token_jti, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, jti, ip, ua, expiresAt]
  );
};

const logAuthError = (label, err) => {
  logger.error(label, {
    error: err?.message,
    code: err?.code,
    stack: err?.stack,
  });
};

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Step 1: Create user (inactive) + send OTP
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail({
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
    // Check if email already exists and is verified
    const { rows: existing } = await db.query(
      'SELECT id, email_verified, is_active FROM users WHERE email = $1', [email]
    );
    if (existing.length > 0 && existing[0].email_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // If user exists but unverified, delete the old record to allow re-registration
    if (existing.length > 0 && !existing[0].email_verified) {
      await db.query('DELETE FROM users WHERE id = $1', [existing[0].id]);
    }

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
      `INSERT INTO users (name, email, phone, password_hash, role, country, language, grade_level, school_id, curriculum, trial_expires, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + ($11 || ' days')::INTERVAL, FALSE, FALSE)
       RETURNING id, name, email, phone, role, plan, country, language, grade_level, school_id`,
      [name, email, phone || null, passwordHash, role, country, language, grade_level || null, assignedSchoolId, curriculum || 'CBC', String(trialCfg.trialDays)]
    );
    const user = rows[0];

    // Send OTP to email
    const otpResult = await sendOTP(email, 'signup', user.id);

    logger.info(`New user registered (pending OTP): ${user.id} (${role})`);
    res.status(201).json({
      user,
      otpSent: otpResult.success,
      message: otpResult.message,
      ...(otpResult.devCode ? { devCode: otpResult.devCode } : {}),
      requiresOTP: true,
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email or phone already registered' });
    logAuthError('Register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Step 2: Verify OTP after register or login
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  body('purpose').isIn(['signup', 'login', 'verify_email']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, code, purpose } = req.body;
  try {
    const result = await verifyOTP(email, code, purpose);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    if (purpose === 'signup') {
      // Activate user account
      const { rows } = await db.query(
        `UPDATE users SET is_active = TRUE, email_verified = TRUE
         WHERE email = $1
         RETURNING id, name, email, phone, role, plan, plan_expires, country, language, grade_level, school_id, total_xp, streak_days, trial_expires`,
        [email]
      );
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      const user = rows[0];
      const { accessToken, refreshToken, jti } = generateTokens(user.id);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
      await createSession(user.id, jti, req);
      logger.info(`User verified via OTP: ${user.id}`);
      return res.json({ user, accessToken, refreshToken, verified: true });
    }

    if (purpose === 'login') {
      // Issue tokens after OTP verification
      const { rows } = await db.query(
        `SELECT id, name, email, phone, role, plan, plan_expires, country, language, school_id, grade_level, curriculum, total_xp, streak_days, trial_expires
         FROM users WHERE email = $1 AND is_active = TRUE`,
        [email]
      );
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      const user = rows[0];
      const { accessToken, refreshToken, jti } = generateTokens(user.id);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, expiresAt]);
      await createSession(user.id, jti, req);
      await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      logger.info(`User logged in via OTP: ${user.id}`);
      return res.json({ user, accessToken, refreshToken, verified: true });
    }

    // Generic email verification
    await db.query('UPDATE users SET email_verified = TRUE WHERE email = $1', [email]);
    res.json({ verified: true, message: 'Email verified successfully.' });
  } catch (err) {
    logAuthError('OTP verify error', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────────
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail(),
  body('purpose').isIn(['signup', 'login', 'verify_email']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, purpose } = req.body;
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const userId = rows[0]?.id || null;
    const result = await sendOTP(email, purpose, userId);
    res.json({ success: result.success, message: result.message, ...(result.devCode ? { devCode: result.devCode } : {}) });
  } catch (err) {
    logAuthError('Resend OTP error', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
// Step 1: Verify credentials → send OTP
router.post('/login', [
  body('identifier').notEmpty(), // email or phone
  body('password').notEmpty(),
], async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, password_hash, role, plan, plan_expires, country, language, school_id, grade_level, curriculum, total_xp, streak_days, is_active, trial_expires, email_verified
       FROM users WHERE (email = $1 OR phone = $1) AND is_active = TRUE`,
      [identifier]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If email not verified yet (shouldn't happen for active users but safety check)
    if (!user.email_verified && user.email) {
      const otpResult = await sendOTP(user.email, 'signup', user.id);
      return res.json({ requiresOTP: true, purpose: 'signup', email: user.email, message: otpResult.message, ...(otpResult.devCode ? { devCode: otpResult.devCode } : {}) });
    }

    // Send login OTP
    const otpResult = await sendOTP(user.email, 'login', user.id);
    delete user.password_hash;
    res.json({
      requiresOTP: true,
      purpose: 'login',
      email: user.email,
      userName: user.name,
      message: otpResult.message,
      ...(otpResult.devCode ? { devCode: otpResult.devCode } : {}),
    });
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
    // Revoke old session if it had one
    if (decoded.jti) {
      await db.query('UPDATE user_sessions SET is_revoked = TRUE WHERE token_jti = $1', [decoded.jti]);
    }
    const tokens = generateTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [decoded.userId, tokens.refreshToken, expiresAt]);
    await createSession(decoded.userId, tokens.jti, req);
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  // Revoke current session
  if (req.tokenJti) {
    await db.query('UPDATE user_sessions SET is_revoked = TRUE WHERE token_jti = $1', [req.tokenJti]);
  }
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

// ─── GET /api/auth/sessions ──────────────────────────────────────────────────
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ip_address, user_agent, last_active, created_at,
              (token_jti = $2) AS is_current
         FROM user_sessions
        WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
        ORDER BY last_active DESC`,
      [req.user.id, req.tokenJti || '']
    );
    res.json({ sessions: rows });
  } catch (err) {
    logger.error('List sessions error:', err.message);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// ─── DELETE /api/auth/sessions/:id ───────────────────────────────────────────
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1 AND user_id = $2 AND is_revoked = FALSE',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    logger.error('Revoke session error:', err.message);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// ─── POST /api/auth/sessions/revoke-all ──────────────────────────────────────
router.post('/sessions/revoke-all', authenticate, async (req, res) => {
  try {
    // Revoke all sessions except current
    await db.query(
      'UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1 AND token_jti != $2',
      [req.user.id, req.tokenJti || '']
    );
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All other sessions revoked' });
  } catch (err) {
    logger.error('Revoke all sessions error:', err.message);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────
router.delete('/account', authenticate, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password is required to delete your account' });
  try {
    const { rows } = await db.query('SELECT password_hash, role FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'super_admin') return res.status(403).json({ error: 'Super admin accounts cannot be self-deleted' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    // Revoke all sessions
    await db.query('UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1', [req.user.id]);
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    // Deactivate and anonymise the account
    await db.query(
      `UPDATE users SET is_active = FALSE, name = 'Deleted User', email = CONCAT('deleted_', id, '@removed.local'),
       phone = NULL, updated_at = NOW() WHERE id = $1`,
      [req.user.id]
    );
    logger.info(`User ${req.user.id} self-deleted their account`);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    logger.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  try {
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    logger.error('Change password error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
