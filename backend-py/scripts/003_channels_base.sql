-- ============================================================
-- ElimuAI Channels — Base schema (prerequisite for 004_ch6_migration.sql)
-- Introduces partners / referral_codes / conversions / commissions
-- so the CH6 Insurance Agent Network migration can extend them.
-- Safe to run repeatedly (IF NOT EXISTS everywhere).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Channel type enum — extended by 004_ch6_migration.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
    CREATE TYPE channel_type AS ENUM (
      'teacher',
      'principal',
      'growth_marketer',
      'affiliate'
    );
  END IF;
END $$;

-- ─── Partners: any human/entity earning commission ─────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(30),
  mpesa_number  VARCHAR(30),
  channel_type  channel_type NOT NULL,
  region        VARCHAR(100),
  status        VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, suspended
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partners_channel  ON partners(channel_type);
CREATE INDEX IF NOT EXISTS idx_partners_status   ON partners(status);

-- ─── Referral codes: each partner has 1+ codes / links ─────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  code         VARCHAR(50) NOT NULL UNIQUE,
  channel_type channel_type NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ref_codes_partner ON referral_codes(partner_id);
CREATE INDEX IF NOT EXISTS idx_ref_codes_code    ON referral_codes(code);

-- ─── Conversions: a subscriber attributed to a partner ─────────────────────
CREATE TABLE IF NOT EXISTS conversions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id       VARCHAR(64) NOT NULL,
  partner_id          UUID NOT NULL REFERENCES partners(id),
  channel_type        channel_type NOT NULL,
  plan                VARCHAR(30) NOT NULL,          -- child_1 / child_2 / child_3plus / school
  plan_price_kes      NUMERIC(12,2) NOT NULL,
  payment_provider    VARCHAR(30) NOT NULL,          -- mpesa / stripe / manual
  provider_txn_id     VARCHAR(120) NOT NULL UNIQUE,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, refunded, cancelled
  subscription_month  INTEGER NOT NULL DEFAULT 1,
  is_first_conversion BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_partner    ON conversions(partner_id);
CREATE INDEX IF NOT EXISTS idx_conv_subscriber ON conversions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_conv_status     ON conversions(status);

-- ─── Commissions: payout line-items per conversion / level ────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id      UUID NOT NULL REFERENCES conversions(id) ON DELETE CASCADE,
  partner_id         UUID NOT NULL REFERENCES partners(id),
  channel_type       channel_type NOT NULL,
  commission_type    VARCHAR(40) NOT NULL,          -- agent / manager_override / network_head_override / gm_rider / ...
  plan               VARCHAR(30) NOT NULL,
  plan_price_kes     NUMERIC(12,2) NOT NULL,
  commission_rate    NUMERIC(5,4) NOT NULL,
  commission_kes     NUMERIC(12,2) NOT NULL,
  subscription_month INTEGER NOT NULL DEFAULT 1,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, paid, cancelled
  payout_month       DATE,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_partner ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_comm_status  ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_comm_payout  ON commissions(payout_month);
