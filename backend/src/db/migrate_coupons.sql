-- Migration: Add coupons system
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('fixed', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
