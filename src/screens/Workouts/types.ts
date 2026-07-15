// Tipos espelhando a API de exercícios/planos

export interface Muscle {
  id: number;
  name: string;
  isPrimary: boolean;
}

export interface ExerciseLite {
  id: number;
  name: string;
  category: string | null;
  imageUrl: string | null;
  muscles: Muscle[];
}

// Exercício de catálogo completo (GET /exercises)
export interface Exercise extends ExerciseLite {
  wgerId: number | null;
  description: string | null;
}

export interface PlanExercise {
  id: number;
  exerciseId: number;
  sets: number;
  reps: number;
  orderIndex: number;
  exercise: ExerciseLite | null;
}

export interface PlanSummary {
  id: number;
  name: string;
  createdAt: string;
  exerciseCount: number;
}

export interface PlanDetail {
  id: number;
  userId: string;
  name: string;
  createdAt: string;
  exercises: PlanExercise[];
}

export interface PlanDraft {
  name: string;
  goal: string | null;
  exercises: PlanExercise[];
}

export interface PlanMeta {
  role: string;
  subscriptionType: string;
  limit: number | null; // null = ilimitado
  used: number;
  canCreate: boolean;
  reason: string | null;
}

// Estado editável do plano (novo, gerado ou existente)
export interface EditablePlan {
  id: number | null; // null = ainda não salvo
  name: string;
  exercises: PlanExercise[];
}
