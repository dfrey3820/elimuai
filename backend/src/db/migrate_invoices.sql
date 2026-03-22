-- Migration: invoices, billing_cycle, SMTP settings
DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_cycle billing_cycle DEFAULT 'monthly';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID;

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
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

INSERT INTO admin_settings (key, value) VALUES
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
