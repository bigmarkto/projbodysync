// src/modules/user-profile/user-profile.service.ts
import { db } from '../../config/database'
import {
  CreateProfileRequest,
  UpdateProfileRequest,
  UserProfile,
  ProfileResponse,
} from './user-profile.types'

// Função auxiliar para calcular idade
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

// Função auxiliar para calcular IMC
function calculateBMI(
  weightKg: number | string | null,
  heightCm: number | null
): number | null {
  const weight = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg

  if (!weight || !heightCm) return null
  const heightM = heightCm / 100
  return Number((weight / (heightM * heightM)).toFixed(2))
}

// Função para converter dados do banco (snake_case) para a aplicação (camelCase)
function mapDbRowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    birthDate: row.birth_date,
    gender: row.gender,
    fitnessGoal: row.fitness_goal,
    experienceLevel: row.experience_level,
    activityLevel: row.activity_level,
    workoutDays: row.workout_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Função auxiliar para montar a resposta com campos calculados
function buildProfileResponse(profile: UserProfile): ProfileResponse {
  const age = calculateAge(profile.birthDate)
  const bmi = calculateBMI(profile.weightKg, profile.heightCm)

  return {
    profile: {
      ...profile,
      age,
      bmi,
    },
  }
}

export const userProfileService = {
  // Criar ou atualizar perfil (upsert)
  async upsert(
    userId: string,
    data: CreateProfileRequest
  ): Promise<ProfileResponse> {
    const result = await db.query(
      `INSERT INTO user_profiles (
        user_id, weight_kg, height_cm, birth_date, gender, 
        fitness_goal, experience_level, activity_level, workout_days, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        weight_kg = EXCLUDED.weight_kg,
        height_cm = EXCLUDED.height_cm,
        birth_date = EXCLUDED.birth_date,
        gender = EXCLUDED.gender,
        fitness_goal = EXCLUDED.fitness_goal,
        experience_level = EXCLUDED.experience_level,
        activity_level = EXCLUDED.activity_level,
        workout_days = EXCLUDED.workout_days,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        data.weightKg || null,
        data.heightCm || null,
        data.birthDate || null,
        data.gender || null,
        data.fitnessGoal || null,
        data.experienceLevel || null,
        data.activityLevel || null,
        data.workoutDays || null,
      ]
    )

    const profile = mapDbRowToProfile(result.rows[0])
    return buildProfileResponse(profile)
  },

  // Buscar perfil do usuário
  async getByUserId(userId: string): Promise<ProfileResponse> {
    const result = await db.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      throw new Error('Perfil não encontrado')
    }

    const profile = mapDbRowToProfile(result.rows[0])
    return buildProfileResponse(profile)
  },

  // Atualizar perfil parcialmente
  async update(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<ProfileResponse> {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Mapeamento de camelCase para snake_case
    const fieldMap: Record<string, string> = {
      weightKg: 'weight_kg',
      heightCm: 'height_cm',
      birthDate: 'birth_date',
      gender: 'gender',
      fitnessGoal: 'fitness_goal',
      experienceLevel: 'experience_level',
      activityLevel: 'activity_level',
      workoutDays: 'workout_days',
    }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        const dbColumn = fieldMap[key] || key
        updates.push(`${dbColumn} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    updates.push('updated_at = NOW()')
    values.push(userId)

    const result = await db.query(
      `UPDATE user_profiles 
       SET ${updates.join(', ')} 
       WHERE user_id = $${paramIndex} 
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      throw new Error('Perfil não encontrado')
    }

    const profile = mapDbRowToProfile(result.rows[0])
    return buildProfileResponse(profile)
  },
}
