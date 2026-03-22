const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sign, verify, createNonceTracker } = require('./hmac');
const logger = require('../config/logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const HMAC_SECRET = process.env.QUEUE_HMAC_SECRET || '';
const REQUEST_QUEUE = 'payment-requests';
const RESULT_QUEUE = 'payment-results';

let connection = null;
let requestQueue = null;
let resultWorker = null;
const nonceTracker = createNonceTracker();

const getConnection = () => {
  if (connection) return connection;
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  connection.on('error', (err) => logger.error('Queue Redis error:', err.message));
  return connection;
};

// ─── Publisher: Enqueue payment request ──────────────────────────────────────

const getRequestQueue = () => {
  if (requestQueue) return requestQueue;
  requestQueue = new Queue(REQUEST_QUEUE, { connection: getConnection() });
  return requestQueue;
};

/**
 * Publish a payment initiation request to the queue.
 *
 * @param {Object} data - { paymentId, phone, amount, accountReference, transactionDesc }
 * @returns {string} jobId
 */
const enqueuePaymentRequest = async (data) => {
  const queue = getRequestQueue();
  const signedMessage = sign(data, HMAC_SECRET);

  const job = await queue.add(`stk:${data.paymentId}`, signedMessage, {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
  });

  logger.info(`Payment request enqueued: jobId=${job.id}, paymentId=${data.paymentId}`);
  return job.id;
};

// ─── Consumer: Process payment results ──────────────────────────────────────

let resultHandler = null;

/**
 * Register a handler for payment results.
 * Called once at startup. The handler receives verified payloads.
 *
 * @param {Function} handler - async (result) => void
 *   result: { paymentId, status, checkoutRequestId?, receipt?, amount?, phone?, error? }
 */
const onPaymentResult = (handler) => {
  resultHandler = handler;
};

/**
 * Start the result queue worker.
 * Must be called after onPaymentResult has been registered.
 */
const startResultWorker = () => {
  if (resultWorker) return;
  if (!HMAC_SECRET) {
    logger.error('QUEUE_HMAC_SECRET not set — result worker will reject all jobs');
  }

  resultWorker = new Worker(
    RESULT_QUEUE,
    async (job) => {
      const { id: jobId, data: signedMessage } = job;
      logger.info(`Processing payment result job ${jobId}`);

      // Verify HMAC
      const { valid, payload, error } = verify(signedMessage, HMAC_SECRET, nonceTracker);
      if (!valid) {
        logger.error(`Result job ${jobId} HMAC failed: ${error}`);
        return; // Don't retry — bad signature won't get better
      }

      if (!resultHandler) {
        logger.error('No result handler registered — dropping result');
        return;
      }

      await resultHandler(payload);
    },
    {
      connection: getConnection(),
      concurrency: 5,
    }
  );

  resultWorker.on('completed', (job) => {
    logger.info(`Result job ${job.id} processed`);
  });

  resultWorker.on('failed', (job, err) => {
    logger.error(`Result job ${job?.id} failed: ${err.message}`);
  });

  resultWorker.on('error', (err) => {
    logger.error('Result worker error:', err.message);
  });

  logger.info(`Result queue worker started on "${RESULT_QUEUE}"`);
};

module.exports = {
  enqueuePaymentRequest,
  onPaymentResult,
  startResultWorker,
};
