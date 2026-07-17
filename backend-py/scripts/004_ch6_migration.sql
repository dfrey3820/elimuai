-- ============================================================
-- ElimuAI CH6 — Insurance Agent Network
-- PostgreSQL Migration — run after 003_channels_base.sql
-- ============================================================

-- Extend channel_type enum with the new channel values
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'insurance_agent';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'insurance_manager';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'insurance_network_head';

-- ============================================================
-- Hierarchy support on partners table
-- Adds self-referencing tree: agent -> manager -> network head
-- ============================================================
ALTER TABLE partners ADD COLUMN IF NOT EXISTS parent_partner_id UUID REFERENCES partners(id);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS network_id UUID;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS team_code VARCHAR(50);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_partners_parent  ON partners(parent_partner_id);
CREATE INDEX IF NOT EXISTS idx_partners_network ON partners(network_id);
CREATE INDEX IF NOT EXISTS idx_partners_team    ON partners(team_code);

-- ============================================================
-- Insurance Networks — one row per partner network
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_networks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name        VARCHAR(255) NOT NULL,
  head_partner_id     UUID NOT NULL REFERENCES partners(id),
  insurance_company   VARCHAR(255),
  total_agents        INTEGER DEFAULT 0,
  total_managers      INTEGER DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  agreement_signed_at TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Commission rate config (continuous, no diminishing)
-- ============================================================
CREATE TABLE IF NOT EXISTS ch6_commission_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role           VARCHAR(30) NOT NULL UNIQUE,
  rate           NUMERIC(5,4) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT
);

INSERT INTO ch6_commission_rates (role, rate, notes) VALUES
  ('agent',        0.15, 'Insurance agent - continuous monthly commission on enrolled families'),
  ('manager',      0.08, 'Manager override on all agents in their team'),
  ('network_head', 0.05, 'Network head override across entire network'),
  ('gm_rider',     0.05, 'Growth Marketer rider - consistent across all channels')
ON CONFLICT (role) DO NOTHING;

-- ============================================================
-- Bulk import staging (for CSV uploads of agents)
-- ============================================================
CREATE TABLE IF NOT EXISTS ch6_bulk_import_staging (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id         UUID NOT NULL,
  row_number              INTEGER NOT NULL,
  full_name               VARCHAR(255) NOT NULL,
  phone                   VARCHAR(30) NOT NULL,
  mpesa_number            VARCHAR(30) NOT NULL,
  email                   VARCHAR(255),
  role                    VARCHAR(30) NOT NULL,
  manager_employee_number VARCHAR(50),
  employee_number         VARCHAR(50) NOT NULL,
  region                  VARCHAR(100),
  insurance_company       VARCHAR(255),
  custom_code             VARCHAR(50),
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message           TEXT,
  partner_id              UUID REFERENCES partners(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_batch    ON ch6_bulk_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_status   ON ch6_bulk_import_staging(status);
CREATE INDEX IF NOT EXISTS idx_staging_employee ON ch6_bulk_import_staging(employee_number);

-- ============================================================
-- View: Network performance rollup
-- ============================================================
CREATE OR REPLACE VIEW v_ch6_network_performance AS
SELECT
  net.id AS network_id,
  net.network_name,
  head.full_name AS network_head_name,
  net.insurance_company,
  COUNT(DISTINCT mgr.id) AS total_managers,
  COUNT(DISTINCT agt.id) AS total_agents,
  COUNT(DISTINCT conv.subscriber_id) AS total_subscribers,
  COALESCE(SUM(CASE WHEN comm.status = 'pending' THEN comm.commission_kes END), 0) AS pending_commission_kes,
  COALESCE(SUM(CASE WHEN comm.status = 'paid'    THEN comm.commission_kes END), 0) AS paid_commission_kes
FROM insurance_networks net
JOIN partners head ON head.id = net.head_partner_id
LEFT JOIN partners mgr  ON mgr.parent_partner_id = head.id AND mgr.channel_type = 'insurance_manager'
LEFT JOIN partners agt  ON agt.parent_partner_id = mgr.id  AND agt.channel_type = 'insurance_agent'
LEFT JOIN conversions conv  ON conv.partner_id = agt.id AND conv.status = 'confirmed'
LEFT JOIN commissions comm  ON comm.partner_id IN (head.id, mgr.id, agt.id)
GROUP BY net.id, net.network_name, head.full_name, net.insurance_company;

-- ============================================================
-- View: Manager team performance
-- ============================================================
CREATE OR REPLACE VIEW v_ch6_manager_teams AS
SELECT
  mgr.id AS manager_id,
  mgr.full_name AS manager_name,
  mgr.team_code,
  mgr.region,
  COUNT(DISTINCT agt.id) AS team_size,
  COUNT(DISTINCT conv.subscriber_id) AS team_subscribers,
  COALESCE(SUM(CASE WHEN comm.status = 'pending' AND comm.partner_id = mgr.id THEN comm.commission_kes END), 0) AS manager_pending_kes,
  COALESCE(SUM(CASE WHEN comm.status = 'pending' AND comm.partner_id = agt.id THEN comm.commission_kes END), 0) AS team_agents_pending_kes
FROM partners mgr
LEFT JOIN partners agt  ON agt.parent_partner_id = mgr.id AND agt.channel_type = 'insurance_agent'
LEFT JOIN conversions conv ON conv.partner_id = agt.id AND conv.status = 'confirmed'
LEFT JOIN commissions comm ON comm.conversion_id = conv.id
WHERE mgr.channel_type = 'insurance_manager'
GROUP BY mgr.id, mgr.full_name, mgr.team_code, mgr.region;

-- ============================================================
-- View: Individual agent performance
-- ============================================================
CREATE OR REPLACE VIEW v_ch6_agent_performance AS
SELECT
  agt.id AS agent_id,
  agt.full_name AS agent_name,
  agt.employee_number,
  agt.phone,
  mgr.full_name AS manager_name,
  rc.code AS referral_code,
  COUNT(DISTINCT conv.subscriber_id) AS total_families_enrolled,
  COUNT(DISTINCT conv.id) AS total_conversions,
  COALESCE(SUM(CASE WHEN comm.status = 'pending' THEN comm.commission_kes END), 0) AS pending_kes,
  COALESCE(SUM(CASE WHEN comm.status = 'paid'    THEN comm.commission_kes END), 0) AS paid_kes,
  agt.status
FROM partners agt
LEFT JOIN partners mgr        ON mgr.id = agt.parent_partner_id
LEFT JOIN referral_codes rc   ON rc.partner_id = agt.id AND rc.is_active = TRUE
LEFT JOIN conversions conv    ON conv.partner_id = agt.id AND conv.status = 'confirmed'
LEFT JOIN commissions comm    ON comm.partner_id = agt.id
WHERE agt.channel_type = 'insurance_agent'
GROUP BY agt.id, agt.full_name, agt.employee_number, agt.phone, mgr.full_name, rc.code, agt.status;
