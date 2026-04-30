-- ═══════════════════════════════════════════════════════════════════════════
-- ElimuAI Database Schema v1.0
-- PostgreSQL 15+
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'parent', 'admin', 'super_admin');
CREATE TYPE plan_type AS ENUM ('free', 'student', 'family', 'school', 'enterprise');
CREATE TYPE country_code AS ENUM ('KE', 'TZ', 'UG');
CREATE TYPE language_code AS ENUM ('en', 'sw');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('mpesa', 'airtel_money', 'tkash', 'card', 'bank');
CREATE TYPE notification_type AS ENUM ('streak', 'report', 'achievement', 'alert', 'promo');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE coupon_type AS ENUM ('fixed', 'percentage');

-- ─── SCHOOLS ─────────────────────────────────────────────────────────────────
CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  country       country_code NOT NULL DEFAULT 'KE',
  county        VARCHAR(100),
  curriculum    VARCHAR(50) NOT NULL DEFAULT 'CBC',
  address       TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(255),
  logo_url      TEXT,
  plan          plan_type NOT NULL DEFAULT 'free',
  plan_expires  TIMESTAMP,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20) UNIQUE,
  password_hash   VARCHAR(255),
  role            user_role NOT NULL DEFAULT 'student',
  plan            plan_type NOT NULL DEFAULT 'free',
  plan_expires    TIMESTAMP,
  country         country_code NOT NULL DEFAULT 'KE',
  language        language_code NOT NULL DEFAULT 'en',
  grade_level     VARCHAR(50),
  curriculum      VARCHAR(50) DEFAULT 'CBC',
  avatar_url      TEXT,
  streak_days     INTEGER DEFAULT 0,
  streak_last     DATE,
  total_xp        INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  email_verified  BOOLEAN DEFAULT FALSE,
  phone_verified  BOOLEAN DEFAULT FALSE,
  trial_expires   TIMESTAMP,
  last_login      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─── PARENT-CHILD LINKS ───────────────────────────────────────────────────────
CREATE TABLE parent_children (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- ─── TEACHER-CLASS LINKS ──────────────────────────────────────────────────────
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  grade_level VARCHAR(50),
  curriculum  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE class_students (
  class_id    UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- ─── SUBJECTS & CURRICULUM ───────────────────────────────────────────────────
CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  name_sw     VARCHAR(100),                         -- Swahili name
  country     country_code NOT NULL,
  curriculum  VARCHAR(50) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  icon        VARCHAR(10) DEFAULT '📚',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── AI CONVERSATIONS ────────────────────────────────────────────────────────
CREATE TABLE ai_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id  UUID REFERENCES subjects(id),
  type        VARCHAR(30) NOT NULL DEFAULT 'tutor', -- tutor|homework|exam_help
  language    language_code DEFAULT 'en',
  messages    JSONB NOT NULL DEFAULT '[]',
  xp_earned   INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── EXAMS & PAST PAPERS ─────────────────────────────────────────────────────
CREATE TABLE past_papers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  title_sw    VARCHAR(255),
  subject_id  UUID REFERENCES subjects(id),
  country     country_code NOT NULL,
  curriculum  VARCHAR(50) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  year        INTEGER NOT NULL,
  exam_body   VARCHAR(50),        -- KCSE, NECTA, UNEB, KCPE...
  pdf_url     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  past_paper_id   UUID REFERENCES past_papers(id),
  questions       JSONB NOT NULL,
  answers         JSONB NOT NULL DEFAULT '{}',
  score           INTEGER,
  total           INTEGER,
  percentage      NUMERIC(5,2),
  time_taken_secs INTEGER,
  completed       BOOLEAN DEFAULT FALSE,
  xp_earned       INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP
);

-- ─── PROGRESS TRACKING ───────────────────────────────────────────────────────
CREATE TABLE progress_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id),
  activity_type   VARCHAR(30) NOT NULL,  -- tutor|exam|homework|lesson
  score           NUMERIC(5,2),
  duration_mins   INTEGER DEFAULT 0,
  xp_earned       INTEGER DEFAULT 0,
  notes           TEXT,
  logged_date     DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subject_scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id),
  avg_score   NUMERIC(5,2) DEFAULT 0,
  attempts    INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_id)
);

-- ─── ACHIEVEMENTS & BADGES ───────────────────────────────────────────────────
CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  name_sw     VARCHAR(100),
  description TEXT,
  desc_sw     TEXT,
  icon        VARCHAR(10) DEFAULT '🏅',
  xp_reward   INTEGER DEFAULT 50,
  criteria    JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id),
  earned_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ─── LEADERBOARDS ────────────────────────────────────────────────────────────
CREATE TABLE leaderboard_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope       VARCHAR(20) NOT NULL,       -- global|country|school|class
  scope_id    UUID,                        -- school_id or class_id (null for global/country)
  country     country_code,
  period      VARCHAR(10) NOT NULL,        -- weekly|monthly|all_time
  period_key  VARCHAR(20) NOT NULL,        -- e.g. 2024-W12 | 2024-03 | all
  xp          INTEGER DEFAULT 0,
  rank        INTEGER,
  streak      INTEGER DEFAULT 0,
  tests_taken INTEGER DEFAULT 0,
  avg_score   NUMERIC(5,2) DEFAULT 0,
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, scope, scope_id, period, period_key)
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id           UUID REFERENCES schools(id),
  plan                plan_type NOT NULL,
  billing_cycle       billing_cycle DEFAULT 'monthly',
  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(5) DEFAULT 'KES',
  method              payment_method NOT NULL,
  status              payment_status DEFAULT 'pending',
  -- M-Pesa specific
  mpesa_checkout_id   VARCHAR(100),
  mpesa_receipt       VARCHAR(100),
  phone_number        VARCHAR(20),
  -- General
  reference           VARCHAR(100) UNIQUE,
  invoice_id          UUID,
  coupon_id           UUID,
  coupon_discount     NUMERIC(10,2) DEFAULT 0,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMP DEFAULT NOW(),
  completed_at        TIMESTAMP
);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
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

CREATE INDEX idx_invoices_user ON invoices(user_id, created_at DESC);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ─── COUPONS ─────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
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

CREATE INDEX idx_coupons_code ON coupons(code);

CREATE TABLE coupon_usages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id  UUID REFERENCES payments(id),
  discount    NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupon_usages_user ON coupon_usages(coupon_id, user_id);

-- ─── WEEKLY REPORTS ──────────────────────────────────────────────────────────
CREATE TABLE weekly_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES users(id),
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  summary         TEXT,
  summary_sw      TEXT,
  subjects_data   JSONB DEFAULT '{}',
  total_xp        INTEGER DEFAULT 0,
  streak_days     INTEGER DEFAULT 0,
  rank_change     INTEGER DEFAULT 0,
  sent_sms        BOOLEAN DEFAULT FALSE,
  sent_email      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─── OFFLINE CONTENT ─────────────────────────────────────────────────────────
CREATE TABLE offline_lessons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID REFERENCES subjects(id),
  title       VARCHAR(255) NOT NULL,
  title_sw    VARCHAR(255),
  content     TEXT NOT NULL,
  content_sw  TEXT,
  grade_level VARCHAR(50),
  curriculum  VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(255) NOT NULL,
  title_sw    VARCHAR(255),
  body        TEXT,
  body_sw     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── SMS LOGS ─────────────────────────────────────────────────────────────────
CREATE TABLE sms_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient   VARCHAR(20) NOT NULL,
  message     TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'sent',
  provider    VARCHAR(30) DEFAULT 'africastalking',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_created ON sms_logs(created_at DESC);

-- ─── ADMIN SETTINGS (Key-Value Store) ────────────────────────────────────────
CREATE TABLE admin_settings (
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

-- ─── PASSWORD RESET TOKENS ───────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── REFRESH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(512) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_school     ON users(school_id);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_plan       ON users(plan);
CREATE INDEX idx_users_country    ON users(country);
CREATE INDEX idx_progress_user    ON progress_logs(user_id, logged_date DESC);
CREATE INDEX idx_progress_subject ON progress_logs(subject_id);
CREATE INDEX idx_exam_attempts    ON exam_attempts(user_id, created_at DESC);
CREATE INDEX idx_leaderboard      ON leaderboard_entries(scope, period, period_key, xp DESC);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX idx_ai_sessions_user ON ai_sessions(user_id, created_at DESC);
CREATE INDEX idx_payments_user    ON payments(user_id);
CREATE INDEX idx_payments_status  ON payments(status);
CREATE INDEX idx_notifications    ON notifications(user_id, is_read, created_at DESC);

-- ─── TRIGGERS — auto update updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at  BEFORE UPDATE ON schools  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── SEED ACHIEVEMENTS ────────────────────────────────────────────────────────
INSERT INTO achievements (code, name, name_sw, description, desc_sw, icon, xp_reward, criteria) VALUES
('streak_3',    '3-Day Streak',     'Msururu wa Siku 3',   'Learn 3 days in a row',          'Jifunza siku 3 mfululizo',     '🔥', 30,  '{"streak_days": 3}'),
('streak_7',    '7-Day Streak',     'Msururu wa Wiki',     'Learn 7 days in a row',          'Jifunza siku 7 mfululizo',     '🔥', 75,  '{"streak_days": 7}'),
('streak_30',   '30-Day Champion',  'Bingwa wa Mwezi',     'Learn 30 days in a row',         'Jifunza siku 30 mfululizo',    '👑', 300, '{"streak_days": 30}'),
('questions_10','Curious Mind',     'Akili ya Udadisi',    'Ask 10 AI questions',            'Uliza maswali 10 kwa AI',      '🤔', 25,  '{"ai_questions": 10}'),
('questions_100','Knowledge Seeker','Mtafuta Ujuzi',       'Ask 100 AI questions',           'Uliza maswali 100 kwa AI',     '📚', 150, '{"ai_questions": 100}'),
('test_perfect', 'Perfect Score',   'Alama Kamili',        'Score 100% on any test',         'Pata alama 100% kwenye mtihani','⭐', 100, '{"exam_score": 100}'),
('test_10',      '10 Tests Done',   'Mtihani 10',          'Complete 10 practice tests',     'Kamilisha mitihani 10',        '📝', 80,  '{"tests_completed": 10}'),
('top_school',   'Top of School',   'Bora Shuleni',        'Rank #1 in your school',         'Kuwa nambari 1 shuleni',       '🏫', 200, '{"school_rank": 1}'),
('top_country',  'National Star',   'Nyota ya Taifa',      'Rank top 10 in your country',    'Kuwa top 10 nchini',           '🌍', 500, '{"country_rank": 10}'),
('multilingual', 'Multilingual',    'Lugha Mbili',         'Use app in both EN and Swahili', 'Tumia app kwa Kiingereza na Kiswahili', '🗣️', 50, '{"languages_used": 2}');

COMMENT ON TABLE users IS 'Core users table — students, teachers, parents, admins';
COMMENT ON TABLE leaderboard_entries IS 'Cached leaderboard data, refreshed hourly by cron';
COMMENT ON TABLE ai_sessions IS 'Full AI conversation history per user';
COMMENT ON TABLE weekly_reports IS 'Auto-generated weekly summaries sent to parents';
