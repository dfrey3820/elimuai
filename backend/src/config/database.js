const { Pool } = require('pg');
const logger = require('./logger');

const sslEnabled =
  String(process.env.DATABASE_SSL || '').toLowerCase() === 'true' ||
  String(process.env.PGSSLMODE || '').toLowerCase() === 'require';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
