// src/modules/user-profile/user-profile.types.ts

// Importar tipos de auth (NÃO redefinir!)
import {
  Gender,
  FitnessGoal,
  ExperienceLevel,
  ActivityLevel,
  ConsistencyScore,
  WorkoutSchedule,
} from '../auth/auth.types'

// Re-exportar para facilitar imports em outros arquivos
export type { Gender, FitnessGoal, ExperienceLevel, ActivityLevel }

export interface UserProfile {
  id: string
  userId: string
  weightKg: number | null
  heightCm: number | null
  birthDate: string | null
  gender: Gender | null
  fitnessGoal: FitnessGoal | null
  experienceLevel: ExperienceLevel | null
  activityLevel: ActivityLevel | null
  workoutDays: number | null
  createdAt: string
  updatedAt: string
  // Novos campos de condição física
  workoutFrequency: number | null
  lastWorkoutDate: string | null
  consistencyScore: ConsistencyScore | null
  // Campos de preferência
  subscriptionType: string | null
  desiredWeightKg: number | null
  hydrationReminder: boolean | null
  desiredModality: string | null
  workoutSchedule: WorkoutSchedule[] | null
}

export interface CreateProfileRequest {
  weightKg?: number
  heightCm?: number
  birthDate?: string
  gender?: Gender
  fitnessGoal?: FitnessGoal
  experienceLevel?: ExperienceLevel
  activityLevel?: ActivityLevel
  workoutDays?: number
  // Novos campos
  workoutFrequency?: number
  lastWorkoutDate?: string
  consistencyScore?: ConsistencyScore
  subscriptionType?: 'free' | 'basic' | 'premium'
  desiredWeightKg?: number
  hydrationReminder?: boolean
  desiredModality?: string
  workoutSchedule?: WorkoutSchedule[]
}

export interface UpdateProfileRequest extends CreateProfileRequest {}

export interface ProfileWithCalculated extends UserProfile {
  age: number | null
  bmi: number | null
}

export interface ProfileResponse {
  profile: ProfileWithCalculated
}
