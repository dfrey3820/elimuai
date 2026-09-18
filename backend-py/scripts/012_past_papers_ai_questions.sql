-- 012_past_papers_ai_questions.sql
-- Inline AI-generated questions on past_papers (used by learning-service
-- POST /api/exams/generate). Previously only applied ad hoc.

ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS questions JSONB NULL;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
