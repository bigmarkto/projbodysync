-- ============================================================================
-- Migration 003: Personal Trainer Module (trainer_students, invite codes & plans)
-- ============================================================================

-- 1. Tabela de vínculo entre Treinador e Aluno
CREATE TABLE IF NOT EXISTS public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code VARCHAR(12),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trainer_student_unique UNIQUE (trainer_id, student_id)
);

-- 2. Coluna para identificar o Personal criador no plano de treino
ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS created_by_trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Índices de alta performance cobrindo chaves estrangeiras e buscas frequentes
CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer_id ON public.trainer_students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_student_id ON public.trainer_students(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_code ON public.trainer_students(invite_code);
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainer_id ON public.workout_plans(created_by_trainer_id);

-- 4. Segurança em Profundidade: RLS Ativado
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

-- 5. Trigger de updated_at consistente
DROP TRIGGER IF EXISTS update_trainer_students_updated_at ON public.trainer_students;
CREATE TRIGGER update_trainer_students_updated_at
  BEFORE UPDATE ON public.trainer_students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
