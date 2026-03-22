const express = require('express');
const { getMpesaConfig } = require('../config/mpesaConfig');
const mpesa = require('../services/mpesa');
const { publishResult } = require('../services/queuePublisher');
const logger = require('../config/logger');

const router = express.Router();

// ─── POST /mpesa/callback ────────────────────────────────────────────────────
// Receives the STK Push callback from Safaricom.
// Publishes the result to the payment:results queue for the backend to consume.
router.post('/mpesa/callback', async (req, res) => {
  // Immediately respond to Safaricom (they expect a quick 200)
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const paymentId = req.query.paymentId;
  const callback = req.body?.Body?.stkCallback;

  logger.info(`M-Pesa STK callback received for paymentId=${paymentId}`);

  if (!paymentId || !callback) {
    logger.error('M-Pesa callback missing paymentId or stkCallback body');
    return;
  }

  const { ResultCode, ResultDesc, CallbackMetadata } = callback;

  if (ResultCode !== 0) {
    logger.warn(`Payment ${paymentId} failed: ${ResultDesc}`);
    await publishResult({
      paymentId,
      status: 'failed',
      error: ResultDesc || `M-Pesa ResultCode ${ResultCode}`,
      resultCode: ResultCode,
    });
    return;
  }

  // Extract metadata from successful payment
  const items = CallbackMetadata?.Item || [];
  const getMeta = (name) => items.find(i => i.Name === name)?.Value;

  const receipt = getMeta('MpesaReceiptNumber');
  const amount  = getMeta('Amount');
  const phone   = String(getMeta('PhoneNumber') || '');

  logger.info(`Payment ${paymentId} confirmed: receipt=${receipt}, KES ${amount}`);

  await publishResult({
    paymentId,
    status: 'completed',
    receipt,
    amount,
    phone,
  });
});

// ─── POST /stk/query ──────────────────────────────────────────────────────────
// Query STK transaction status (uses own config)
router.post('/stk/query', async (req, res) => {
  const { checkoutRequestId } = req.body;
  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'checkoutRequestId is required' });
  }

  try {
    const config = await getMpesaConfig();
    if (!config.consumerKey) {
      return res.status(503).json({ error: 'M-Pesa credentials not configured' });
    }
    const data = await mpesa.stkQuery(config, checkoutRequestId);
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error(`STK Query error: ${err.message}`);
    res.status(502).json({ error: 'Failed to query M-Pesa', details: err.message });
  }
});

// ─── POST /c2b/confirmation ──────────────────────────────────────────────────
// Receives C2B payment confirmations from Safaricom → publishes to queue.
router.post('/c2b/confirmation', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const body = req.body;
  logger.info(`C2B confirmation received: TransID=${body?.TransID}, Amount=${body?.TransAmount}`);

  await publishResult({
    paymentId: body?.BillRefNumber || body?.TransID,
    status: 'c2b_confirmed',
    receipt: body?.TransID,
    amount: body?.TransAmount,
    phone: body?.MSISDN,
    c2bData: body,
  });
});

// ─── POST /c2b/validation ───────────────────────────────────────────────────
router.post('/c2b/validation', async (req, res) => {
  logger.info(`C2B validation request: ${JSON.stringify(req.body)}`);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
