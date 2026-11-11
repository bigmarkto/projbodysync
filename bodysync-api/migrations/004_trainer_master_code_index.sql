-- ============================================================================
-- Migration 004: Partial Unique Index for Trainer Master Invite Code
-- ============================================================================

-- Remove eventuais duplicatas antigas de código mestre caso existam
DELETE FROM public.trainer_students a
USING public.trainer_students b
WHERE a.ctid < b.ctid
  AND a.student_id IS NULL
  AND b.student_id IS NULL
  AND a.trainer_id = b.trainer_id;

-- Garante unicidade de 1 código mestre (student_id IS NULL) por Personal Trainer
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_master_code_unique
  ON public.trainer_students(trainer_id)
  WHERE student_id IS NULL;
