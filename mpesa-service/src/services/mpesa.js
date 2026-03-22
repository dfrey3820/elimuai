const axios = require('axios');
const logger = require('../config/logger');

// ─── Token Cache ──────────────────────────────────────────────────────────────
// Cache tokens per consumerKey to avoid re-authenticating on every request.
const tokenCache = new Map();
const TOKEN_TTL = 3500 * 1000; // Safaricom tokens expire in ~3599s

/**
 * Get an OAuth access token from Safaricom.
 * Caches per consumerKey; refreshes when expired.
 */
const getAccessToken = async ({ consumerKey, consumerSecret, baseUrl }) => {
  const cached = tokenCache.get(consumerKey);
  if (cached && Date.now() - cached.time < TOKEN_TTL) return cached.token;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const { data } = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` }, timeout: 15000 }
  );

  tokenCache.set(consumerKey, { token: data.access_token, time: Date.now() });
  logger.info('M-Pesa OAuth token refreshed');
  return data.access_token;
};

/**
 * Format M-Pesa timestamp: YYYYMMDDHHmmss
 */
const getTimestamp = () => {
  return new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
};

/**
 * Initiate an STK Push via Safaricom Daraja API.
 *
 * @param {Object} config - M-Pesa credentials: { consumerKey, consumerSecret, shortcode, passkey, baseUrl }
 * @param {Object} params - Push params: { phone, amount, accountReference, transactionDesc, callbackUrl }
 * @returns {Object} Safaricom response with CheckoutRequestID etc.
 */
const stkPush = async (config, params) => {
  const token = await getAccessToken(config);
  const timestamp = getTimestamp();
  const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: params.amount,
    PartyA: params.phone,
    PartyB: config.shortcode,
    PhoneNumber: params.phone,
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountReference,
    TransactionDesc: params.transactionDesc,
  };

  logger.info(`STK Push → ${params.phone}, KES ${params.amount}, ref: ${params.accountReference}`);

  const { data } = await axios.post(
    `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return data;
};

/**
 * Query STK Push transaction status.
 *
 * @param {Object} config - M-Pesa credentials
 * @param {string} checkoutRequestId - The CheckoutRequestID from the STK Push response
 * @returns {Object} Safaricom query response
 */
const stkQuery = async (config, checkoutRequestId) => {
  const token = await getAccessToken(config);
  const timestamp = getTimestamp();
  const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');

  const { data } = await axios.post(
    `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
  return data;
};

/**
 * Register C2B URLs (for go-live confirmation/validation).
 *
 * @param {Object} config - M-Pesa credentials
 * @param {Object} urls - { confirmationUrl, validationUrl }
 */
const registerC2BUrls = async (config, urls) => {
  const token = await getAccessToken(config);

  const { data } = await axios.post(
    `${config.baseUrl}/mpesa/c2b/v1/registerurl`,
    {
      ShortCode: config.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: urls.confirmationUrl,
      ValidationURL: urls.validationUrl,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
  return data;
};

module.exports = { getAccessToken, stkPush, stkQuery, registerC2BUrls };
