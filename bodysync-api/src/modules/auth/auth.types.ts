// src/modules/auth/auth.types.ts

export type Gender = 'masculino' | 'feminino' | 'outro' | 'nao_binario'

export type FitnessGoal =
  | 'emagrecimento'
  | 'ganho_peso'
  | 'ganho_massa_muscular'
  | 'condicionamento_fisico'
  | 'saude_bem_estar'

/**
 * @deprecated Usado apenas para personalização de UI e histórico.
 * NÃO restringe acesso a exercícios.
 */
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado'

export type ActivityLevel =
  | 'sedentario'
  | 'leve'
  | 'moderado'
  | 'ativo'
  | 'muito_ativo'

export type UserRole = 'comum' | 'admin' | 'professor'

// Nova estrutura de horário: array de 7 booleanos + horário único
// Índice do array: [0=domingo, 1=segunda, 2=terca, 3=quarta, 4=quinta, 5=sexta, 6=sabado]
export interface WorkoutSchedule {
  days: boolean[] // Array fixo de 7 posições
  time: string | null // Horário único no formato HH:MM (ex: "18:00") ou null
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  heightCm: number
  birthDate: string
  weightKg: number
  gender: Gender
  fitnessGoal: FitnessGoal
  role: UserRole // 'comum' | 'admin' | 'professor'

  // Campo informativo (não restritivo)
  experienceLevel?: ExperienceLevel

  // Campos que DEFINEM a recomendação (condição atual)
  activityLevel: ActivityLevel // Obrigatório: base da recomendação
  workoutFrequency: number | null // dias por semana (0-7)
  lastWorkoutDate?: string // YYYY-MM-DD - quando treinou pela última vez

  // Novos campos de preferências
  subscriptionType: 'free' | 'basic' | 'premium'
  desiredWeightKg?: number | null
  hydrationReminder: boolean
  desiredModality: string

  // Horário de treino: array de 7 booleanos + horário único
  workoutSchedule?: WorkoutSchedule
}

export interface LoginRequest {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  name: string
  heightCm: number
  birthDate: string
  weightKg: number
  gender: Gender
  fitnessGoal: FitnessGoal
  role: UserRole

  // Campo informativo
  experienceLevel: ExperienceLevel | null

  // Campos de condição atual
  activityLevel: ActivityLevel
  workoutFrequency: number | null
  lastWorkoutDate: string | null
  

  // Preferências
  subscriptionType: string
  desiredWeightKg: number | null
  hydrationReminder: boolean
  desiredModality: string | null
  workoutSchedule: WorkoutSchedule | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
}
