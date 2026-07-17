-- 005_teacher_class_subject.sql
-- Add subject column to classes so a teacher can be tied to a class + subject at onboarding.
-- Idempotent.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id  ON classes(school_id);
