-- ============================================================================
-- Migration 006: Avaliações Físicas e Pareceres do Personal Trainer
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  evaluated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes TEXT NOT NULL CHECK (char_length(btrim(notes)) BETWEEN 1 AND 1500),
  weight_kg NUMERIC(5, 2) CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 500)),
  body_fat_pct NUMERIC(4, 1) CHECK (body_fat_pct IS NULL OR (body_fat_pct >= 1 AND body_fat_pct <= 70)),
  chest_cm NUMERIC(5, 1) CHECK (chest_cm IS NULL OR (chest_cm > 0 AND chest_cm <= 300)),
  waist_cm NUMERIC(5, 1) CHECK (waist_cm IS NULL OR (waist_cm > 0 AND waist_cm <= 300)),
  arm_cm NUMERIC(5, 1) CHECK (arm_cm IS NULL OR (arm_cm > 0 AND arm_cm <= 150)),
  thigh_cm NUMERIC(5, 1) CHECK (thigh_cm IS NULL OR (thigh_cm > 0 AND thigh_cm <= 200)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices cobrindo chaves estrangeiras e listagem ordenada por aluno/data
CREATE INDEX IF NOT EXISTS idx_student_evaluations_student_date
  ON public.student_evaluations (student_id, evaluated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_evaluations_trainer_id
  ON public.student_evaluations (trainer_id);

-- Segurança em profundidade: RLS ativado e bloqueio ao PostgREST público
ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_evaluations FROM anon, authenticated;

-- Trigger de updated_at consistente
DROP TRIGGER IF EXISTS update_student_evaluations_updated_at ON public.student_evaluations;
CREATE TRIGGER update_student_evaluations_updated_at
  BEFORE UPDATE ON public.student_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
