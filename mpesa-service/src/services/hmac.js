const crypto = require('crypto');

const HMAC_ALGO = 'sha256';
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes — reject stale messages

/**
 * Sign a queue message payload with HMAC-SHA256.
 * Adds timestamp and nonce to prevent replay attacks.
 *
 * @param {Object} payload - The data to sign
 * @param {string} secret  - Shared HMAC secret
 * @returns {{ payload, timestamp, nonce, signature }}
 */
const sign = (payload, secret) => {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = JSON.stringify({ payload, timestamp, nonce });
  const signature = crypto.createHmac(HMAC_ALGO, secret).update(data).digest('hex');
  return { payload, timestamp, nonce, signature };
};

/**
 * Verify an HMAC-signed queue message.
 * Checks signature validity, timestamp freshness, and nonce uniqueness.
 *
 * @param {Object} message   - { payload, timestamp, nonce, signature }
 * @param {string} secret    - Shared HMAC secret
 * @param {Set}    nonceSet  - Set of recently seen nonces (caller manages eviction)
 * @returns {{ valid: boolean, payload?: Object, error?: string }}
 */
const verify = (message, secret, nonceSet) => {
  const { payload, timestamp, nonce, signature } = message || {};

  if (!payload || !timestamp || !nonce || !signature) {
    return { valid: false, error: 'Missing required fields' };
  }

  // Check freshness
  const age = Date.now() - timestamp;
  if (age > MAX_AGE_MS || age < -30000) {
    return { valid: false, error: `Message too old or from the future (age=${age}ms)` };
  }

  // Check replay
  if (nonceSet.has(nonce)) {
    return { valid: false, error: 'Duplicate nonce — possible replay' };
  }

  // Verify HMAC
  const data = JSON.stringify({ payload, timestamp, nonce });
  const expected = crypto.createHmac(HMAC_ALGO, secret).update(data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    return { valid: false, error: 'Invalid HMAC signature' };
  }

  // Track nonce (prevent replay within TTL window)
  nonceSet.add(nonce);

  return { valid: true, payload };
};

/**
 * Create a nonce tracker with automatic expiry.
 * Cleans up nonces older than MAX_AGE_MS every minute.
 */
const createNonceTracker = () => {
  const nonces = new Map(); // nonce -> timestamp
  const set = {
    has: (n) => nonces.has(n),
    add: (n) => { nonces.set(n, Date.now()); },
  };

  // Periodic cleanup
  setInterval(() => {
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const [n, t] of nonces) {
      if (t < cutoff) nonces.delete(n);
    }
  }, 60000).unref();

  return set;
};

module.exports = { sign, verify, createNonceTracker };
