const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

const PLAN_PRICES = {
  student: { amount: 299, currency: 'KES', duration_days: 30 },
  family:  { amount: 499, currency: 'KES', duration_days: 30 },
  school:  { amount: 15000, currency: 'KES', duration_days: 120 },
};

// Get M-Pesa OAuth token
const getMpesaToken = async () => {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_BASE_URL } = process.env;
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return data.access_token;
};

// Format M-Pesa timestamp
const getMpesaTimestamp = () => {
  return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
};

// ─── POST /api/payments/mpesa/initiate ───────────────────────────────────────
router.post('/mpesa/initiate', authenticate, async (req, res) => {
  const { plan, phone } = req.body;
  const user = req.user;

  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' });
  if (!phone || !/^254\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone. Format: 254XXXXXXXXX' });
  }

  const planDetails = PLAN_PRICES[plan];
  const reference = `ELIMU-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;

  try {
    // Create pending payment record
    const { rows } = await db.query(
      `INSERT INTO payments (user_id, plan, amount, currency, method, status, phone_number, reference)
       VALUES ($1, $2, $3, $4, 'mpesa', 'pending', $5, $6) RETURNING id`,
      [user.id, plan, planDetails.amount, planDetails.currency, phone, reference]
    );
    const paymentId = rows[0].id;

    // Initiate STK Push
    const token = await getMpesaToken();
    const timestamp = getMpesaTimestamp();
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkPayload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: planDetails.amount,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: `${process.env.MPESA_CALLBACK_URL}?paymentId=${paymentId}`,
      AccountReference: reference,
      TransactionDesc: `ElimuAI ${plan} Plan`,
    };

    const { data } = await axios.post(
      `${process.env.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      stkPayload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (data.ResponseCode !== '0') {
      await db.query("UPDATE payments SET status = 'failed' WHERE id = $1", [paymentId]);
      return res.status(400).json({ error: data.ResponseDescription || 'STK Push failed' });
    }

    // Store checkout request ID
    await db.query(
      "UPDATE payments SET mpesa_checkout_id = $1 WHERE id = $2",
      [data.CheckoutRequestID, paymentId]
    );

    logger.info(`M-Pesa STK initiated: ${reference} for user ${user.id}`);
    res.json({
      success: true,
      paymentId,
      checkoutRequestId: data.CheckoutRequestID,
      message: `STK push sent to ${phone}. Enter your M-Pesa PIN to complete.`,
    });

  } catch (err) {
    logger.error('M-Pesa initiate error:', err.message);
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// ─── POST /api/payments/mpesa/callback ───────────────────────────────────────
// Called by Safaricom after payment
router.post('/mpesa/callback', async (req, res) => {
  const { paymentId } = req.query;
  const { Body } = req.body;

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Respond to Safaricom first

  try {
    const callback = Body?.stkCallback;
    if (!callback || !paymentId) return;

    const { ResultCode, ResultDesc, CallbackMetadata } = callback;

    if (ResultCode !== 0) {
      await db.query("UPDATE payments SET status = 'failed', metadata = $1 WHERE id = $2",
        [JSON.stringify({ ResultCode, ResultDesc }), paymentId]);
      return;
    }

    // Extract metadata
    const items = CallbackMetadata?.Item || [];
    const getMeta = (name) => items.find(i => i.Name === name)?.Value;
    const receipt = getMeta('MpesaReceiptNumber');
    const amount  = getMeta('Amount');
    const phone   = getMeta('PhoneNumber');

    // Mark payment complete
    await db.query(
      `UPDATE payments SET status = 'completed', mpesa_receipt = $1, completed_at = NOW(),
       metadata = metadata || $2::jsonb WHERE id = $3 RETURNING user_id, plan`,
      [receipt, JSON.stringify({ receipt, amount, phone }), paymentId]
    );

    // Get payment details to activate plan
    const { rows } = await db.query('SELECT user_id, plan FROM payments WHERE id = $1', [paymentId]);
    if (!rows[0]) return;

    const { user_id, plan } = rows[0];
    const duration = PLAN_PRICES[plan]?.duration_days || 30;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Activate user plan
    await db.query(
      "UPDATE users SET plan = $1, plan_expires = $2 WHERE id = $3",
      [plan, expiresAt, user_id]
    );

    logger.info(`Payment confirmed: ${receipt} — User ${user_id} upgraded to ${plan}`);

    // Send confirmation SMS
    const { sendSMS } = require('../services/smsService');
    await sendSMS(String(phone), `✅ ElimuAI: Malipo ya KES ${amount} yamekubaliwa. Mpango wako wa ${plan} umeanza. Msimbo: ${receipt}`);

  } catch (err) {
    logger.error('M-Pesa callback error:', err.message);
  }
});

// ─── GET /api/payments/status/:paymentId ─────────────────────────────────────
router.get('/status/:paymentId', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, plan, amount, status, mpesa_receipt, created_at, completed_at FROM payments WHERE id = $1 AND user_id = $2',
    [req.params.paymentId, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
  res.json({ payment: rows[0] });
});

// ─── GET /api/payments/history ───────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, plan, amount, currency, method, status, mpesa_receipt, created_at, completed_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  res.json({ payments: rows });
});

module.exports = router;
