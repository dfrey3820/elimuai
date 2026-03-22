const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// ─── POST /api/coupons/validate ──────────────────────────────────────────────
// Public (authenticated) — validate a coupon code before payment
router.post('/validate', authenticate, async (req, res) => {
  const { code, plan, billing_cycle, amount } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code is required' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [code.trim()]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invalid coupon code' });

    const coupon = rows[0];
    const now = new Date();

    // Check dates
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return res.status(400).json({ error: 'This coupon is not yet active' });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }

    // Check global usage limit
    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return res.status(400).json({ error: 'This coupon has been fully redeemed' });
    }

    // Check per-user usage limit
    if (coupon.max_uses_per_user) {
      const { rows: usages } = await db.query(
        'SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2',
        [coupon.id, req.user.id]
      );
      if (parseInt(usages[0].count) >= coupon.max_uses_per_user) {
        return res.status(400).json({ error: 'You have already used this coupon' });
      }
    }

    // Check applicable plans
    if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && plan) {
      if (!coupon.applicable_plans.includes(plan)) {
        return res.status(400).json({ error: `This coupon is not valid for the ${plan} plan` });
      }
    }

    // Check applicable billing cycles
    if (coupon.applicable_cycles && coupon.applicable_cycles.length > 0 && billing_cycle) {
      if (!coupon.applicable_cycles.includes(billing_cycle)) {
        return res.status(400).json({ error: `This coupon is not valid for ${billing_cycle} billing` });
      }
    }

    // Check minimum amount
    if (coupon.min_amount && amount && parseFloat(amount) < parseFloat(coupon.min_amount)) {
      return res.status(400).json({ error: `Minimum order amount is KES ${coupon.min_amount}` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = amount ? Math.round(parseFloat(amount) * parseFloat(coupon.value) / 100) : parseFloat(coupon.value);
      if (coupon.max_discount && discount > parseFloat(coupon.max_discount)) {
        discount = parseFloat(coupon.max_discount);
      }
    } else {
      discount = parseFloat(coupon.value);
    }

    const finalAmount = amount ? Math.max(0, parseFloat(amount) - discount) : null;

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: parseFloat(coupon.value),
        description: coupon.description,
      },
      discount,
      finalAmount,
    });
  } catch (err) {
    logger.error('Coupon validation error:', err.message);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — require admin or super_admin
// ═══════════════════════════════════════════════════════════════════════════════
router.use('/admin', authenticate, requireRole('admin', 'super_admin'));

// ─── GET /api/coupons/admin ─────────────────────────────────────────────────
router.get('/admin', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    const [data, count] = await Promise.all([
      db.query(
        `SELECT c.*, u.name AS created_by_name
         FROM coupons c LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM coupons'),
    ]);

    res.json({
      coupons: data.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    logger.error('List coupons error:', err.message);
    res.status(500).json({ error: 'Failed to load coupons' });
  }
});

// ─── POST /api/coupons/admin ────────────────────────────────────────────────
router.post('/admin', async (req, res) => {
  const { code, description, type, value, min_amount, max_discount, applicable_plans, applicable_cycles, max_uses, max_uses_per_user, starts_at, expires_at } = req.body;

  if (!code || !type || value == null) {
    return res.status(400).json({ error: 'Code, type, and value are required' });
  }
  if (!['fixed', 'percentage'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "fixed" or "percentage"' });
  }
  if (type === 'percentage' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
    return res.status(400).json({ error: 'Percentage must be between 0 and 100' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO coupons (code, description, type, value, min_amount, max_discount, applicable_plans, applicable_cycles, max_uses, max_uses_per_user, starts_at, expires_at, created_by)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        code.trim(),
        description || null,
        type,
        parseFloat(value),
        min_amount ? parseFloat(min_amount) : 0,
        max_discount ? parseFloat(max_discount) : null,
        applicable_plans || '{}',
        applicable_cycles || '{}',
        max_uses || null,
        max_uses_per_user || 1,
        starts_at || null,
        expires_at || null,
        req.user.id,
      ]
    );

    logger.info(`Admin ${req.user.id} created coupon ${rows[0].code}`);
    res.status(201).json({ coupon: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
    logger.error('Create coupon error:', err.message);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// ─── PUT /api/coupons/admin/:id ─────────────────────────────────────────────
router.put('/admin/:id', async (req, res) => {
  const { description, type, value, min_amount, max_discount, applicable_plans, applicable_cycles, max_uses, max_uses_per_user, is_active, starts_at, expires_at } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE coupons SET
         description = COALESCE($2, description),
         type = COALESCE($3, type),
         value = COALESCE($4, value),
         min_amount = COALESCE($5, min_amount),
         max_discount = $6,
         applicable_plans = COALESCE($7, applicable_plans),
         applicable_cycles = COALESCE($8, applicable_cycles),
         max_uses = $9,
         max_uses_per_user = COALESCE($10, max_uses_per_user),
         is_active = COALESCE($11, is_active),
         starts_at = $12,
         expires_at = $13
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        description,
        type,
        value != null ? parseFloat(value) : null,
        min_amount != null ? parseFloat(min_amount) : null,
        max_discount != null ? parseFloat(max_discount) : null,
        applicable_plans,
        applicable_cycles,
        max_uses != null ? parseInt(max_uses) : null,
        max_uses_per_user != null ? parseInt(max_uses_per_user) : null,
        is_active != null ? is_active : null,
        starts_at || null,
        expires_at || null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Coupon not found' });
    logger.info(`Admin ${req.user.id} updated coupon ${rows[0].code}`);
    res.json({ coupon: rows[0] });
  } catch (err) {
    logger.error('Update coupon error:', err.message);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// ─── DELETE /api/coupons/admin/:id ──────────────────────────────────────────
router.delete('/admin/:id', async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM coupons WHERE id = $1 RETURNING id, code', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Coupon not found' });
    logger.info(`Admin ${req.user.id} deleted coupon ${rows[0].code}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete coupon error:', err.message);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// ─── GET /api/coupons/admin/:id/usages ──────────────────────────────────────
router.get('/admin/:id/usages', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cu.*, u.name AS user_name, u.email AS user_email
       FROM coupon_usages cu JOIN users u ON cu.user_id = u.id
       WHERE cu.coupon_id = $1 ORDER BY cu.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ usages: rows });
  } catch (err) {
    logger.error('Coupon usages error:', err.message);
    res.status(500).json({ error: 'Failed to load usages' });
  }
});

module.exports = router;
