-- ============================================================================
-- Migration 005: Persistência de descanso em plan_exercises, FK segura em
--                workout_sessions (ON DELETE SET NULL) e unicidade de invite_code
-- ============================================================================

-- 1. Persistir descanso (segundos) por exercício prescrito/planejado
ALTER TABLE public.plan_exercises
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER NOT NULL DEFAULT 60;

ALTER TABLE public.plan_exercises
  DROP CONSTRAINT IF EXISTS plan_exercises_rest_seconds_check;

ALTER TABLE public.plan_exercises
  ADD CONSTRAINT plan_exercises_rest_seconds_check
  CHECK (rest_seconds >= 10 AND rest_seconds <= 600);

-- 2. Permitir excluir planos de treino sem quebrar histórico de sessões
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_plan_id_fkey;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_plan_id_fkey
  FOREIGN KEY (plan_id)
  REFERENCES public.workout_plans(id)
  ON DELETE SET NULL;

-- 3. Garantir unicidade do código de convite mestre entre treinadores
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_master_code_unique_code
  ON public.trainer_students(invite_code)
  WHERE invite_code IS NOT NULL AND student_id IS NULL;
