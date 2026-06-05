// src/modules/user-profile/user-profile.types.ts

export type Gender = 'masculino' | 'feminino' | 'outro' | 'nao_binario'
export type FitnessGoal =
  | 'perda_peso'
  | 'ganho_massa'
  | 'forca'
  | 'resistencia'
  | 'saude_bem_estar'
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado'
export type ActivityLevel =
  | 'sedentario'
  | 'leve'
  | 'moderado'
  | 'ativo'
  | 'muito_ativo'

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
}

export interface UpdateProfileRequest extends CreateProfileRequest {}

export interface ProfileWithCalculated extends UserProfile {
  age: number | null
  bmi: number | null
}

export interface ProfileResponse {
  profile: ProfileWithCalculated
}
