const express = require('express');
const axios = require('axios');
const logger = require('../config/logger');
const mpesa = require('../services/mpesa');

const router = express.Router();

// ─── POST /stk/push ───────────────────────────────────────────────────────────
// Called by main backend to initiate M-Pesa STK push.
// Expects M-Pesa config + payment params in the body.
router.post('/stk/push', async (req, res) => {
  const { config, payment } = req.body;

  // Validate required fields
  if (!config?.consumerKey || !config?.consumerSecret || !config?.shortcode || !config?.passkey || !config?.baseUrl) {
    return res.status(400).json({ error: 'Missing M-Pesa configuration fields' });
  }
  if (!payment?.phone || !payment?.amount || !payment?.accountReference || !payment?.callbackUrl) {
    return res.status(400).json({ error: 'Missing payment fields (phone, amount, accountReference, callbackUrl)' });
  }

  try {
    const data = await mpesa.stkPush(config, {
      phone: payment.phone,
      amount: payment.amount,
      accountReference: payment.accountReference,
      transactionDesc: payment.transactionDesc || `ElimuAI Payment`,
      callbackUrl: payment.callbackUrl,
    });

    if (data.ResponseCode === '0') {
      logger.info(`STK Push accepted: CheckoutRequestID=${data.CheckoutRequestID}`);
      return res.json({
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        responseDescription: data.ResponseDescription,
      });
    }

    logger.warn(`STK Push rejected: ${data.ResponseDescription}`);
    return res.status(400).json({
      success: false,
      error: data.ResponseDescription || 'STK Push rejected',
      responseCode: data.ResponseCode,
    });
  } catch (err) {
    logger.error(`STK Push error: ${err.message}`);
    return res.status(502).json({ error: 'Failed to reach M-Pesa API', details: err.message });
  }
});

// ─── POST /stk/query ──────────────────────────────────────────────────────────
// Query the status of a pending STK push.
router.post('/stk/query', async (req, res) => {
  const { config, checkoutRequestId } = req.body;

  if (!config?.consumerKey || !config?.shortcode || !checkoutRequestId) {
    return res.status(400).json({ error: 'Missing config or checkoutRequestId' });
  }

  try {
    const data = await mpesa.stkQuery(config, checkoutRequestId);
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error(`STK Query error: ${err.message}`);
    res.status(502).json({ error: 'Failed to query M-Pesa', details: err.message });
  }
});

// ─── POST /mpesa/callback ────────────────────────────────────────────────────
// Receives the STK Push callback from Safaricom.
// Forwards the result to the main backend's internal callback endpoint.
router.post('/mpesa/callback', async (req, res) => {
  // Immediately respond to Safaricom (they expect a quick 200)
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const paymentId = req.query.paymentId;
  const backendCallbackUrl = req.query.backendUrl;
  const body = req.body;

  logger.info(`M-Pesa callback received for paymentId=${paymentId}`);

  if (!paymentId || !backendCallbackUrl) {
    logger.error('M-Pesa callback missing paymentId or backendUrl query param');
    return;
  }

  try {
    // Forward the raw Safaricom callback to the main backend
    await axios.post(
      `${backendCallbackUrl}?paymentId=${encodeURIComponent(paymentId)}`,
      body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    logger.info(`Callback forwarded to backend for paymentId=${paymentId}`);
  } catch (err) {
    logger.error(`Failed to forward callback to backend: ${err.message}`);
  }
});

// ─── POST /c2b/register ──────────────────────────────────────────────────────
// Register C2B confirmation/validation URLs with Safaricom (used during go-live).
router.post('/c2b/register', async (req, res) => {
  const { config, confirmationUrl, validationUrl } = req.body;

  if (!config?.consumerKey || !confirmationUrl) {
    return res.status(400).json({ error: 'Missing config or confirmationUrl' });
  }

  try {
    const data = await mpesa.registerC2BUrls(config, { confirmationUrl, validationUrl });
    logger.info('C2B URLs registered successfully');
    res.json({ success: true, ...data });
  } catch (err) {
    logger.error(`C2B registration error: ${err.message}`);
    res.status(502).json({ error: 'Failed to register C2B URLs', details: err.message });
  }
});

// ─── POST /c2b/confirmation ──────────────────────────────────────────────────
// Receives C2B payment confirmations from Safaricom.
router.post('/c2b/confirmation', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const body = req.body;
  const backendUrl = process.env.BACKEND_C2B_CALLBACK_URL;

  logger.info(`C2B confirmation received: ${JSON.stringify(body)}`);

  if (!backendUrl) {
    logger.warn('BACKEND_C2B_CALLBACK_URL not set — skipping forward');
    return;
  }

  try {
    await axios.post(backendUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    logger.info('C2B confirmation forwarded to backend');
  } catch (err) {
    logger.error(`Failed to forward C2B confirmation: ${err.message}`);
  }
});

// ─── POST /c2b/validation ───────────────────────────────────────────────────
// Receives C2B validation requests from Safaricom.
router.post('/c2b/validation', async (req, res) => {
  logger.info(`C2B validation request: ${JSON.stringify(req.body)}`);
  // Accept all payments by default — add validation logic here if needed
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
