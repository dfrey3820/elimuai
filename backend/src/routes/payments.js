const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getTrialConfig, getSetting } = require('../services/settingsService');
const { calculateCyclePrice, getAllCyclePrices, createInvoice, markInvoicePaid, getUserInvoices, generateInvoicePDF } = require('../services/invoiceService');
const { sendInvoiceEmail, sendPaymentConfirmation } = require('../services/emailService');
const { enqueuePaymentRequest } = require('../services/paymentQueue');
const logger = require('../config/logger');

const router = express.Router();

// ─── GET /api/payments/subscription-info ──────────────────────────────────────
router.get('/subscription-info', async (req, res) => {
  try {
    const cfg = await getTrialConfig();
    // Build per-role cycle pricing
    const roles = ['student', 'teacher', 'parent', 'school'];
    const pricing = {};
    for (const role of roles) {
      pricing[role] = await getAllCyclePrices(role);
    }
    const billingEnabled = (await getSetting('billing_enabled')) !== 'false'; // enabled by default
    res.json({ trialDays: cfg.trialDays, plans: cfg.plans, pricing, currency: 'KES', billingEnabled });
  } catch (err) {
    logger.error('subscription-info error:', err.message);
    res.status(500).json({ error: 'Failed to load subscription info' });
  }
});

// ─── POST /api/payments/mpesa/initiate ───────────────────────────────────────
router.post('/mpesa/initiate', authenticate, async (req, res) => {
  const { plan, phone, billing_cycle = 'monthly', coupon_code } = req.body;
  const user = req.user;

  const validPlans = ['student', 'teacher', 'parent', 'school', 'family', 'enterprise'];
  if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
  const validCycles = ['monthly', 'quarterly', 'semi_annual', 'annual'];
  if (!validCycles.includes(billing_cycle)) return res.status(400).json({ error: 'Invalid billing cycle' });
  if (!phone || !/^254\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone. Format: 254XXXXXXXXX' });
  }

  const cyclePrice = await calculateCyclePrice(plan, billing_cycle);
  let couponDiscount = 0;
  let couponId = null;
  let couponCodeUsed = null;

  // Validate and apply coupon if provided
  if (coupon_code) {
    const { rows: couponRows } = await db.query(
      'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = TRUE',
      [coupon_code.trim()]
    );
    const coupon = couponRows[0];
    if (coupon) {
      const now = new Date();
      const valid = (!coupon.starts_at || new Date(coupon.starts_at) <= now)
        && (!coupon.expires_at || new Date(coupon.expires_at) >= now)
        && (coupon.max_uses === null || coupon.times_used < coupon.max_uses)
        && (!coupon.applicable_plans || coupon.applicable_plans.length === 0 || coupon.applicable_plans.includes(plan))
        && (!coupon.applicable_cycles || coupon.applicable_cycles.length === 0 || coupon.applicable_cycles.includes(billing_cycle))
        && (!coupon.min_amount || cyclePrice.total >= parseFloat(coupon.min_amount));

      if (valid) {
        // Check per-user usage
        const { rows: usages } = await db.query(
          'SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2',
          [coupon.id, user.id]
        );
        if (parseInt(usages[0].count) < (coupon.max_uses_per_user || 1)) {
          if (coupon.type === 'percentage') {
            couponDiscount = Math.round(cyclePrice.total * parseFloat(coupon.value) / 100);
            if (coupon.max_discount && couponDiscount > parseFloat(coupon.max_discount)) {
              couponDiscount = parseFloat(coupon.max_discount);
            }
          } else {
            couponDiscount = parseFloat(coupon.value);
          }
          couponId = coupon.id;
          couponCodeUsed = coupon.code;
        }
      }
    }
  }

  const finalAmount = Math.max(1, cyclePrice.total - couponDiscount);
  const reference = `ELIMU-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;

  try {
    // Create invoice first
    const invoice = await createInvoice({
      userId: user.id,
      plan,
      billingCycle: billing_cycle,
      amount: finalAmount,
      subtotal: cyclePrice.total,
      couponCode: couponCodeUsed,
      couponDiscount,
      currency: cyclePrice.currency,
      status: 'pending',
    });

    // Create pending payment record
    const { rows } = await db.query(
      `INSERT INTO payments (user_id, plan, billing_cycle, amount, currency, method, status, phone_number, reference, invoice_id, coupon_id, coupon_discount)
       VALUES ($1, $2, $3, $4, $5, 'mpesa', 'pending', $6, $7, $8, $9, $10) RETURNING id`,
      [user.id, plan, billing_cycle, finalAmount, cyclePrice.currency, phone, reference, invoice.id, couponId, couponDiscount]
    );
    const paymentId = rows[0].id;

    // Link invoice to payment
    await db.query('UPDATE invoices SET payment_id = $1 WHERE id = $2', [paymentId, invoice.id]);

    // Record coupon usage immediately (discount already applied to invoice/payment)
    if (couponId) {
      await db.query(
        'INSERT INTO coupon_usages (coupon_id, user_id, payment_id, discount) VALUES ($1, $2, $3, $4)',
        [couponId, user.id, paymentId, couponDiscount]
      );
      await db.query('UPDATE coupons SET times_used = times_used + 1 WHERE id = $1', [couponId]);
    }

    // Enqueue payment request for the M-Pesa service to process
    const jobId = await enqueuePaymentRequest({
      paymentId,
      phone,
      amount: finalAmount,
      accountReference: reference,
      transactionDesc: `ElimuAI ${plan} Plan (${billing_cycle})`,
    });

    logger.info(`Payment request queued: jobId=${jobId}, paymentId=${paymentId}, ref=${reference}${couponCodeUsed ? ` (coupon: ${couponCodeUsed}, -${couponDiscount})` : ''}`);
    res.json({
      success: true,
      paymentId,
      jobId,
      status: 'queued',
      couponApplied: couponCodeUsed || null,
      couponDiscount: couponDiscount || 0,
      finalAmount,
      message: `Payment request queued. You will receive an M-Pesa STK push on ${phone} shortly.`,
    });

  } catch (err) {
    logger.error('Payment initiate error:', err.message);
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// Note: Payment results are now processed via the queue consumer in
// backend/src/services/paymentResultHandler.js — no HTTP callback needed.

// ─── GET /api/payments/status/:paymentId ─────────────────────────────────────
router.get('/status/:paymentId', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, plan, amount, status, mpesa_receipt, created_at, completed_at FROM payments WHERE id = $1 AND user_id = $2',
    [req.params.paymentId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
  res.json({ payment: rows[0] });
});

// ─── POST /api/payments/mpesa/query ─────────────────────────────────────────
// Query payment status from local DB (mpesa-service pushes results via queue)
router.post('/mpesa/query', authenticate, async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: 'paymentId is required' });

  const { rows } = await db.query(
    'SELECT id, status, mpesa_checkout_id, mpesa_receipt, created_at, completed_at FROM payments WHERE id = $1 AND user_id = $2',
    [paymentId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
  res.json({ payment: rows[0] });
});

// ─── GET /api/payments/history ───────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, plan, billing_cycle, amount, currency, method, status, mpesa_receipt, created_at, completed_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  res.json({ payments: rows });
});

// ─── GET /api/payments/invoices ──────────────────────────────────────────────
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const invoices = await getUserInvoices(req.user.id);
    res.json({ invoices });
  } catch (err) {
    logger.error('Get invoices error:', err.message);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// ─── GET /api/payments/invoices/:id/pdf ─────────────────────────────────────
router.get('/invoices/:id/pdf', async (req, res) => {
  // Support token via query param for browser downloads
  const jwt = require('jsonwebtoken');
  const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
  try {
    const { rows: userRows } = await db.query('SELECT id, name FROM users WHERE id = $1 AND is_active = TRUE', [userId]);
    if (!userRows[0]) return res.status(401).json({ error: 'User not found' });
    const { rows } = await db.query(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    const pdfBuffer = await generateInvoicePDF(rows[0], userRows[0].name);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ElimuAI-Invoice-${rows[0].invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('Invoice PDF error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ─── POST /api/payments/invoices/:id/email ──────────────────────────────────
router.post('/invoices/:id/email', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    if (!req.user.email) return res.status(400).json({ error: 'No email on your account' });
    const pdfBuffer = await generateInvoicePDF(rows[0], req.user.name);
    const sent = await sendInvoiceEmail(req.user.email, rows[0], pdfBuffer);
    res.json({ success: sent, message: sent ? 'Invoice emailed' : 'Email sending failed (SMTP not configured)' });
  } catch (err) {
    logger.error('Email invoice error:', err.message);
    res.status(500).json({ error: 'Failed to email invoice' });
  }
});

// ─── GET /api/payments/pricing/:role ────────────────────────────────────────
router.get('/pricing/:role', async (req, res) => {
  try {
    const validRoles = ['student', 'teacher', 'parent', 'school'];
    const role = validRoles.includes(req.params.role) ? req.params.role : 'student';
    const prices = await getAllCyclePrices(role);
    res.json({ role, cycles: prices, currency: 'KES' });
  } catch (err) {
    logger.error('Pricing error:', err.message);
    res.status(500).json({ error: 'Failed to load pricing' });
  }
});

module.exports = router;
