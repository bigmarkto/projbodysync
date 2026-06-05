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
  async register({
    email,
    password,
    name,
  }: RegisterRequest): Promise<AuthResponse> {
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

    // Insere no banco
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name`,
      [email, passwordHash, name]
    )

    const user: User = result.rows[0]
    const tokens = generateTokens(user)

    // Salva o hash do refresh token no banco
    const refreshTokenHash = await hashPassword(tokens.refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias a partir de agora

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, expiresAt]
    )

    return { user, ...tokens }
  },

  // 2. LOGIN
  async login({ email, password }: LoginRequest): Promise<AuthResponse> {
    // Busca usuário
    const result = await db.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Credenciais inválidas') // Mensagem genérica por segurança
    }

    const userDb = result.rows[0]

    // Compara senha
    const isPasswordValid = await bcrypt.compare(password, userDb.password_hash)
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas')
    }

    const user: User = { id: userDb.id, email: userDb.email, name: userDb.name }
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
      'SELECT id, email, name FROM users WHERE id = $1',
      [validTokenRecord.user_id]
    )
    const user: User = userResult.rows[0]
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
