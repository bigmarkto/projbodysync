// src/modules/exercise/exercise.types.ts

export interface ExerciseMuscle {
  id: number
  name: string
  isPrimary: boolean
}

export interface Exercise {
  id: number
  wgerId: number | null
  name: string // prefere name_pt, cai para name (inglês)
  description: string | null // prefere description_pt
  category: string | null
  imageUrl: string | null
  muscles: ExerciseMuscle[]
}

export interface ListExercisesQuery {
  search?: string
  category?: string
  muscleId?: number
  limit?: number
  offset?: number
}

export interface ListExercisesResult {
  exercises: Exercise[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export interface MuscleGroup {
  id: number
  name: string
  wgerId: number | null
}
