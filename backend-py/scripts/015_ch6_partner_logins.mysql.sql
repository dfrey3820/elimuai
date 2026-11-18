-- ============================================================================
-- 015_ch6_partner_logins.mysql.sql   (MySQL 8.0+ / MariaDB 10.6+)
--
-- CH6 insurance partners can now have login accounts:
--   * users.role gains 'insurance_manager' and 'insurance_agent'
--   * partners.user_id links a partner to their login (users.id)
--
-- Idempotent: guarded with information_schema so it is safe to re-run.
-- ============================================================================

SET @db := DATABASE();

-- ─── users.role: add insurance_manager / insurance_agent ─────────────────────
ALTER TABLE users
  MODIFY COLUMN role
  ENUM('student','teacher','parent','admin','super_admin','marketing_agent','insurance_manager','insurance_agent')
  NOT NULL DEFAULT 'student';

-- ─── partners.user_id ────────────────────────────────────────────────────────
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='partners' AND COLUMN_NAME='user_id');
SET @sql := IF(@exists=0,
  "ALTER TABLE partners ADD COLUMN user_id CHAR(36) NULL AFTER insurance_company",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA=@db AND TABLE_NAME='partners' AND INDEX_NAME='idx_partners_user');
SET @sql := IF(@exists=0,
  "ALTER TABLE partners ADD KEY idx_partners_user (user_id)",
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
