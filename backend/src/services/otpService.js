const crypto = require('crypto');
const db = require('../config/database');
const { sendEmail } = require('./emailService');
const logger = require('../config/logger');

const OTP_EXPIRY_MINS = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECS = 60; // min time between OTP sends

/**
 * Generate a 6-digit OTP code
 */
const generateCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send an OTP email. Creates a record in otp_tokens.
 * @param {string} email
 * @param {string} purpose - 'verify_email' | 'login' | 'signup'
 * @param {string|null} userId - optional, for existing users
 * @returns {{ success: boolean, message?: string }}
 */
const sendOTP = async (email, purpose = 'verify_email', userId = null) => {
  try {
  // Rate-limit: check cooldown
  const { rows: recent } = await db.query(
    `SELECT id FROM otp_tokens
     WHERE email = $1 AND purpose = $2 AND created_at > NOW() - INTERVAL '${OTP_COOLDOWN_SECS} seconds'
     LIMIT 1`,
    [email, purpose]
  );
  if (recent.length > 0) {
    return { success: false, message: 'Please wait before requesting another code.' };
  }

  // Invalidate previous unused OTPs for this email+purpose
  await db.query(
    `UPDATE otp_tokens SET verified = TRUE WHERE email = $1 AND purpose = $2 AND verified = FALSE`,
    [email, purpose]
  );

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);

  await db.query(
    `INSERT INTO otp_tokens (user_id, email, code, purpose, expires_at, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, email, code, purpose, expiresAt, OTP_MAX_ATTEMPTS]
  );

  // Build email HTML
  const purposeLabel = purpose === 'login' ? 'sign in' : purpose === 'signup' ? 'complete registration' : 'verify your email';
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px">
      <div style="text-align:center;margin-bottom:28px">
        <h1 style="color:#2563EB;margin:0 0 4px;font-size:28px">🎓 ElimuAI</h1>
        <p style="color:#94A3B8;font-size:11px;margin:0;letter-spacing:2px;font-weight:700">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">🔐</div>
        <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px">Your Verification Code</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px">Use this code to ${purposeLabel}:</p>
        <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:12px;padding:20px;margin:0 auto 24px;max-width:240px">
          <span style="color:#fff;font-size:36px;font-weight:900;letter-spacing:8px;font-family:monospace">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0">This code expires in <strong>${OTP_EXPIRY_MINS} minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">If you didn't request this, please ignore this email.</p>
      </div>
      <p style="color:#cbd5e1;font-size:10px;text-align:center;margin-top:20px">© ${new Date().getFullYear()} ElimuAI — AI-Powered Learning for East Africa</p>
    </div>
  `;

  const sent = await sendEmail(email, `${code} — Your ElimuAI Verification Code`, html);

  if (!sent) {
    logger.warn(`OTP email failed for ${email} — code: ${code}`);
    // In dev/sandbox mode, still return success but log the code
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV] OTP code for ${email}: ${code}`);
      return { success: true, message: 'OTP sent (dev mode).', devCode: code };
    }
    return { success: false, message: 'Failed to send verification email. Check SMTP settings.' };
  }

  logger.info(`OTP sent to ${email} for ${purpose}`);
  return { success: true, message: 'Verification code sent to your email.' };
  } catch (err) {
    logger.error('sendOTP error', { error: err.message, email, purpose, stack: err.stack });
    return { success: false, message: 'Unable to send verification code. Please try again.' };
  }
};

/**
 * Verify an OTP code.
 * @param {string} email
 * @param {string} code
 * @param {string} purpose
 * @returns {{ valid: boolean, userId?: string, message?: string }}
 */
const verifyOTP = async (email, code, purpose = 'verify_email') => {
  const { rows } = await db.query(
    `SELECT id, user_id, code, attempts, max_attempts, expires_at
     FROM otp_tokens
     WHERE email = $1 AND purpose = $2 AND verified = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );

  if (!rows.length) {
    return { valid: false, message: 'No pending verification code found. Please request a new one.' };
  }

  const otp = rows[0];

  // Check expiry
  if (new Date(otp.expires_at) < new Date()) {
    await db.query('UPDATE otp_tokens SET verified = TRUE WHERE id = $1', [otp.id]);
    return { valid: false, message: 'Code has expired. Please request a new one.' };
  }

  // Check attempts
  if (otp.attempts >= otp.max_attempts) {
    await db.query('UPDATE otp_tokens SET verified = TRUE WHERE id = $1', [otp.id]);
    return { valid: false, message: 'Too many attempts. Please request a new code.' };
  }

  // Increment attempts
  await db.query('UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1', [otp.id]);

  // Check code
  if (otp.code !== code) {
    const remaining = otp.max_attempts - otp.attempts - 1;
    return { valid: false, message: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  // Mark as verified
  await db.query('UPDATE otp_tokens SET verified = TRUE WHERE id = $1', [otp.id]);

  return { valid: true, userId: otp.user_id };
};

module.exports = { sendOTP, verifyOTP, generateCode };
