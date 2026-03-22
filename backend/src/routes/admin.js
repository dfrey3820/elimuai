const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { getSettings, setSetting } = require('../services/settingsService');
const { sendSMS } = require('../services/smsService');
const { invalidateTransporter } = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

// All admin routes require authentication + admin or super_admin role
router.use(authenticate, requireRole('admin', 'super_admin'));

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [users, payments, sms] = await Promise.all([
      db.query(`SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'student') AS students,
        COUNT(*) FILTER (WHERE role = 'teacher') AS teachers,
        COUNT(*) FILTER (WHERE role = 'parent') AS parents,
        COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
        COUNT(*) FILTER (WHERE plan != 'free') AS paid_users
        FROM users`),
      db.query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue
        FROM payments`),
      db.query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed
        FROM sms_logs`),
    ]);

    res.json({
      users: users.rows[0],
      payments: payments.rows[0],
      sms: sms.rows[0],
    });
  } catch (err) {
    logger.error('Admin dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ─── GET /api/admin/transactions ─────────────────────────────────────────────
router.get('/transactions', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status; // optional filter

  try {
    let query = `
      SELECT p.id, p.plan, p.amount, p.currency, p.method, p.status,
             p.mpesa_receipt, p.phone_number, p.reference, p.created_at, p.completed_at,
             u.name AS user_name, u.email AS user_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE p.status = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countQuery = status
      ? 'SELECT COUNT(*) FROM payments WHERE status = $1'
      : 'SELECT COUNT(*) FROM payments';
    const countParams = status ? [status] : [];

    const [data, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      transactions: data.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    logger.error('Admin transactions error:', err.message);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

// ─── GET /api/admin/sms-logs ─────────────────────────────────────────────────
router.get('/sms-logs', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status;

  try {
    let query = 'SELECT id, recipient, message, status, provider, created_at FROM sms_logs';
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countQuery = status
      ? 'SELECT COUNT(*) FROM sms_logs WHERE status = $1'
      : 'SELECT COUNT(*) FROM sms_logs';
    const countParams = status ? [status] : [];

    const [data, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      sms_logs: data.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    logger.error('Admin SMS logs error:', err.message);
    res.status(500).json({ error: 'Failed to load SMS logs' });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const role = req.query.role;

  try {
    let query = `SELECT id, name, email, phone, role, plan, plan_expires, country, grade_level, total_xp, streak_days, is_active, last_login, created_at FROM users`;
    const params = [];

    if (role) {
      params.push(role);
      query += ` WHERE role = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countQuery = role
      ? 'SELECT COUNT(*) FROM users WHERE role = $1'
      : 'SELECT COUNT(*) FROM users';
    const countParams = role ? [role] : [];

    const [data, count] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams),
    ]);

    res.json({
      users: data.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    logger.error('Admin users error:', err.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    // Mask secrets: show only last 4 chars
    const masked = { ...settings };
    ['mpesa_consumer_key', 'mpesa_consumer_secret', 'mpesa_passkey', 'at_api_key', 'smtp_pass'].forEach(k => {
      if (masked[k] && masked[k].length > 4) masked[k] = '••••' + masked[k].slice(-4);
    });
    res.json({ settings: masked });
  } catch (err) {
    logger.error('Admin settings get error:', err.message);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// ─── PUT /api/admin/settings ──────────────────────────────────────────────────
router.put('/settings', async (req, res) => {
  const allowedKeys = [
    'mpesa_environment', 'mpesa_consumer_key', 'mpesa_consumer_secret',
    'mpesa_shortcode', 'mpesa_passkey', 'mpesa_callback_url',
    'at_environment', 'at_api_key', 'at_username', 'at_sender_id',
    'trial_days',
    'school_subscription_amount', 'teacher_subscription_amount',
    'parent_subscription_amount', 'student_subscription_amount',
    'school_subscription_days', 'teacher_subscription_days',
    'parent_subscription_days', 'student_subscription_days',
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
    'smtp_from_name', 'smtp_from_email',
    'billing_quarterly_discount', 'billing_semi_annual_discount', 'billing_annual_discount',
  ];
  try {
    const updates = req.body;
    let count = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;
      // Skip masked values (not changed)
      if (typeof value === 'string' && value.startsWith('••••')) continue;
      await setSetting(key, String(value), req.user.id);
      count++;
    }
    // Invalidate email transporter cache if SMTP settings changed
    if (Object.keys(updates).some(k => k.startsWith('smtp_'))) invalidateTransporter();
    logger.info(`Admin ${req.user.id} updated ${count} settings`);
    res.json({ success: true, updated: count });
  } catch (err) {
    logger.error('Admin settings update error:', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─── POST /api/admin/users ───────────────────────────────────────────────────
router.post('/users', async (req, res) => {
  const { name, email, phone, password, role, country, grade_level } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const validRoles = ['student', 'teacher', 'parent', 'admin', 'super_admin'];
  const userRole = validRoles.includes(role) ? role : 'student';

  // Only super_admin can create admin or super_admin users
  if ((userRole === 'admin' || userRole === 'super_admin') && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can create admin users' });
  }

  try {
    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, country, grade_level, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [name, email, phone || null, hash, userRole, country || 'KE', grade_level || null]
    );

    logger.info(`Admin ${req.user.id} created user ${rows[0].id} (${userRole})`);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    logger.error('Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── POST /api/admin/users/:id/reset-password ────────────────────────────────
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

    // Send via SMS if phone exists
    if (user.phone) {
      await sendSMS(user.phone, `ElimuAI: Your password has been reset. New password: ${tempPassword} — Please change it after login.`);
    }

    logger.info(`Admin ${req.user.id} reset password for user ${user.id}`);
    res.json({ success: true, message: `Password reset. ${user.phone ? 'SMS sent.' : 'No phone on file.'}`, tempPassword });
  } catch (err) {
    logger.error('Password reset error:', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── PUT /api/admin/users/:id/toggle-active ──────────────────────────────────
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    logger.info(`Admin ${req.user.id} toggled user ${rows[0].id} active=${rows[0].is_active}`);
    res.json({ user: rows[0] });
  } catch (err) {
    logger.error('Toggle active error:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const validRoles = ['student', 'teacher', 'parent', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Only super_admin can assign admin or super_admin roles
  if ((role === 'admin' || role === 'super_admin') && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can assign admin roles' });
  }

  try {
    // Prevent demoting yourself
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

    const { rows } = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role',
      [role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    logger.info(`Admin ${req.user.id} changed user ${rows[0].id} role to ${role}`);
    res.json({ user: rows[0] });
  } catch (err) {
    logger.error('Change role error:', err.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;
