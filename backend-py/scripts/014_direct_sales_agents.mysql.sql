-- ════════════════════════════════════════════════════════════════════════════
-- 014 — DIRECT SALES AGENTS
-- ════════════════════════════════════════════════════════════════════════════
-- A standalone sales channel, separate from the marketing/network agents (010/013).
-- Direct sales agents:
--   * sell ElimuAI to students, parents, teachers and schools
--   * earn an admin-controlled percentage commission on each customer's FIRST payment
--   * have a unique agent_code auto-embedded in the links they share (/register?ref=CODE)
--   * can send renewal reminders to their own customers (manual + automatic)
--
-- Commission rate per award = COALESCE(per-agent override, global default, 0.10).
-- The global default lives in admin_settings('sales_agent_commission_rate').
--
-- Idempotent: safe to re-run. Triggers use DELIMITER, so apply with the mysql CLI.
-- ════════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS sales_agents (
  id                 CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  agent_code         VARCHAR(32) NOT NULL,
  -- NULL => use the global default (admin_settings.sales_agent_commission_rate).
  commission_rate    DECIMAL(5,4) NULL CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1)),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  payout_method      VARCHAR(32),
  payout_details     JSON NOT NULL DEFAULT (JSON_OBJECT()),
  notes              TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sales_agents_user (user_id),
  UNIQUE KEY uq_sales_agents_code (agent_code),
  KEY idx_sales_agents_active (is_active),
  CONSTRAINT fk_sales_agents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_agent_referrals (
  id           CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  agent_id     CHAR(36) NOT NULL,
  user_id      CHAR(36) NOT NULL,
  source       VARCHAR(32) NOT NULL DEFAULT 'link',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sales_agent_referrals_user (user_id),
  KEY idx_sales_agent_referrals_agent (agent_id),
  CONSTRAINT fk_sales_agent_referrals_agent FOREIGN KEY (agent_id) REFERENCES sales_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_agent_referrals_user  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_agent_commissions (
  id                 CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  agent_id           CHAR(36) NOT NULL,
  referral_id        CHAR(36) NOT NULL,
  user_id            CHAR(36) NOT NULL,
  payment_id         CHAR(36),
  base_amount        DECIMAL(12,2) NOT NULL,
  commission_rate    DECIMAL(5,4) NOT NULL,
  commission_amount  DECIMAL(12,2) NOT NULL,
  currency           VARCHAR(5) NOT NULL DEFAULT 'KES',
  status             VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  paid_at            DATETIME,
  paid_by            CHAR(36),
  payout_reference   VARCHAR(120),
  notes              TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- one award per referral per agent => first payment only.
  UNIQUE KEY uq_sales_agent_commissions_referral_agent (referral_id, agent_id),
  KEY idx_sales_agent_commissions_agent_status (agent_id, status),
  KEY idx_sales_agent_commissions_user (user_id),
  CONSTRAINT fk_sales_agent_commissions_agent    FOREIGN KEY (agent_id)    REFERENCES sales_agents(id)          ON DELETE CASCADE,
  CONSTRAINT fk_sales_agent_commissions_referral FOREIGN KEY (referral_id) REFERENCES sales_agent_referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_agent_commissions_user     FOREIGN KEY (user_id)     REFERENCES users(id)                 ON DELETE CASCADE,
  CONSTRAINT fk_sales_agent_commissions_payment  FOREIGN KEY (payment_id)  REFERENCES payments(id)              ON DELETE SET NULL,
  CONSTRAINT fk_sales_agent_commissions_paid_by  FOREIGN KEY (paid_by)     REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Global default commission rate (10%). Admins can change it in Settings, or
-- override per agent on the agent record.
INSERT IGNORE INTO admin_settings (`key`, value) VALUES
  ('sales_agent_commission_rate', '0.10');

-- ─── Triggers: award a direct sales commission on first completed payment ────
DROP TRIGGER IF EXISTS trg_award_sales_commission_ins;
DROP TRIGGER IF EXISTS trg_award_sales_commission_upd;

DELIMITER $$

CREATE TRIGGER trg_award_sales_commission_ins
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' THEN
    INSERT IGNORE INTO sales_agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status
    )
    SELECT
      UUID(), sr.agent_id, sr.id, NEW.user_id, NEW.id,
      NEW.amount,
      COALESCE(sa.commission_rate,
               (SELECT CAST(value AS DECIMAL(5,4)) FROM admin_settings
                  WHERE `key` = 'sales_agent_commission_rate' LIMIT 1),
               0.10) AS rate,
      ROUND(NEW.amount *
            COALESCE(sa.commission_rate,
                     (SELECT CAST(value AS DECIMAL(5,4)) FROM admin_settings
                        WHERE `key` = 'sales_agent_commission_rate' LIMIT 1),
                     0.10), 2),
      COALESCE(NEW.currency, 'KES'), 'pending'
    FROM sales_agent_referrals sr
    JOIN sales_agents sa ON sa.id = sr.agent_id
    WHERE sr.user_id = NEW.user_id AND sa.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

CREATE TRIGGER trg_award_sales_commission_upd
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT IGNORE INTO sales_agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status
    )
    SELECT
      UUID(), sr.agent_id, sr.id, NEW.user_id, NEW.id,
      NEW.amount,
      COALESCE(sa.commission_rate,
               (SELECT CAST(value AS DECIMAL(5,4)) FROM admin_settings
                  WHERE `key` = 'sales_agent_commission_rate' LIMIT 1),
               0.10) AS rate,
      ROUND(NEW.amount *
            COALESCE(sa.commission_rate,
                     (SELECT CAST(value AS DECIMAL(5,4)) FROM admin_settings
                        WHERE `key` = 'sales_agent_commission_rate' LIMIT 1),
                     0.10), 2),
      COALESCE(NEW.currency, 'KES'), 'pending'
    FROM sales_agent_referrals sr
    JOIN sales_agents sa ON sa.id = sr.agent_id
    WHERE sr.user_id = NEW.user_id AND sa.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

DELIMITER ;
