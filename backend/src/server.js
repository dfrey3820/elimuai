const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const cron = require('node-cron');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const logger = require('./config/logger');
const db = require('./config/database');

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const aiRoutes        = require('./routes/ai');
const progressRoutes  = require('./routes/progress');
const leaderboardRoutes = require('./routes/leaderboard');
const paymentRoutes   = require('./routes/payments');
const adminRoutes     = require('./routes/admin');
const couponRoutes    = require('./routes/coupons');
const { usersRouter, schoolsRouter, examsRouter, reportsRouter, curriculumRouter } = require('./routes/index');

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
const { sendWeeklyReports }  = require('./services/reportService');
const { updateLeaderboards } = require('./services/leaderboardService');

// ─── Payment Queue ────────────────────────────────────────────────────────────
const { onPaymentResult, startResultWorker } = require('./services/paymentQueue');
const { handlePaymentResult } = require('./services/paymentResultHandler');

const app = express();

// ─── Security & Middleware ───────────────────────────────────────────────────
// Behind Nginx/ALB: trust first proxy so rate-limiter sees real client IPs.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ─── AI-Specific Rate Limiting ─────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 30,
  message: { error: 'AI request limit reached. Upgrade your plan for more.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ─── Redis Client ─────────────────────────────────────────────────────────────
let redisClient;
(async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    app.locals.redis = redisClient;
    logger.info('Redis connected');
  } catch (err) {
    logger.warn('Redis unavailable, continuing without cache:', err.message);
  }
})();

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/users',       usersRouter);
app.use('/api/ai',          aiLimiter, aiRoutes);
app.use('/api/exams',       examsRouter);
app.use('/api/progress',    progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payments',    paymentRoutes);
app.use('/api/schools',     schoolsRouter);
app.use('/api/reports',     reportsRouter);
app.use('/api/curriculum',  curriculumRouter);
app.use('/api/admin',       adminRoutes);
app.use('/api/coupons',     couponRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl}`);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Scheduled Jobs ───────────────────────────────────────────────────────────
// Every Sunday at 7am EAT — send weekly parent reports
cron.schedule('0 7 * * 0', () => {
  logger.info('Running weekly parent report job...');
  sendWeeklyReports().catch(err => logger.error('Weekly report job failed:', err));
}, { timezone: 'Africa/Nairobi' });

// Every hour — refresh leaderboard cache
cron.schedule('0 * * * *', () => {
  updateLeaderboards().catch(err => logger.error('Leaderboard update failed:', err));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await db.query('SELECT 1');
    logger.info(`✅ Database connected`);
  } catch (err) {
    logger.error('Database connection failed', { error: err.message, stack: err.stack });
  }
  logger.info(`🚀 ElimuAI API running on port ${PORT} [${process.env.NODE_ENV}]`);

  // Start payment result queue worker
  onPaymentResult(handlePaymentResult);
  startResultWorker();
  logger.info('Payment result queue worker started');
});

module.exports = app;
