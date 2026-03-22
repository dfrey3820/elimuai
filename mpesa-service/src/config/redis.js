const IORedis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let connection = null;

const getConnection = () => {
  if (connection) return connection;
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  connection.on('connect', () => logger.info('Redis connected'));
  connection.on('error', (err) => logger.error('Redis error:', err.message));
  return connection;
};

module.exports = { getConnection };
