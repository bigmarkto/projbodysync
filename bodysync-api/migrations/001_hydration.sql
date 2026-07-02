-- ============================================================================
-- Migration: Hidratação
-- Rode este script no SQL Editor do Supabase (uma única vez).
-- ============================================================================

-- 1. Meta personalizada de água (ml/dia) no perfil.
--    NULL = usar a meta sugerida (peso × 35ml), calculada em tempo de execução.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS hydration_goal_ml INTEGER;

-- 2. Registro diário de consumo de água (1 linha por usuário por dia).
CREATE TABLE IF NOT EXISTS hydration_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  consumed_ml INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hydration_logs_user_date_unique UNIQUE (user_id, log_date)
);

-- 3. Índice para consultas por usuário + data.
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date
  ON hydration_logs (user_id, log_date);
