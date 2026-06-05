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

// Configurações de tempo de expiração
const ACCESS_TOKEN_EXPIRES_IN = '15m' // Curta duração
const REFRESH_TOKEN_EXPIRES_IN = '7d' // Longa duração

// Função auxiliar para gerar hash da senha
async function hashPassword(password: string): Promise<string> {
  // 10 é o número de "rounds" (custo computacional). 10 é um padrão seguro.
  return bcrypt.hash(password, 10)
}

// Função auxiliar para gerar os dois tokens
function generateTokens(user: User): {
  accessToken: string
  refreshToken: string
} {
  const payload: JwtPayload = { userId: user.id, email: user.email }

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })

  // O refresh token pode ter um payload diferente ou o mesmo.
  // Aqui usamos o mesmo para simplicidade, mas em produção poderia ter menos dados.
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
      experienceLevel = 'iniciante',
      activityLevel = 'sedentario',
    } = data

    // Verifica se email já existe
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )
    if (existingUser.rows.length > 0) {
      throw new Error('Email já cadastrado')
    }

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Inicia transação para garantir que usuário e perfil sejam criados juntos
    const client = await db.connect()

    try {
      await client.query('BEGIN')

      // 1. Cria o usuário na tabela users
      const userResult = await client.query(
        `INSERT INTO users (
        email, password_hash, name, height_cm, birth_date,
        weight_kg, gender, fitness_goal, experience_level, activity_level
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, experience_level, activity_level`,
        [
          email,
          passwordHash,
          name,
          heightCm,
          birthDate,
          weightKg,
          gender,
          fitnessGoal,
          experienceLevel,
          activityLevel,
        ]
      )

      const user: User = userResult.rows[0]

      // 2. Cria o perfil na tabela user_profiles
      await client.query(
        `INSERT INTO user_profiles (
        user_id, weight_kg, height_cm, birth_date, gender,
        fitness_goal, experience_level, activity_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          weightKg,
          heightCm,
          birthDate,
          gender,
          fitnessGoal,
          experienceLevel,
          activityLevel,
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
    // Busca usuário COM TODOS OS CAMPOS
    const result = await db.query(
      `SELECT id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, experience_level, activity_level, password_hash 
     FROM users WHERE email = $1`,
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Credenciais inválidas')
    }

    const userDb = result.rows[0]

    // Compara senha
    const isPasswordValid = await bcrypt.compare(password, userDb.password_hash)
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas')
    }

    // Constrói o usuário com todos os campos
    const user: User = {
      id: userDb.id,
      email: userDb.email,
      name: userDb.name,
      heightCm: userDb.height_cm,
      birthDate: userDb.birth_date,
      weightKg: userDb.weight_kg,
      gender: userDb.gender,
      fitnessGoal: userDb.fitness_goal,
      experienceLevel: userDb.experience_level,
      activityLevel: userDb.activity_level,
    }

    const tokens = generateTokens(user)

    // Salva novo refresh token
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
    // Verifica se o token é válido (assinatura e expiração)
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch (err) {
      throw new Error('Refresh token inválido ou expirado')
    }

    // Busca todos os refresh tokens do usuário
    const result = await db.query(
      `SELECT id, user_id, token_hash, expires_at FROM refresh_tokens 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      throw new Error('Refresh token não encontrado ou expirado')
    }

    // Compara o token com cada hash salvo (bcrypt.compare funciona mesmo com salts diferentes)
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

    // Gera novos tokens
    const userResult = await db.query(
      `SELECT id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal, experience_level, activity_level 
   FROM users WHERE id = $1`,
      [validTokenRecord.user_id]
    )

    const userDb = userResult.rows[0]
    const user: User = {
      id: userDb.id,
      email: userDb.email,
      name: userDb.name,
      heightCm: userDb.height_cm,
      birthDate: userDb.birth_date,
      weightKg: userDb.weight_kg,
      gender: userDb.gender,
      fitnessGoal: userDb.fitness_goal,
      experienceLevel: userDb.experience_level,
      activityLevel: userDb.activity_level,
    }
    const newTokens = generateTokens(user)

    // Invalida o token antigo (segurança: uso único)
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [
      validTokenRecord.id,
    ])

    // Salva o novo token
    const newTokenHash = await hashPassword(newTokens.refreshToken)
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, newTokenHash, newExpiresAt]
    )

    return newTokens
  },

  // 4. LOGOUT (CORRIGIDO)
  async logout(token: string): Promise<void> {
    // Decodifica o token para pegar o userId
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch (err) {
      throw new Error('Refresh token inválido')
    }

    // Deleta TODOS os refresh tokens do usuário
    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [payload.userId]
    )

    // Se nenhum token foi deletado, o usuário não tinha tokens ativos
    if (result.rowCount === 0) {
      throw new Error('Nenhum token ativo encontrado')
    }
  },
}
