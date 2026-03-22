const { Worker } = require('bullmq');
const { getConnection } = require('../config/redis');
const { getMpesaConfig } = require('../config/mpesaConfig');
const { verify, createNonceTracker } = require('./hmac');
const mpesa = require('./mpesa');
const { publishResult } = require('./queuePublisher');
const logger = require('../config/logger');

const QUEUE_NAME = 'payment-requests';
const HMAC_SECRET = process.env.QUEUE_HMAC_SECRET || '';

let worker = null;
const nonceTracker = createNonceTracker();

/**
 * Start the BullMQ worker that consumes payment requests.
 */
const startWorker = () => {
  if (worker) return;
  if (!HMAC_SECRET) {
    logger.error('QUEUE_HMAC_SECRET not set — queue worker will reject all jobs');
  }

  const connection = getConnection();

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { id: jobId, data: signedMessage } = job;
      logger.info(`Processing payment job ${jobId}`);

      // Verify HMAC signature
      const { valid, payload, error } = verify(signedMessage, HMAC_SECRET, nonceTracker);
      if (!valid) {
        logger.error(`Job ${jobId} HMAC verification failed: ${error}`);
        await publishResult({
          paymentId: signedMessage?.payload?.paymentId || 'unknown',
          status: 'failed',
          error: `Security verification failed: ${error}`,
        });
        return;
      }

      const { paymentId, phone, amount, accountReference, transactionDesc } = payload;
      logger.info(`STK Push request: paymentId=${paymentId}, phone=${phone}, KES ${amount}`);

      try {
        const config = await getMpesaConfig();

        if (!config.consumerKey || !config.consumerSecret || !config.shortcode || !config.passkey) {
          throw new Error('M-Pesa credentials not configured');
        }

        // Build callback URL — Safaricom calls this when payment completes
        const callbackUrl = `${config.callbackBaseUrl}/mpesa/callback?paymentId=${encodeURIComponent(paymentId)}`;

        const data = await mpesa.stkPush(config, {
          phone,
          amount,
          accountReference,
          transactionDesc: transactionDesc || 'ElimuAI Payment',
          callbackUrl,
        });

        if (data.ResponseCode === '0') {
          logger.info(`STK Push accepted for ${paymentId}: CheckoutRequestID=${data.CheckoutRequestID}`);
          await publishResult({
            paymentId,
            status: 'stk_sent',
            checkoutRequestId: data.CheckoutRequestID,
            merchantRequestId: data.MerchantRequestID,
          });
        } else {
          logger.warn(`STK Push rejected for ${paymentId}: ${data.ResponseDescription}`);
          await publishResult({
            paymentId,
            status: 'failed',
            error: data.ResponseDescription || 'STK Push rejected by Safaricom',
            responseCode: data.ResponseCode,
          });
        }
      } catch (err) {
        logger.error(`STK Push error for ${paymentId}: ${err.message}`);
        await publishResult({
          paymentId,
          status: 'failed',
          error: err.message,
        });
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 30, duration: 60000 }, // Max 30 per minute
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error('Queue worker error:', err.message);
  });

  logger.info(`Queue worker started on "${QUEUE_NAME}"`);
};

const stopWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Queue worker stopped');
  }
};

module.exports = { startWorker, stopWorker };
