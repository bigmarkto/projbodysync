export type Gender = 'masculino' | 'feminino' | 'outro' | 'nao_binario'
export type FitnessGoal =
  | 'emagrecimento'
  | 'ganho_peso'
  | 'ganho_massa_muscular'
  | 'condicionamento_fisico'
  | 'saude_bem_estar'
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado'
export type ActivityLevel =
  | 'sedentario'
  | 'leve'
  | 'moderado'
  | 'ativo'
  | 'muito_ativo'

export interface RegisterRequest {
  email: string
  password: string
  name: string
  heightCm: number
  birthDate: string
  weightKg: number
  gender: Gender
  fitnessGoal: FitnessGoal
  experienceLevel?: ExperienceLevel
  activityLevel?: ActivityLevel
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
  experienceLevel: ExperienceLevel
  activityLevel: ActivityLevel
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  userId: string
  email: string
}
