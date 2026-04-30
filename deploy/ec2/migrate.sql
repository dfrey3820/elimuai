-- ═══════════════════════════════════════════════════════════════════════════
-- ElimuAI Migration: Add missing tables & columns
-- Safe to run multiple times (all statements use IF NOT EXISTS / DO blocks)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── ENUMS (add if missing) ──────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE coupon_type AS ENUM ('fixed', 'percentage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── USERS: add trial_expires column ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires TIMESTAMP;

-- ─── PAYMENTS: add missing columns ───────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_cycle billing_cycle DEFAULT 'monthly';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0;

-- ─── SMS LOGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient   VARCHAR(20) NOT NULL,
  message     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'sent',
  provider    VARCHAR(30) DEFAULT 'africastalking',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);

-- ─── ADMIN SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Seed default settings
INSERT INTO admin_settings (key, value) VALUES
  ('mpesa_environment', 'sandbox'),
  ('mpesa_consumer_key', ''),
  ('mpesa_consumer_secret', ''),
  ('mpesa_shortcode', ''),
  ('mpesa_passkey', ''),
  ('mpesa_callback_url', ''),
  ('at_environment', 'sandbox'),
  ('at_api_key', ''),
  ('at_username', 'sandbox'),
  ('at_sender_id', ''),
  ('trial_days', '7'),
  ('school_subscription_amount', '15000'),
  ('teacher_subscription_amount', '999'),
  ('parent_subscription_amount', '499'),
  ('student_subscription_amount', '299'),
  ('school_subscription_days', '120'),
  ('teacher_subscription_days', '30'),
  ('parent_subscription_days', '30'),
  ('student_subscription_days', '30'),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from_name', 'ElimuAI'),
  ('smtp_from_email', ''),
  ('billing_quarterly_discount', '10'),
  ('billing_semi_annual_discount', '15'),
  ('billing_annual_discount', '20')
ON CONFLICT (key) DO NOTHING;

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES payments(id),
  plan            plan_type NOT NULL,
  billing_cycle   billing_cycle NOT NULL DEFAULT 'monthly',
  amount          NUMERIC(10,2) NOT NULL,
  currency        VARCHAR(5) DEFAULT 'KES',
  status          invoice_status DEFAULT 'pending',
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  due_date        DATE NOT NULL,
  paid_at         TIMESTAMP,
  coupon_code     VARCHAR(50),
  coupon_discount NUMERIC(10,2) DEFAULT 0,
  subtotal        NUMERIC(10,2),
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- ─── COUPONS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  description     TEXT,
  type            coupon_type NOT NULL DEFAULT 'percentage',
  value           NUMERIC(10,2) NOT NULL,
  min_amount      NUMERIC(10,2) DEFAULT 0,
  max_discount    NUMERIC(10,2),
  applicable_plans TEXT[] DEFAULT '{}',
  applicable_cycles TEXT[] DEFAULT '{}',
  max_uses        INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  times_used      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  starts_at       TIMESTAMP,
  expires_at      TIMESTAMP,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id  UUID REFERENCES payments(id),
  discount    NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(coupon_id, user_id);

-- ─── PASSWORD RESET TOKENS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── REFRESH TOKENS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(512) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
