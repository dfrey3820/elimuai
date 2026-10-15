-- ═══════════════════════════════════════════════════════════════════════════
-- ElimuAI Consolidated Schema — MySQL 8.0.13+ / MariaDB 10.6+
-- Converted from PostgreSQL (schema.sql + all migrations folded in).
-- Run inside an already-selected database: mysql <db> < schema.mysql.sql
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── SCHOOLS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  country       ENUM('KE','TZ','UG') NOT NULL DEFAULT 'KE',
  county        VARCHAR(100),
  curriculum    VARCHAR(50) NOT NULL DEFAULT 'CBC',
  address       TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(255),
  logo_url      TEXT,
  plan          ENUM('free','student','teacher','parent','family','school','enterprise') NOT NULL DEFAULT 'free',
  plan_expires  DATETIME,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- role includes 'marketing_agent' (010); plan includes 'teacher','parent' (011);
-- grade_level_updated_at added by 007.
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  school_id       CHAR(36),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(20),
  password_hash   VARCHAR(255),
  role            ENUM('student','teacher','parent','admin','super_admin','marketing_agent') NOT NULL DEFAULT 'student',
  plan            ENUM('free','student','teacher','parent','family','school','enterprise') NOT NULL DEFAULT 'free',
  plan_expires    DATETIME,
  country         ENUM('KE','TZ','UG') NOT NULL DEFAULT 'KE',
  language        ENUM('en','sw') NOT NULL DEFAULT 'en',
  grade_level     VARCHAR(50),
  grade_level_updated_at DATETIME NULL,
  curriculum      VARCHAR(50) DEFAULT 'CBC',
  avatar_url      TEXT,
  streak_days     INT DEFAULT 0,
  streak_last     DATE,
  total_xp        INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  email_verified  BOOLEAN DEFAULT FALSE,
  phone_verified  BOOLEAN DEFAULT FALSE,
  trial_expires   DATETIME,
  last_login      DATETIME,
  onboarded       BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_school  (school_id),
  KEY idx_users_role    (role),
  KEY idx_users_plan    (plan),
  KEY idx_users_country (country),
  CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PARENT-CHILD LINKS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_children (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  parent_id   CHAR(36) NOT NULL,
  child_id    CHAR(36) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_children (parent_id, child_id),
  CONSTRAINT fk_parent_children_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_children_child  FOREIGN KEY (child_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TEACHER-CLASS LINKS ─────────────────────────────────────────────────────
-- subject column added by 005.
CREATE TABLE IF NOT EXISTS classes (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  school_id   CHAR(36),
  teacher_id  CHAR(36) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  grade_level VARCHAR(50),
  curriculum  VARCHAR(50),
  subject     VARCHAR(100),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_classes_teacher_id (teacher_id),
  KEY idx_classes_school_id  (school_id),
  CONSTRAINT fk_classes_school  FOREIGN KEY (school_id)  REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_students (
  class_id    CHAR(36) NOT NULL,
  student_id  CHAR(36) NOT NULL,
  joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_id),
  CONSTRAINT fk_class_students_class   FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_students_student FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SUBJECTS & CURRICULUM ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  name_sw     VARCHAR(100),
  country     ENUM('KE','TZ','UG') NOT NULL,
  curriculum  VARCHAR(50) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  icon        VARCHAR(10) DEFAULT '📚',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AI CONVERSATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sessions (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  subject_id  CHAR(36),
  type        VARCHAR(30) NOT NULL DEFAULT 'tutor',
  language    ENUM('en','sw') DEFAULT 'en',
  messages    JSON NOT NULL DEFAULT (JSON_ARRAY()),
  xp_earned   INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ai_sessions_user (user_id, created_at),
  CONSTRAINT fk_ai_sessions_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_sessions_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EXAMS & PAST PAPERS ─────────────────────────────────────────────────────
-- school_id/created_by/updated_at added by 008; questions/ai_generated by 012.
CREATE TABLE IF NOT EXISTS past_papers (
  id            CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  title_sw      VARCHAR(255),
  subject_id    CHAR(36),
  country       ENUM('KE','TZ','UG') NOT NULL,
  curriculum    VARCHAR(50) NOT NULL,
  grade_level   VARCHAR(50) NOT NULL,
  year          INT NOT NULL,
  exam_body     VARCHAR(50),
  pdf_url       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  school_id     CHAR(36) NULL,
  created_by    CHAR(36) NULL,
  questions     JSON NULL,
  ai_generated  BOOLEAN DEFAULT FALSE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_past_papers_school        (school_id),
  KEY idx_past_papers_level_country (country, grade_level),
  CONSTRAINT fk_past_papers_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_attempts (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  past_paper_id   CHAR(36),
  questions       JSON NOT NULL,
  answers         JSON NOT NULL DEFAULT (JSON_OBJECT()),
  score           INT,
  total           INT,
  percentage      DECIMAL(5,2),
  time_taken_secs INT,
  completed       BOOLEAN DEFAULT FALSE,
  xp_earned       INT DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME,
  KEY idx_exam_attempts (user_id, created_at),
  CONSTRAINT fk_exam_attempts_user  FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_attempts_paper FOREIGN KEY (past_paper_id) REFERENCES past_papers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PROGRESS TRACKING ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  subject_id      CHAR(36),
  activity_type   VARCHAR(30) NOT NULL,
  score           DECIMAL(5,2),
  duration_mins   INT DEFAULT 0,
  xp_earned       INT DEFAULT 0,
  notes           TEXT,
  logged_date     DATE DEFAULT (CURRENT_DATE),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_progress_user    (user_id, logged_date),
  KEY idx_progress_subject (subject_id),
  CONSTRAINT fk_progress_logs_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_logs_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subject_scores (
  id           CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id      CHAR(36) NOT NULL,
  subject_id   CHAR(36) NOT NULL,
  avg_score    DECIMAL(5,2) DEFAULT 0,
  attempts     INT DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subject_scores (user_id, subject_id),
  CONSTRAINT fk_subject_scores_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subject_scores_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ACHIEVEMENTS & BADGES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  code        VARCHAR(50) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  name_sw     VARCHAR(100),
  description TEXT,
  desc_sw     TEXT,
  icon        VARCHAR(10) DEFAULT '🏅',
  xp_reward   INT DEFAULT 50,
  criteria    JSON NOT NULL DEFAULT (JSON_OBJECT()),
  UNIQUE KEY uq_achievements_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_achievements (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id         CHAR(36) NOT NULL,
  achievement_id  CHAR(36) NOT NULL,
  earned_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_achievements (user_id, achievement_id),
  CONSTRAINT fk_user_achievements_user        FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── LEADERBOARDS ────────────────────────────────────────────────────────────
-- scope_id is NULLable; MySQL treats NULLs as distinct in unique keys, so the
-- unique key uses a stored generated column that maps NULL -> ''.
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id           CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id      CHAR(36) NOT NULL,
  scope        VARCHAR(20) NOT NULL,
  scope_id     CHAR(36),
  scope_id_key CHAR(36) AS (COALESCE(scope_id, '')) STORED,
  country      ENUM('KE','TZ','UG'),
  period       VARCHAR(10) NOT NULL,
  period_key   VARCHAR(20) NOT NULL,
  xp           INT DEFAULT 0,
  `rank`       INT,
  streak       INT DEFAULT 0,
  tests_taken  INT DEFAULT 0,
  avg_score    DECIMAL(5,2) DEFAULT 0,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_leaderboard_entries (user_id, scope, scope_id_key, period, period_key),
  KEY idx_leaderboard      (scope, period, period_key, xp),
  KEY idx_leaderboard_user (user_id),
  CONSTRAINT fk_leaderboard_entries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  school_id           CHAR(36),
  plan                ENUM('free','student','teacher','parent','family','school','enterprise') NOT NULL,
  billing_cycle       ENUM('monthly','quarterly','semi_annual','annual') DEFAULT 'monthly',
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(5) DEFAULT 'KES',
  method              ENUM('mpesa','airtel_money','tkash','card','bank') NOT NULL,
  status              ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  mpesa_checkout_id   VARCHAR(100),
  mpesa_receipt       VARCHAR(100),
  phone_number        VARCHAR(20),
  reference           VARCHAR(100),
  invoice_id          CHAR(36),
  coupon_id           CHAR(36),
  coupon_discount     DECIMAL(10,2) DEFAULT 0,
  metadata            JSON DEFAULT (JSON_OBJECT()),
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at        DATETIME,
  UNIQUE KEY uq_payments_reference (reference),
  KEY idx_payments_user   (user_id),
  KEY idx_payments_status (status),
  CONSTRAINT fk_payments_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_school FOREIGN KEY (school_id) REFERENCES schools(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── INVOICES ────────────────────────────────────────────────────────────────
-- coupon_code / coupon_discount / subtotal added by migrate_coupons.
CREATE TABLE IF NOT EXISTS invoices (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  invoice_number  VARCHAR(50) NOT NULL,
  user_id         CHAR(36) NOT NULL,
  payment_id      CHAR(36),
  plan            ENUM('free','student','teacher','parent','family','school','enterprise') NOT NULL,
  billing_cycle   ENUM('monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'monthly',
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(5) DEFAULT 'KES',
  status          ENUM('draft','pending','paid','overdue','cancelled') DEFAULT 'pending',
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  due_date        DATE NOT NULL,
  paid_at         DATETIME,
  coupon_code     VARCHAR(50),
  coupon_discount DECIMAL(10,2) DEFAULT 0,
  subtotal        DECIMAL(10,2),
  notes           TEXT,
  metadata        JSON DEFAULT (JSON_OBJECT()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_number (invoice_number),
  KEY idx_invoices_user   (user_id, created_at),
  KEY idx_invoices_number (invoice_number),
  CONSTRAINT fk_invoices_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── COUPONS ─────────────────────────────────────────────────────────────────
-- applicable_plans / applicable_cycles were PG text arrays → JSON arrays here.
CREATE TABLE IF NOT EXISTS coupons (
  id                CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  code              VARCHAR(50) NOT NULL,
  description       TEXT,
  type              ENUM('fixed','percentage') NOT NULL DEFAULT 'percentage',
  value             DECIMAL(10,2) NOT NULL,
  min_amount        DECIMAL(10,2) DEFAULT 0,
  max_discount      DECIMAL(10,2),
  applicable_plans  JSON DEFAULT (JSON_ARRAY()),
  applicable_cycles JSON DEFAULT (JSON_ARRAY()),
  max_uses          INT,
  max_uses_per_user INT DEFAULT 1,
  times_used        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  starts_at         DATETIME,
  expires_at        DATETIME,
  created_by        CHAR(36),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coupons_code (code),
  KEY idx_coupons_code (code),
  CONSTRAINT fk_coupons_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_usages (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  coupon_id   CHAR(36) NOT NULL,
  user_id     CHAR(36) NOT NULL,
  payment_id  CHAR(36),
  discount    DECIMAL(10,2) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_coupon_usages_user (coupon_id, user_id),
  CONSTRAINT fk_coupon_usages_coupon  FOREIGN KEY (coupon_id)  REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_usages_user    FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_coupon_usages_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── WEEKLY REPORTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id              CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  student_id      CHAR(36) NOT NULL,
  parent_id       CHAR(36),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  summary         TEXT,
  summary_sw      TEXT,
  subjects_data   JSON DEFAULT (JSON_OBJECT()),
  total_xp        INT DEFAULT 0,
  streak_days     INT DEFAULT 0,
  rank_change     INT DEFAULT 0,
  sent_sms        BOOLEAN DEFAULT FALSE,
  sent_email      BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_reports_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_weekly_reports_parent  FOREIGN KEY (parent_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── OFFLINE CONTENT ─────────────────────────────────────────────────────────
-- school_id/created_by/updated_at added by 009.
CREATE TABLE IF NOT EXISTS offline_lessons (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  subject_id  CHAR(36),
  title       VARCHAR(255) NOT NULL,
  title_sw    VARCHAR(255),
  content     TEXT NOT NULL,
  content_sw  TEXT,
  grade_level VARCHAR(50),
  curriculum  VARCHAR(50),
  order_index INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  school_id   CHAR(36) NULL,
  created_by  CHAR(36) NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_offline_lessons_school (school_id),
  KEY idx_offline_lessons_level  (curriculum, grade_level),
  CONSTRAINT fk_offline_lessons_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  type        ENUM('streak','report','achievement','alert','promo') NOT NULL,
  title       VARCHAR(255) NOT NULL,
  title_sw    VARCHAR(255),
  body        TEXT,
  body_sw     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  metadata    JSON DEFAULT (JSON_OBJECT()),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SMS LOGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  recipient   VARCHAR(20) NOT NULL,
  message     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'sent',
  provider    VARCHAR(30) DEFAULT 'africastalking',
  metadata    JSON DEFAULT (JSON_OBJECT()),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sms_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ADMIN SETTINGS (Key-Value Store) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  `key`       VARCHAR(100) NOT NULL PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  CHAR(36),
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PASSWORD RESET TOKENS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  token       VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_tokens_token (token),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REFRESH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  token       VARCHAR(512) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_tokens_token (token),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── OTP TOKENS (email/login verification) ───────────────────────────────────
-- Final definition from schema.sql (matches Python auth-service ORM);
-- indexes merged from schema.sql + migrate_otp.sql.
CREATE TABLE IF NOT EXISTS otp_tokens (
  id            CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id       CHAR(36),
  email         VARCHAR(255) NOT NULL,
  code          VARCHAR(10) NOT NULL,
  purpose       VARCHAR(30) NOT NULL DEFAULT 'verify_email',
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  attempts      INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 5,
  expires_at    DATETIME NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_otp_tokens_email_purpose (email, purpose),
  KEY idx_otp_tokens_expires       (expires_at),
  KEY idx_otp_email                (email, purpose, created_at),
  KEY idx_otp_user                 (user_id, purpose),
  CONSTRAINT fk_otp_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── USER SESSIONS (migrate_sessions.sql) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id            CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id       CHAR(36) NOT NULL,
  token_jti     VARCHAR(64) NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  is_revoked    BOOLEAN DEFAULT FALSE,
  last_active   DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_sessions_jti (token_jti),
  KEY idx_sessions_user    (user_id, is_revoked),
  KEY idx_sessions_jti     (token_jti),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SUBSCRIPTION NOTIFICATION TRACKING (migrate_sessions.sql) ───────────────
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id                CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id           CHAR(36) NOT NULL,
  notification_type VARCHAR(30) NOT NULL,
  days_before       INT DEFAULT 0,
  channel           VARCHAR(10) DEFAULT 'email',
  sent_email        BOOLEAN DEFAULT FALSE,
  sent_sms          BOOLEAN DEFAULT FALSE,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sub_notif_user (user_id, notification_type, created_at),
  KEY idx_sub_notif_type (notification_type, created_at),
  CONSTRAINT fk_subscription_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SUBSCRIPTION REMINDERS (006) ────────────────────────────────────────────
-- reference stores DATE(users.plan_expires) (NULL for 'free_upgrade' reminders).
-- Unique dedup key on (user_id, kind, reference); NULL reference rows remain
-- distinct, matching the scheduler's free-upgrade cadence logic.
CREATE TABLE IF NOT EXISTS subscription_reminders (
  id          CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  kind        VARCHAR(30) NOT NULL,
  reference   DATE,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sub_reminders_user_kind_ref (user_id, kind, reference),
  KEY idx_sub_reminders_user_kind_sent (user_id, kind, sent_at),
  CONSTRAINT fk_subscription_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CHANNELS: PARTNERS / REFERRALS / CONVERSIONS / COMMISSIONS (003+004) ────
-- channel_type enum includes the CH6 insurance values added by 004.
-- Hierarchy columns (parent_partner_id, network_id, team_code, employee_number,
-- insurance_company) folded in from 004.
CREATE TABLE IF NOT EXISTS partners (
  id                CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  full_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(30),
  mpesa_number      VARCHAR(30),
  channel_type      ENUM('teacher','principal','growth_marketer','affiliate','insurance_agent','insurance_manager','insurance_network_head') NOT NULL,
  region            VARCHAR(100),
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  notes             TEXT,
  parent_partner_id CHAR(36),
  network_id        CHAR(36),
  team_code         VARCHAR(50),
  employee_number   VARCHAR(50),
  insurance_company VARCHAR(255),
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_partners_channel (channel_type),
  KEY idx_partners_status  (status),
  KEY idx_partners_parent  (parent_partner_id),
  KEY idx_partners_network (network_id),
  KEY idx_partners_team    (team_code),
  CONSTRAINT fk_partners_parent FOREIGN KEY (parent_partner_id) REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_codes (
  id           CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  partner_id   CHAR(36) NOT NULL,
  code         VARCHAR(50) NOT NULL,
  channel_type ENUM('teacher','principal','growth_marketer','affiliate','insurance_agent','insurance_manager','insurance_network_head') NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referral_codes_code (code),
  KEY idx_ref_codes_partner (partner_id),
  KEY idx_ref_codes_code    (code),
  CONSTRAINT fk_referral_codes_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversions (
  id                  CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  subscriber_id       VARCHAR(64) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  channel_type        ENUM('teacher','principal','growth_marketer','affiliate','insurance_agent','insurance_manager','insurance_network_head') NOT NULL,
  plan                VARCHAR(30) NOT NULL,
  plan_price_kes      DECIMAL(12,2) NOT NULL,
  payment_provider    VARCHAR(30) NOT NULL,
  provider_txn_id     VARCHAR(120) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  subscription_month  INT NOT NULL DEFAULT 1,
  is_first_conversion BOOLEAN NOT NULL DEFAULT TRUE,
  confirmed_at        DATETIME,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversions_txn (provider_txn_id),
  KEY idx_conv_partner    (partner_id),
  KEY idx_conv_subscriber (subscriber_id),
  KEY idx_conv_status     (status),
  CONSTRAINT fk_conversions_partner FOREIGN KEY (partner_id) REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id                 CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  conversion_id      CHAR(36) NOT NULL,
  partner_id         CHAR(36) NOT NULL,
  channel_type       ENUM('teacher','principal','growth_marketer','affiliate','insurance_agent','insurance_manager','insurance_network_head') NOT NULL,
  commission_type    VARCHAR(40) NOT NULL,
  plan               VARCHAR(30) NOT NULL,
  plan_price_kes     DECIMAL(12,2) NOT NULL,
  commission_rate    DECIMAL(5,4) NOT NULL,
  commission_kes     DECIMAL(12,2) NOT NULL,
  subscription_month INT NOT NULL DEFAULT 1,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending',
  payout_month       DATE,
  paid_at            DATETIME,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comm_partner (partner_id),
  KEY idx_comm_status  (status),
  KEY idx_comm_payout  (payout_month),
  CONSTRAINT fk_commissions_conversion FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE CASCADE,
  CONSTRAINT fk_commissions_partner    FOREIGN KEY (partner_id)    REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CH6: INSURANCE NETWORKS (004) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_networks (
  id                  CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  network_name        VARCHAR(255) NOT NULL,
  head_partner_id     CHAR(36) NOT NULL,
  insurance_company   VARCHAR(255),
  total_agents        INT DEFAULT 0,
  total_managers      INT DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  agreement_signed_at DATETIME,
  notes               TEXT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_insurance_networks_head FOREIGN KEY (head_partner_id) REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ch6_commission_rates (
  id             CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  role           VARCHAR(30) NOT NULL,
  rate           DECIMAL(5,4) NOT NULL,
  effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes          TEXT,
  UNIQUE KEY uq_ch6_commission_rates_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ch6_bulk_import_staging (
  id                      CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  import_batch_id         CHAR(36) NOT NULL,
  `row_number`            INT NOT NULL,
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
  partner_id              CHAR(36),
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_staging_batch    (import_batch_id),
  KEY idx_staging_status   (status),
  KEY idx_staging_employee (employee_number),
  CONSTRAINT fk_ch6_staging_partner FOREIGN KEY (partner_id) REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MARKETING AGENTS (010) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_agents (
  id                 CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  agent_code         VARCHAR(32) NOT NULL,
  commission_rate    DECIMAL(5,4) NOT NULL DEFAULT 0.15 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  payout_method      VARCHAR(32),
  payout_details     JSON NOT NULL DEFAULT (JSON_OBJECT()),
  notes              TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marketing_agents_user (user_id),
  UNIQUE KEY uq_marketing_agents_code (agent_code),
  KEY idx_marketing_agents_active (is_active),
  CONSTRAINT fk_marketing_agents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_referrals (
  id           CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  agent_id     CHAR(36) NOT NULL,
  user_id      CHAR(36) NOT NULL,
  source       VARCHAR(32) NOT NULL DEFAULT 'link',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agent_referrals_user (user_id),
  KEY idx_agent_referrals_agent (agent_id),
  CONSTRAINT fk_agent_referrals_agent FOREIGN KEY (agent_id) REFERENCES marketing_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_referrals_user  FOREIGN KEY (user_id)  REFERENCES users(id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_commissions (
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
  UNIQUE KEY uq_agent_commissions_referral (referral_id),
  KEY idx_agent_commissions_agent_status (agent_id, status),
  KEY idx_agent_commissions_user (user_id),
  CONSTRAINT fk_agent_commissions_agent    FOREIGN KEY (agent_id)    REFERENCES marketing_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_commissions_referral FOREIGN KEY (referral_id) REFERENCES agent_referrals(id)  ON DELETE CASCADE,
  CONSTRAINT fk_agent_commissions_user     FOREIGN KEY (user_id)     REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_agent_commissions_payment  FOREIGN KEY (payment_id)  REFERENCES payments(id)         ON DELETE SET NULL,
  CONSTRAINT fk_agent_commissions_paid_by  FOREIGN KEY (paid_by)     REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT IGNORE INTO admin_settings (`key`, value) VALUES
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
  ('billing_annual_discount', '20');

INSERT IGNORE INTO achievements (code, name, name_sw, description, desc_sw, icon, xp_reward, criteria) VALUES
('streak_3',     '3-Day Streak',     'Msururu wa Siku 3',   'Learn 3 days in a row',          'Jifunza siku 3 mfululizo',              '🔥', 30,  '{"streak_days": 3}'),
('streak_7',     '7-Day Streak',     'Msururu wa Wiki',     'Learn 7 days in a row',          'Jifunza siku 7 mfululizo',              '🔥', 75,  '{"streak_days": 7}'),
('streak_30',    '30-Day Champion',  'Bingwa wa Mwezi',     'Learn 30 days in a row',         'Jifunza siku 30 mfululizo',             '👑', 300, '{"streak_days": 30}'),
('questions_10', 'Curious Mind',     'Akili ya Udadisi',    'Ask 10 AI questions',            'Uliza maswali 10 kwa AI',               '🤔', 25,  '{"ai_questions": 10}'),
('questions_100','Knowledge Seeker', 'Mtafuta Ujuzi',       'Ask 100 AI questions',           'Uliza maswali 100 kwa AI',              '📚', 150, '{"ai_questions": 100}'),
('test_perfect', 'Perfect Score',    'Alama Kamili',        'Score 100% on any test',         'Pata alama 100% kwenye mtihani',        '⭐', 100, '{"exam_score": 100}'),
('test_10',      '10 Tests Done',    'Mtihani 10',          'Complete 10 practice tests',     'Kamilisha mitihani 10',                 '📝', 80,  '{"tests_completed": 10}'),
('top_school',   'Top of School',    'Bora Shuleni',        'Rank #1 in your school',         'Kuwa nambari 1 shuleni',                '🏫', 200, '{"school_rank": 1}'),
('top_country',  'National Star',    'Nyota ya Taifa',      'Rank top 10 in your country',    'Kuwa top 10 nchini',                    '🌍', 500, '{"country_rank": 10}'),
('multilingual', 'Multilingual',     'Lugha Mbili',         'Use app in both EN and Swahili', 'Tumia app kwa Kiingereza na Kiswahili', '🗣️', 50, '{"languages_used": 2}');

INSERT IGNORE INTO ch6_commission_rates (role, rate, notes) VALUES
  ('agent',        0.15, 'Insurance agent - continuous monthly commission on enrolled families'),
  ('manager',      0.08, 'Manager override on all agents in their team'),
  ('network_head', 0.05, 'Network head override across entire network'),
  ('gm_rider',     0.05, 'Growth Marketer rider - consistent across all channels');

-- ═══════════════════════════════════════════════════════════════════════════
-- CH6 REPORTING VIEWS (004)
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- MARKETING AGENT COMMISSION TRIGGERS (010, converted to native MySQL triggers)
-- Awards a first-payment-only commission when a payment becomes 'completed'.
-- INSERT IGNORE + UNIQUE(referral_id) enforces first-payment-only.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_award_agent_commission_ins;
DROP TRIGGER IF EXISTS trg_award_agent_commission_upd;

DELIMITER $$

CREATE TRIGGER trg_award_agent_commission_ins
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' THEN
    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status
    )
    SELECT
      UUID(), ar.agent_id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, ma.commission_rate, ROUND(NEW.amount * ma.commission_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending'
    FROM agent_referrals ar
    JOIN marketing_agents ma ON ma.id = ar.agent_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

CREATE TRIGGER trg_award_agent_commission_upd
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    INSERT IGNORE INTO agent_commissions (
      id, agent_id, referral_id, user_id, payment_id,
      base_amount, commission_rate, commission_amount, currency, status
    )
    SELECT
      UUID(), ar.agent_id, ar.id, NEW.user_id, NEW.id,
      NEW.amount, ma.commission_rate, ROUND(NEW.amount * ma.commission_rate, 2),
      COALESCE(NEW.currency, 'KES'), 'pending'
    FROM agent_referrals ar
    JOIN marketing_agents ma ON ma.id = ar.agent_id
    WHERE ar.user_id = NEW.user_id AND ma.is_active = TRUE
    LIMIT 1;
  END IF;
END$$

DELIMITER ;
