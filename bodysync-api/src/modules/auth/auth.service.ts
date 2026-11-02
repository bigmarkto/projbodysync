import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from '../../config/database'
import { env } from '../../config/env'
import type {
  RegisterRequest,
  LoginRequest,
  User,
  AuthResponse,
  JwtPayload,
} from './auth.types'

const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function mapDbRowToUser(userDb: any): User {
  return {
    id: userDb.id,
    email: userDb.email,
    name: userDb.name,
    heightCm: Number(userDb.height_cm),
    birthDate: userDb.birth_date,
    weightKg: Number(userDb.weight_kg),
    gender: userDb.gender,
    fitnessGoal: userDb.fitness_goal,
    role: userDb.role,
    experienceLevel: userDb.experience_level,
    activityLevel: userDb.activity_level,
    workoutFrequency: userDb.workout_frequency,
    lastWorkoutDate: userDb.last_workout_date,
    subscriptionType: userDb.subscription_type,
    desiredWeightKg: userDb.desired_weight_kg
      ? Number(userDb.desired_weight_kg)
      : null,
    hydrationReminder: userDb.hydration_reminder,
    desiredModality: userDb.desired_modality,
    workoutSchedule: userDb.workout_schedule,
  }
}

function generateTokens(user: User): {
  accessToken: string
  refreshToken: string
} {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })

  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  })

  return { accessToken, refreshToken }
}

const USER_WITH_PROFILE_SELECT = `
  SELECT
    u.id,
    u.email,
    u.name,
    u.password_hash,
    COALESCE(up.height_cm, u.height_cm) AS height_cm,
    COALESCE(up.birth_date, u.birth_date) AS birth_date,
    COALESCE(up.weight_kg, u.weight_kg) AS weight_kg,
    COALESCE(up.gender, u.gender) AS gender,
    COALESCE(up.fitness_goal, u.fitness_goal) AS fitness_goal,
    COALESCE(up.role, u.role) AS role,
    COALESCE(up.experience_level, u.experience_level) AS experience_level,
    COALESCE(up.activity_level, u.activity_level) AS activity_level,
    COALESCE(up.workout_frequency, u.workout_frequency) AS workout_frequency,
    COALESCE(up.last_workout_date, u.last_workout_date) AS last_workout_date,
    COALESCE(up.subscription_type, u.subscription_type) AS subscription_type,
    COALESCE(up.desired_weight_kg, u.desired_weight_kg) AS desired_weight_kg,
    COALESCE(up.hydration_reminder, u.hydration_reminder) AS hydration_reminder,
    COALESCE(up.desired_modality, u.desired_modality) AS desired_modality,
    COALESCE(up.workout_schedule, u.workout_schedule) AS workout_schedule
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
`

export const authService = {
  // 1. REGISTRO
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const {
      email,
      password,
      name,
      heightCm,
      birthDate,
      weightKg,
      gender,
      fitnessGoal,
      role,
      experienceLevel,
      activityLevel,
      workoutFrequency,
      lastWorkoutDate,
      subscriptionType,
      desiredWeightKg,
      hydrationReminder,
      desiredModality,
      workoutSchedule,
    } = data

    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )
    if (existingUser.rows.length > 0) {
      throw new Error('Email já cadastrado')
    }

    const passwordHash = await hashPassword(password)
    const client = await db.connect()

    try {
      await client.query('BEGIN')

      const userResult = await client.query(
        `INSERT INTO users (
          email, password_hash, name, height_cm, birth_date,
          weight_kg, gender, fitness_goal, role, experience_level, activity_level,
          workout_frequency, last_workout_date,
          subscription_type, desired_weight_kg, hydration_reminder, 
          desired_modality, workout_schedule
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
        RETURNING id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, 
                  role, experience_level, activity_level, workout_frequency, last_workout_date, 
                  subscription_type, desired_weight_kg, hydration_reminder, 
                  desired_modality, workout_schedule`,
        [
          email,
          passwordHash,
          name,
          heightCm,
          birthDate,
          weightKg,
          gender,
          fitnessGoal,
          role,
          experienceLevel || null,
          activityLevel,
          workoutFrequency || null,
          lastWorkoutDate || null,
          subscriptionType,
          desiredWeightKg,
          hydrationReminder,
          desiredModality || null,
          workoutSchedule ? JSON.stringify(workoutSchedule) : null,
        ]
      )

      const user = mapDbRowToUser(userResult.rows[0])

      await client.query(
        `INSERT INTO user_profiles (
          user_id, weight_kg, height_cm, birth_date, gender,
          fitness_goal, role, experience_level, activity_level,
          workout_frequency, last_workout_date,
          subscription_type, desired_weight_kg, hydration_reminder, 
          desired_modality, workout_schedule
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          user.id,
          weightKg,
          heightCm,
          birthDate,
          gender,
          fitnessGoal,
          role,
          experienceLevel || null,
          activityLevel || null,
          workoutFrequency || null,
          lastWorkoutDate || null,
          subscriptionType,
          desiredWeightKg,
          hydrationReminder,
          desiredModality || null,
          workoutSchedule ? JSON.stringify(workoutSchedule) : null,
        ]
      )

      const tokens = generateTokens(user)
      const refreshTokenHash = await hashPassword(tokens.refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [user.id, refreshTokenHash, expiresAt]
      )

      await client.query('COMMIT')

      return { user, ...tokens }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // 2. LOGIN
  async login({ email, password }: LoginRequest): Promise<AuthResponse> {
    const result = await db.query(
      `${USER_WITH_PROFILE_SELECT} WHERE u.email = $1`,
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Credenciais inválidas')
    }

    const userDb = result.rows[0]

    const isPasswordValid = await bcrypt.compare(password, userDb.password_hash)
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas')
    }

    const user = mapDbRowToUser(userDb)
    const tokens = generateTokens(user)

    const refreshTokenHash = await hashPassword(tokens.refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, expiresAt]
    )

    return { user, ...tokens }
  },

  // 3. REFRESH TOKEN
  async refresh(
    token: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch {
      throw new Error('Refresh token inválido ou expirado')
    }

    const result = await db.query(
      `SELECT id, user_id, token_hash, expires_at FROM refresh_tokens 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      throw new Error('Refresh token não encontrado ou expirado')
    }

    let validTokenRecord = null
    for (const record of result.rows) {
      const isValid = await bcrypt.compare(token, record.token_hash)
      if (isValid) {
        validTokenRecord = record
        break
      }
    }

    if (!validTokenRecord) {
      throw new Error('Refresh token inválido')
    }

    const userResult = await db.query(
      `${USER_WITH_PROFILE_SELECT} WHERE u.id = $1`,
      [validTokenRecord.user_id]
    )

    const user = mapDbRowToUser(userResult.rows[0])
    const newTokens = generateTokens(user)

    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [
      validTokenRecord.id,
    ])

    const newTokenHash = await hashPassword(newTokens.refreshToken)
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, newTokenHash, newExpiresAt]
    )

    return newTokens
  },

  // 4. LOGOUT
  async logout(token: string): Promise<void> {
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch {
      throw new Error('Refresh token inválido')
    }

    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [payload.userId]
    )

    if (result.rowCount === 0) {
      throw new Error('Nenhum token ativo encontrado')
    }
  },

  // 5. RECUPERAÇÃO DE SENHA (Solicitação)
  async forgotPassword(email: string): Promise<void> {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [
      email,
    ])

    if (result.rows.length === 0) {
      return
    }

    const userId = result.rows[0].id
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashResetToken(token)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    )
  },

  // 6. RECUPERAÇÃO DE SENHA (Redefinição)
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashResetToken(token)

    const result = await db.query(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens 
       WHERE token = $1`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      throw new Error('Token inválido ou expirado')
    }

    const tokenRecord = result.rows[0]

    if (tokenRecord.used || new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error('Token inválido ou expirado')
    }

    const passwordHash = await hashPassword(newPassword)

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      tokenRecord.user_id,
    ])

    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [tokenRecord.id]
    )
  },
}
