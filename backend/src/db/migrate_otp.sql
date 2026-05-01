-- ═══════════════════════════════════════════════════════════════════════════
-- OTP Verification Tokens Table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS otp_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  code        VARCHAR(6) NOT NULL,
  purpose     VARCHAR(30) NOT NULL DEFAULT 'verify_email',  -- verify_email | login | signup
  attempts    INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  verified    BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_tokens(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_tokens(user_id, purpose);

-- Add email_verified default to false if not already
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;

-- Add pending_otp flag so we know registration is incomplete
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
