import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../../config/database'
import { env } from '../../config/env'
import {
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

      // 1. Cria o usuário na tabela users (COM role)
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

      const userDb = userResult.rows[0]

      const user: User = {
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

      // 2. Cria o perfil na tabela user_profiles
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

      await client.query('COMMIT')

      // 3. Gera os tokens
      const tokens = generateTokens(user)

      // 4. Salva o refresh token
      const refreshTokenHash = await hashPassword(tokens.refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [user.id, refreshTokenHash, expiresAt]
      )

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
      `SELECT id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, 
              role, experience_level, activity_level, workout_frequency, last_workout_date, 
              subscription_type, desired_weight_kg, 
              hydration_reminder, desired_modality, workout_schedule, password_hash 
       FROM users WHERE email = $1`,
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

    const user: User = {
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
    } catch (err) {
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
      `SELECT id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, 
              role, experience_level, activity_level, workout_frequency, last_workout_date, 
              subscription_type, desired_weight_kg, 
              hydration_reminder, desired_modality, workout_schedule 
       FROM users WHERE id = $1`,
      [validTokenRecord.user_id]
    )

    const userDb = userResult.rows[0]
    const user: User = {
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
    } catch (err) {
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
}
