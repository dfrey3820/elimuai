const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./config/logger');
const { getConnection } = require('./config/redis');
const callbackRoutes = require('./routes/callbacks');
const adminRoutes = require('./routes/admin');
const { startWorker } = require('./services/queueWorker');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5002;

// ─── Security & Middleware ───────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT'],
}));
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const callbackLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/mpesa/', callbackLimiter);
app.use('/c2b/', callbackLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let redisOk = false;
  try {
    const redis = getConnection();
    await redis.ping();
    redisOk = true;
  } catch (_) {}

  res.json({
    status: 'ok',
    service: 'mpesa-service',
    redis: redisOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/', callbackRoutes);    // /mpesa/callback, /c2b/*, /stk/query
app.use('/admin', adminRoutes);  // /admin/config, /admin/test-auth, /admin/register-c2b

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server & Queue Worker ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`M-Pesa service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start the BullMQ worker to consume payment requests
  startWorker();
  logger.info('Queue worker initialized');
});
