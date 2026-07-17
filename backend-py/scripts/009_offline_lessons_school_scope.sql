-- 009_offline_lessons_school_scope.sql
-- Adds school scoping to offline_lessons so teachers/admins can author lessons
-- for their own school. NULL school_id = globally visible lesson (super_admin curated).

ALTER TABLE offline_lessons ADD COLUMN IF NOT EXISTS school_id UUID NULL;
ALTER TABLE offline_lessons ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE offline_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_offline_lessons_school ON offline_lessons(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offline_lessons_level ON offline_lessons(curriculum, grade_level) WHERE is_active = TRUE;
