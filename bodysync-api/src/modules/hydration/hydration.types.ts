// src/modules/hydration/hydration.types.ts

// Constantes do domínio de hidratação
export const CUP_SIZE_ML = 250 // tamanho padrão de 1 copo
export const ML_PER_KG = 35 // recomendação: 35ml por kg de peso corporal
export const DEFAULT_GOAL_ML = 2000 // fallback quando o peso é desconhecido
export const MIN_GOAL_ML = 500
export const MAX_GOAL_ML = 8000

// Status de hidratação do dia
export interface HydrationStatus {
  date: string // "YYYY-MM-DD"
  consumedMl: number
  goalMl: number // meta efetiva (custom ?? sugerida)
  suggestedGoalMl: number // calculada pelo peso (peso × 35)
  customGoalMl: number | null // meta definida pelo usuário (null = usa a sugerida)
  cupSizeMl: number
  cups: {
    consumed: number
    total: number
  }
  percentage: number // 0–100
}

export interface AddIntakeRequest {
  amountMl?: number // padrão: 1 copo (250ml); aceita negativo para desfazer
}

export interface SetGoalRequest {
  goalMl?: number | null // null zera a meta custom e volta para a sugerida
}
