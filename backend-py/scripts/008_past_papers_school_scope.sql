-- 008_past_papers_school_scope.sql
-- Adds school scoping to past_papers so teachers/admins can create papers for
-- their own school. NULL school_id = globally visible paper (super_admin curated).

ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS school_id UUID NULL;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS created_by UUID NULL;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_past_papers_school ON past_papers(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_past_papers_level_country ON past_papers(country, grade_level) WHERE is_active = TRUE;
