const { Queue } = require('bullmq');
const { getConnection } = require('../config/redis');
const { sign } = require('./hmac');
const logger = require('../config/logger');

const RESULT_QUEUE = 'payment-results';
const HMAC_SECRET = process.env.QUEUE_HMAC_SECRET || '';

let resultQueue = null;

const getResultQueue = () => {
  if (resultQueue) return resultQueue;
  resultQueue = new Queue(RESULT_QUEUE, { connection: getConnection() });
  return resultQueue;
};

/**
 * Publish a payment result to the results queue.
 * The backend consumes from this queue to update payment records.
 *
 * @param {Object} result - { paymentId, status, checkoutRequestId?, receipt?, amount?, phone?, error? }
 */
const publishResult = async (result) => {
  const queue = getResultQueue();
  const signedMessage = sign(result, HMAC_SECRET);

  await queue.add(`result:${result.paymentId}`, signedMessage, {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  logger.info(`Published result for paymentId=${result.paymentId}, status=${result.status}`);
};

module.exports = { publishResult, getResultQueue };
