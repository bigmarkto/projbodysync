-- ============================================================================
-- Migration 002: Security, RLS Hardening & Index Performance
-- ============================================================================

-- 1. SEGURANÇA: Revogar privilégios de PostgREST nas roles públicas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Impedir que novas tabelas criadas no futuro fiquem públicas por padrão
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- 2. SEGURANÇA: Ativar RLS em todas as tabelas (Defesa em Profundidade)
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

-- 3. SEGURANÇA: Corrigir search_path da função de atualização
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. INTEGRIDADE: Trigger em hydration_logs
DROP TRIGGER IF EXISTS update_hydration_logs_updated_at ON public.hydration_logs;
CREATE TRIGGER update_hydration_logs_updated_at
  BEFORE UPDATE ON public.hydration_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. PERFORMANCE: Eliminar índices duplicados / redundantes
DROP INDEX IF EXISTS public.idx_hydration_logs_user_date;
DROP INDEX IF EXISTS public.idx_reset_tokens_token;
DROP INDEX IF EXISTS public.idx_user_profiles_user_id;

-- 6. PERFORMANCE: Índices cobrindo todas as Foreign Keys (Linter 0001)
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_id ON public.workout_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON public.plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_id ON public.plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON public.session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_exercise_id ON public.session_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle_id ON public.exercise_muscles(muscle_id);

-- 7. PERFORMANCE: Índices Compostos para Consultas Frequentes (Filtro + Ordenação)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_finished ON public.workout_sessions (user_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_measured ON public.body_measurements (user_id, measured_at ASC);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_order ON public.plan_exercises (plan_id, order_index ASC);

