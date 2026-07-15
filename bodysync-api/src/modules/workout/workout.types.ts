// src/modules/workout/workout.types.ts
import { Exercise } from '../exercise/exercise.types'

// Exercício dentro de um plano (com dados do catálogo embutidos)
export interface PlanExercise {
  id: number
  exerciseId: number
  sets: number
  reps: number
  orderIndex: number
  exercise: Pick<
    Exercise,
    'id' | 'name' | 'category' | 'imageUrl' | 'muscles'
  > | null
}

export interface WorkoutPlan {
  id: number
  userId: string
  name: string
  createdAt: string
  exercises: PlanExercise[]
}

// Resumo (para listagem)
export interface WorkoutPlanSummary {
  id: number
  name: string
  createdAt: string
  exerciseCount: number
}

// Item enviado ao criar/atualizar um plano
export interface PlanExerciseInput {
  exerciseId: number
  sets: number
  reps: number
}

export interface CreatePlanRequest {
  name: string
  exercises?: PlanExerciseInput[]
}

export interface UpdatePlanRequest {
  name?: string
  exercises?: PlanExerciseInput[]
}

// Rascunho gerado pela "IA" (não persistido — o usuário customiza e salva depois)
export interface WorkoutPlanDraft {
  name: string
  goal: string | null
  exercises: PlanExercise[]
}

// Elegibilidade / limites por tipo de conta
export interface PlanEligibility {
  role: string
  subscriptionType: string
  limit: number | null // null = ilimitado
  used: number
  canCreate: boolean
  reason: string | null // motivo quando não pode criar
}

export interface WorkoutPlansResult {
  plans: WorkoutPlanSummary[]
  meta: PlanEligibility
}
