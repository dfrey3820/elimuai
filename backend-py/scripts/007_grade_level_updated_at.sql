-- 007_grade_level_updated_at.sql
-- Tracks the last time a student's grade_level (class) was updated,
-- so students can only change their class once per year (365 days).
-- Idempotent.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS grade_level_updated_at TIMESTAMPTZ NULL;

-- Backfill: for users that already have a grade_level, treat it as set now.
UPDATE users
   SET grade_level_updated_at = NOW()
 WHERE grade_level IS NOT NULL
   AND grade_level_updated_at IS NULL;
