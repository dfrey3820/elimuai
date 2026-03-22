const crypto = require('crypto');

const HMAC_ALGO = 'sha256';
const MAX_AGE_MS = 5 * 60 * 1000;

const sign = (payload, secret) => {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = JSON.stringify({ payload, timestamp, nonce });
  const signature = crypto.createHmac(HMAC_ALGO, secret).update(data).digest('hex');
  return { payload, timestamp, nonce, signature };
};

const verify = (message, secret, nonceSet) => {
  const { payload, timestamp, nonce, signature } = message || {};

  if (!payload || !timestamp || !nonce || !signature) {
    return { valid: false, error: 'Missing required fields' };
  }

  const age = Date.now() - timestamp;
  if (age > MAX_AGE_MS || age < -30000) {
    return { valid: false, error: `Message too old or from the future (age=${age}ms)` };
  }

  if (nonceSet.has(nonce)) {
    return { valid: false, error: 'Duplicate nonce — possible replay' };
  }

  const data = JSON.stringify({ payload, timestamp, nonce });
  const expected = crypto.createHmac(HMAC_ALGO, secret).update(data).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    return { valid: false, error: 'Invalid HMAC signature' };
  }

  nonceSet.add(nonce);
  return { valid: true, payload };
};

const createNonceTracker = () => {
  const nonces = new Map();
  const set = {
    has: (n) => nonces.has(n),
    add: (n) => { nonces.set(n, Date.now()); },
  };
  setInterval(() => {
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const [n, t] of nonces) {
      if (t < cutoff) nonces.delete(n);
    }
  }, 60000).unref();
  return set;
};

module.exports = { sign, verify, createNonceTracker };
