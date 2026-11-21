import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import { PassThrough } from 'node:stream'
import type { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { RegisterRequest } from '../modules/auth/auth.types'

process.env.DATABASE_URL ||= 'postgresql://stub:stub@localhost:5432/stub'
process.env.JWT_SECRET ||= 'test-secret-key-for-unit-tests-123456'

const { default: app } = require('../app') as typeof import('../app')
const { db } = require('../config/database') as typeof import('../config/database')
const { env } = require('../config/env') as typeof import('../config/env')
const { authMiddleware, requireProfessor } =
  require('../middleware/auth.middleware') as typeof import('../middleware/auth.middleware')
const { AppError, errorMiddleware } =
  require('../middleware/error.middleware') as typeof import('../middleware/error.middleware')
const { authController } =
  require('../modules/auth/auth.controller') as typeof import('../modules/auth/auth.controller')
const { authService, hashResetToken } =
  require('../modules/auth/auth.service') as typeof import('../modules/auth/auth.service')
const { exerciseController } =
  require('../modules/exercise/exercise.controller') as typeof import('../modules/exercise/exercise.controller')
const { exerciseService } =
  require('../modules/exercise/exercise.service') as typeof import('../modules/exercise/exercise.service')
const { hydrationController } =
  require('../modules/hydration/hydration.controller') as typeof import('../modules/hydration/hydration.controller')
const { buildHydrationStatus, hydrationService } =
  require('../modules/hydration/hydration.service') as typeof import('../modules/hydration/hydration.service')
const { measurementController } =
  require('../modules/measurement/measurement.controller') as typeof import('../modules/measurement/measurement.controller')
const { measurementService, MeasurementValidationError } =
  require('../modules/measurement/measurement.service') as typeof import('../modules/measurement/measurement.service')
const { isSubscriptionAllowedForRole } =
  require('../modules/payment/payment.routes') as typeof import('../modules/payment/payment.routes')
const { sessionController } =
  require('../modules/session/session.controller') as typeof import('../modules/session/session.controller')
const { dateKey, isValidIsoDate, sessionService } =
  require('../modules/session/session.service') as typeof import('../modules/session/session.service')
const { userProfileController } =
  require('../modules/user-profile/user-profile.controller') as typeof import('../modules/user-profile/user-profile.controller')
const { PROFILE_FIELD_MAP, userProfileService } =
  require('../modules/user-profile/user-profile.service') as typeof import('../modules/user-profile/user-profile.service')
const { planGenerator } =
  require('../modules/workout/plan-generator') as typeof import('../modules/workout/plan-generator')
const { workoutController } =
  require('../modules/workout/workout.controller') as typeof import('../modules/workout/workout.controller')
const {
  ForbiddenPlanError,
  PlanNotFoundError,
  SubscriptionLimitError,
  ValidationError,
  workoutService,
} = require('../modules/workout/workout.service') as typeof import('../modules/workout/workout.service')

interface QueryResultStub {
  rows: any[]
  rowCount?: number
}

interface RecordedQuery {
  sql: string
  params?: unknown[]
}

type DbHandler = (sql: string, params?: unknown[]) => Promise<QueryResultStub> | QueryResultStub

async function withDbStub<T>(
  handler: DbHandler,
  fn: (queries: RecordedQuery[]) => Promise<T>
): Promise<T> {
  const origQuery = db.query.bind(db)
  const origConnect = db.connect.bind(db)
  const queries: RecordedQuery[] = []

  const wrappedQuery = async (sqlOrConfig: any, params?: unknown[]) => {
    const sql = typeof sqlOrConfig === 'string' ? sqlOrConfig : String(sqlOrConfig?.text ?? '')
    const boundParams = typeof sqlOrConfig === 'string' ? params : sqlOrConfig?.values
    queries.push({ sql, params: boundParams })
    const res = await handler(sql, boundParams)
    return { rowCount: res.rows.length, ...res }
  }

  ;(db as any).query = wrappedQuery
  ;(db as any).connect = async () => ({
    query: wrappedQuery,
    release() {},
  })

  try {
    return await fn(queries)
  } finally {
    ;(db as any).query = origQuery
    ;(db as any).connect = origConnect
  }
}

interface MockResponse {
  statusCode: number
  body: unknown
  sentEmpty: boolean
  res: Response
}

function createMockRes(): MockResponse {
  const state: MockResponse = {
    statusCode: 200,
    body: undefined,
    sentEmpty: false,
    res: null as unknown as Response,
  }

  const resObj = {
    status(code: number) {
      state.statusCode = code
      return resObj
    },
    json(payload: unknown) {
      state.body = payload
      return resObj
    },
    send(payload?: unknown) {
      if (payload === undefined) {
        state.sentEmpty = true
      } else {
        state.body = payload
      }
      return resObj
    },
  }

  state.res = resObj as unknown as Response
  return state
}

function createNextTracker(): {
  next: NextFunction
  calls: unknown[]
} {
  const calls: unknown[] = []
  const next: NextFunction = (err?: unknown) => {
    calls.push(err ?? null)
  }
  return { next, calls }
}

interface DispatchedResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  text: string
  json: <T = unknown>() => T
}

async function dispatchToApp(
  method: string,
  url: string,
  options: { headers?: Record<string, string>; body?: unknown } = {}
): Promise<DispatchedResponse> {
  const reqSocket = new PassThrough() as PassThrough & {
    remoteAddress?: string
    writable?: boolean
    cork?: () => void
    uncork?: () => void
  }
  reqSocket.remoteAddress = '127.0.0.1'
  reqSocket.writable = true
  reqSocket.cork = () => {}
  reqSocket.uncork = () => {}

  const req = new http.IncomingMessage(reqSocket as unknown as import('node:net').Socket)
  req.method = method.toUpperCase()
  req.url = url

  const normalizedHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(options.headers ?? {})) {
    normalizedHeaders[k.toLowerCase()] = v
  }

  let payloadBuffer: Buffer | null = null
  if (options.body !== undefined) {
    const raw =
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    payloadBuffer = Buffer.from(raw, 'utf8')
    if (!normalizedHeaders['content-type']) {
      normalizedHeaders['content-type'] = 'application/json'
    }
    normalizedHeaders['content-length'] = String(payloadBuffer.byteLength)
  }
  req.headers = normalizedHeaders

  const res = new http.ServerResponse(req)
  const outChunks: Buffer[] = []
  const resSocket = new PassThrough()
  resSocket.on('data', (chunk: Buffer) => {
    outChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  })
  res.assignSocket(resSocket as unknown as import('node:net').Socket)

  const finished = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout dispatching ${method} ${url}`)), 3000)
    timer.unref()
    res.on('finish', () => {
      clearTimeout(timer)
      resolve()
    })
    res.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

  if (payloadBuffer) {
    req.push(payloadBuffer)
  }
  req.push(null)

  app(req as unknown as Request, res as unknown as Response)
  await finished
  res.detachSocket(resSocket as unknown as import('node:net').Socket)

  const rawText = Buffer.concat(outChunks).toString('utf8')
  const headerSplit = rawText.indexOf('\r\n\r\n')
  const bodyText = headerSplit !== -1 ? rawText.slice(headerSplit + 4) : rawText

  const headers: Record<string, string | string[] | undefined> = {}
  for (const [k, v] of Object.entries(res.getHeaders())) {
    headers[k.toLowerCase()] = typeof v === 'number' ? String(v) : v
  }

  return {
    status: res.statusCode,
    headers,
    text: bodyText,
    json: <T = unknown>() => JSON.parse(bodyText) as T,
  }
}

// ============================================================================
// 1. App & /api/health
// ============================================================================
test('app.ts: GET /api/health responde 200 sem autenticação e aplica CORS local', async () => {
  const healthRes = await dispatchToApp('GET', '/api/health', {
    headers: { Origin: 'http://10.0.2.2:8081' },
  })
  assert.equal(healthRes.status, 200)
  assert.equal(healthRes.headers['access-control-allow-origin'], 'http://10.0.2.2:8081')
  assert.match(String(healthRes.headers['vary']), /\bOrigin\b/)

  const body = healthRes.json<{ status: string; timestamp: string }>()
  assert.equal(body.status, 'ok')
  assert.equal(typeof body.timestamp, 'string')
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false)

  const preflightRes = await dispatchToApp('OPTIONS', '/api/health', {
    headers: { Origin: 'http://localhost:8081' },
  })
  assert.equal(preflightRes.status, 204)

  const protectedRes = await dispatchToApp('GET', '/api/workouts')
  assert.equal(protectedRes.status, 401)
})

// ============================================================================
// 2. Middleware: auth.middleware.ts & error.middleware.ts
// ============================================================================
test('middleware/auth.middleware.ts: authMiddleware valida ausência, formato, expiração e token válido', () => {
  // Missing header
  const missingRes = createMockRes()
  const missingNext = createNextTracker()
  authMiddleware({ headers: {} } as Request, missingRes.res, missingNext.next)
  assert.equal(missingRes.statusCode, 401)
  assert.deepEqual(missingRes.body, { error: 'Token não fornecido' })
  assert.equal(missingNext.calls.length, 0)

  // Bad format
  const badFmtRes = createMockRes()
  const badFmtNext = createNextTracker()
  authMiddleware(
    { headers: { authorization: 'Basic abc123' } } as Request,
    badFmtRes.res,
    badFmtNext.next
  )
  assert.equal(badFmtRes.statusCode, 401)
  assert.match(String((badFmtRes.body as { error: string }).error), /Formato de token inválido/i)
  assert.equal(badFmtNext.calls.length, 0)

  // Bad format (empty Bearer token)
  const emptyBearerRes = createMockRes()
  const emptyBearerNext = createNextTracker()
  authMiddleware(
    { headers: { authorization: 'Bearer ' } } as Request,
    emptyBearerRes.res,
    emptyBearerNext.next
  )
  assert.equal(emptyBearerRes.statusCode, 401)
  assert.equal(emptyBearerNext.calls.length, 0)

  // Expired token
  const expiredToken = jwt.sign(
    { userId: 'u-exp', email: 'exp@test.com', role: 'comum' },
    env.JWT_SECRET,
    { expiresIn: -10 }
  )
  const expRes = createMockRes()
  const expNext = createNextTracker()
  authMiddleware(
    { headers: { authorization: `Bearer ${expiredToken}` } } as Request,
    expRes.res,
    expNext.next
  )
  assert.equal(expRes.statusCode, 401)
  assert.deepEqual(expRes.body, { error: 'Token inválido ou expirado' })
  assert.equal(expNext.calls.length, 0)

  // Invalid signature
  const wrongSecretToken = jwt.sign(
    { userId: 'u-bad', email: 'bad@test.com', role: 'comum' },
    'wrong-secret-key'
  )
  const badSigRes = createMockRes()
  const badSigNext = createNextTracker()
  authMiddleware(
    { headers: { authorization: `Bearer ${wrongSecretToken}` } } as Request,
    badSigRes.res,
    badSigNext.next
  )
  assert.equal(badSigRes.statusCode, 401)
  assert.equal(badSigNext.calls.length, 0)

  // Valid token
  const validToken = jwt.sign(
    { userId: 'u-ok', email: 'ok@test.com', role: 'professor' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  )
  const req = { headers: { authorization: `Bearer ${validToken}` } } as Request
  const okRes = createMockRes()
  const okNext = createNextTracker()
  authMiddleware(req, okRes.res, okNext.next)
  assert.equal(req.userId, 'u-ok')
  assert.equal(req.userRole, 'professor')
  assert.equal(okNext.calls.length, 1)
})

test('middleware/auth.middleware.ts: requireProfessor trata 401, 403, professor/admin e fallback no DB', async () => {
  // 401 sem userId
  const noUserRes = createMockRes()
  const noUserNext = createNextTracker()
  await requireProfessor({} as Request, noUserRes.res, noUserNext.next)
  assert.equal(noUserRes.statusCode, 401)
  assert.equal(noUserNext.calls.length, 0)

  // 403 aluno comum
  const studentRes = createMockRes()
  const studentNext = createNextTracker()
  await requireProfessor(
    { userId: 'u1', userRole: 'comum' } as Request,
    studentRes.res,
    studentNext.next
  )
  assert.equal(studentRes.statusCode, 403)
  assert.equal(studentNext.calls.length, 0)

  // Libera professor e admin sem consultar DB
  for (const role of ['professor', 'admin']) {
    const res = createMockRes()
    const next = createNextTracker()
    await withDbStub(
      async () => {
        throw new Error('DB não deveria ser consultado quando userRole já está presente')
      },
      async () => {
        await requireProfessor({ userId: 'u-staff', userRole: role } as Request, res.res, next.next)
      }
    )
    assert.equal(next.calls.length, 1)
  }

  // Fallback no DB quando userRole está ausente
  await withDbStub(
    async () => ({ rows: [{ role: 'professor' }] }),
    async (queries) => {
      const res = createMockRes()
      const next = createNextTracker()
      await requireProfessor({ userId: 'u-db-prof' } as Request, res.res, next.next)
      assert.equal(next.calls.length, 1)
      assert.equal(queries.length, 1)
      assert.match(queries[0].sql, /SELECT role FROM users/i)
    }
  )

  await withDbStub(
    async () => ({ rows: [{ role: 'comum' }] }),
    async () => {
      const res = createMockRes()
      const next = createNextTracker()
      await requireProfessor({ userId: 'u-db-student' } as Request, res.res, next.next)
      assert.equal(res.statusCode, 403)
      assert.equal(next.calls.length, 0)
    }
  )

  await withDbStub(
    async () => {
      throw new Error('connection refused')
    },
    async () => {
      const res = createMockRes()
      const next = createNextTracker()
      await requireProfessor({ userId: 'u-db-err' } as Request, res.res, next.next)
      assert.equal(res.statusCode, 500)
      assert.deepEqual(res.body, { error: 'Erro ao validar permissões' })
    }
  )
})

test('middleware/error.middleware.ts: diferencia AppError de erro genérico 500', () => {
  const appRes = createMockRes()
  const next = createNextTracker()
  errorMiddleware(new AppError('Recurso conflitou', 409), {} as Request, appRes.res, next.next)
  assert.equal(appRes.statusCode, 409)
  assert.deepEqual(appRes.body, { error: 'Recurso conflitou' })

  const origConsoleError = console.error
  console.error = () => {}
  try {
    const errRes = createMockRes()
    errorMiddleware(new Error('segredo interno'), {} as Request, errRes.res, next.next)
    assert.equal(errRes.statusCode, 500)
    assert.deepEqual(errRes.body, { error: 'Erro interno do servidor' })
  } finally {
    console.error = origConsoleError
  }
})

// ============================================================================
// 3. Auth Module: register, login, refresh, logout, forgotPassword, resetPassword
// ============================================================================
function makeRegisterPayload(overrides: Partial<RegisterRequest> = {}): RegisterRequest {
  return {
    email: 'novo@bodysync.com',
    password: 'Password1',
    name: 'Maria Silva',
    heightCm: 168,
    birthDate: '1996-05-10',
    weightKg: 64,
    gender: 'feminino',
    fitnessGoal: 'ganho_massa_muscular',
    role: 'comum',
    activityLevel: 'moderado',
    workoutFrequency: 3,
    subscriptionType: 'free',
    desiredWeightKg: 62,
    hydrationReminder: true,
    desiredModality: 'Musculação',
    workoutSchedule: { days: [false, true, false, true, false, true, false], time: '07:30' },
    ...overrides,
  }
}

test('modules/auth: authService.register cria usuário em transação, rejeita duplicado e faz rollback em erro', async () => {
  // Duplicate email rejection
  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM users WHERE email/i.test(sql)) {
        return { rows: [{ id: 'existing-id' }] }
      }
      return { rows: [] }
    },
    async () => {
      await assert.rejects(
        () => authService.register(makeRegisterPayload()),
        /Email já cadastrado/
      )
    }
  )

  // Successful transaction commit
  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM users WHERE email/i.test(sql)) return { rows: [] }
      if (/INSERT INTO users/i.test(sql)) {
        return {
          rows: [
            {
              id: 'u-new',
              email: 'novo@bodysync.com',
              name: 'Maria Silva',
              height_cm: 168,
              birth_date: '1996-05-10',
              weight_kg: '64',
              gender: 'feminino',
              fitness_goal: 'ganho_massa_muscular',
              role: 'comum',
              experience_level: null,
              activity_level: 'moderado',
              workout_frequency: 3,
              last_workout_date: null,
              subscription_type: 'free',
              desired_weight_kg: '62',
              hydration_reminder: true,
              desired_modality: 'Musculação',
              workout_schedule: { days: [false, true, false, true, false, true, false], time: '07:30' },
            },
          ],
        }
      }
      return { rows: [] }
    },
    async (queries) => {
      const result = await authService.register(makeRegisterPayload())
      assert.equal(result.user.id, 'u-new')
      assert.equal(result.user.weightKg, 64)
      assert.equal(result.user.desiredWeightKg, 62)
      assert.ok(result.accessToken)
      assert.ok(result.refreshToken)
      assert.equal(queries.some((q) => q.sql === 'BEGIN'), true)
      assert.equal(queries.some((q) => /INSERT INTO user_profiles/i.test(q.sql)), true)
      assert.equal(queries.some((q) => /INSERT INTO refresh_tokens/i.test(q.sql)), true)
      assert.equal(queries.some((q) => q.sql === 'COMMIT'), true)
      assert.equal(queries.some((q) => q.sql === 'ROLLBACK'), false)
    }
  )

  // Rollback when user_profiles insert fails
  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM users WHERE email/i.test(sql)) return { rows: [] }
      if (/INSERT INTO users/i.test(sql)) {
        return {
          rows: [
            {
              id: 'u-fail',
              email: 'fail@bodysync.com',
              name: 'Fail',
              height_cm: 170,
              birth_date: '1990-01-01',
              weight_kg: 70,
              gender: 'masculino',
              fitness_goal: 'condicionamento_fisico',
              role: 'comum',
              experience_level: null,
              activity_level: 'moderado',
              workout_frequency: null,
              last_workout_date: null,
              subscription_type: 'free',
              desired_weight_kg: null,
              hydration_reminder: false,
              desired_modality: null,
              workout_schedule: null,
            },
          ],
        }
      }
      if (/INSERT INTO user_profiles/i.test(sql)) {
        throw new Error('constraint violation')
      }
      return { rows: [] }
    },
    async (queries) => {
      await assert.rejects(
        () => authService.register(makeRegisterPayload({ email: 'fail@bodysync.com' })),
        /constraint violation/
      )
      assert.equal(queries.some((q) => q.sql === 'ROLLBACK'), true)
      assert.equal(queries.some((q) => q.sql === 'COMMIT'), false)
    }
  )
})

test('modules/auth: authController.register normaliza campos, valida entrada e mapeia 409', async () => {
  const invalidRes = createMockRes()
  const next = createNextTracker()
  await authController.register(
    { body: { email: 'invalido', password: 'Password1' } } as Request,
    invalidRes.res,
    next.next
  )
  assert.equal(invalidRes.statusCode, 400)

  const origRegister = authService.register
  let capturedPayload: RegisterRequest | undefined
  authService.register = async (payload: RegisterRequest) => {
    capturedPayload = payload
    return {
      user: {
        ...payload,
        id: 'u-ctrl',
        experienceLevel: payload.experienceLevel ?? null,
        lastWorkoutDate: null,
        desiredWeightKg: payload.desiredWeightKg ?? null,
        desiredModality: payload.desiredModality ?? null,
        workoutSchedule: payload.workoutSchedule ?? null,
      },
      accessToken: 'at',
      refreshToken: 'rt',
    }
  }

  try {
    const okRes = createMockRes()
    await authController.register(
      {
        body: {
          email: 'ana@bodysync.com',
          password: 'Password1',
          confirmPassword: 'Password1',
          name: '  Ana Costa  ',
          birthYear: 1998,
          heightCm: 165,
          weightKg: 60,
          gender: 'feminino',
          fitnessGoal: 'iniciante',
          modalities: ['Funcional', 'Corrida'],
          workoutDays: [1, 3, 5],
          workoutTime: '18:00',
          subscriptionType: 'premium',
        },
      } as Request,
      okRes.res,
      next.next
    )
    assert.equal(okRes.statusCode, 201)
    assert.ok(capturedPayload)
    const captured = capturedPayload as RegisterRequest
    assert.equal(captured.name, 'Ana Costa')
    assert.equal(captured.birthDate, '1998-01-01')
    assert.equal(captured.experienceLevel, 'iniciante')
    assert.equal(captured.fitnessGoal, 'condicionamento_fisico')
    assert.equal(captured.desiredModality, 'Funcional')
    assert.equal(captured.workoutFrequency, 3)
    assert.equal(captured.subscriptionType, 'free')

    authService.register = async () => {
      throw new Error('Email já cadastrado')
    }
    const dupRes = createMockRes()
    const origConsoleError = console.error
    console.error = () => {}
    try {
      await authController.register(
        {
          body: {
            email: 'ana@bodysync.com',
            password: 'Password1',
            name: 'Ana Costa',
            birthDate: '1998-01-01',
            heightCm: 165,
            weightKg: 60,
            gender: 'feminino',
          },
        } as Request,
        dupRes.res,
        next.next
      )
    } finally {
      console.error = origConsoleError
    }
    assert.equal(dupRes.statusCode, 409)
  } finally {
    authService.register = origRegister
  }
})

test('modules/auth: login, refresh, logout, forgotPassword e resetPassword', async () => {
  const realHash = await bcrypt.hash('Password1', 4)
  const dbUserRow = {
    id: 'u-auth',
    email: 'user@bodysync.com',
    name: 'João',
    password_hash: realHash,
    height_cm: 180,
    birth_date: '1994-03-12',
    weight_kg: 82,
    gender: 'masculino',
    fitness_goal: 'condicionamento_fisico',
    role: 'comum',
    experience_level: 'intermediario',
    activity_level: 'ativo',
    workout_frequency: 4,
    last_workout_date: null,
    subscription_type: 'free',
    desired_weight_kg: 78,
    hydration_reminder: false,
    desired_modality: 'Musculação',
    workout_schedule: null,
  }

  // login: invalid email, wrong password, valid password
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(
        () => authService.login({ email: 'missing@bodysync.com', password: 'Password1' }),
        /Credenciais inválidas/
      )
    }
  )

  await withDbStub(
    async (sql) => {
      if (/FROM users u/i.test(sql)) return { rows: [dbUserRow] }
      return { rows: [] }
    },
    async () => {
      await assert.rejects(
        () => authService.login({ email: 'user@bodysync.com', password: 'WrongPassword1' }),
        /Credenciais inválidas/
      )
    }
  )

  let issuedRefreshToken = ''
  await withDbStub(
    async (sql) => {
      if (/FROM users u/i.test(sql)) return { rows: [dbUserRow] }
      return { rows: [] }
    },
    async (queries) => {
      const res = await authService.login({ email: 'user@bodysync.com', password: 'Password1' })
      assert.equal(res.user.id, 'u-auth')
      assert.ok(res.accessToken)
      assert.ok(res.refreshToken)
      issuedRefreshToken = res.refreshToken
      assert.equal(queries.some((q) => /INSERT INTO refresh_tokens/i.test(q.sql)), true)
    }
  )

  // refresh: rejects invalid JWT, empty DB, mismatched hash, and rotates valid token
  await assert.rejects(
    () => authService.refresh('invalid.jwt.token'),
    /Refresh token inválido ou expirado/
  )

  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(
        () => authService.refresh(issuedRefreshToken),
        /Refresh token não encontrado ou expirado/
      )
    }
  )

  const refreshHash = await bcrypt.hash(issuedRefreshToken, 4)
  await withDbStub(
    async (sql) => {
      if (/FROM refresh_tokens/i.test(sql)) {
        return { rows: [{ id: 'rt-1', user_id: 'u-auth', token_hash: refreshHash }] }
      }
      if (/FROM users u/i.test(sql)) {
        return { rows: [dbUserRow] }
      }
      return { rows: [] }
    },
    async (queries) => {
      const rotated = await authService.refresh(issuedRefreshToken)
      assert.ok(rotated.accessToken)
      assert.ok(rotated.refreshToken)
      assert.equal(
        queries.some((q) => /DELETE FROM refresh_tokens WHERE id = \$1/i.test(q.sql)),
        true
      )
      assert.equal(queries.some((q) => /INSERT INTO refresh_tokens/i.test(q.sql)), true)
    }
  )

  // logout: invalid JWT, no active tokens, valid logout
  await assert.rejects(() => authService.logout('bad.token'), /Refresh token inválido/)
  await withDbStub(
    async () => ({ rows: [], rowCount: 0 }),
    async () => {
      await assert.rejects(
        () => authService.logout(issuedRefreshToken),
        /Nenhum token ativo encontrado/
      )
    }
  )
  await withDbStub(
    async () => ({ rows: [], rowCount: 1 }),
    async (queries) => {
      await authService.logout(issuedRefreshToken)
      assert.match(queries[0].sql, /DELETE FROM refresh_tokens WHERE user_id = \$1/i)
    }
  )

  // forgotPassword: silent when missing; inserts SHA-256 hash when user exists
  await withDbStub(
    async () => ({ rows: [] }),
    async (queries) => {
      await authService.forgotPassword('nobody@bodysync.com')
      assert.equal(queries.length, 1)
    }
  )
  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM users WHERE email/i.test(sql)) return { rows: [{ id: 'u-auth' }] }
      return { rows: [] }
    },
    async (queries) => {
      await authService.forgotPassword('user@bodysync.com')
      const ins = queries.find((q) => /INSERT INTO password_reset_tokens/i.test(q.sql))
      assert.ok(ins)
      assert.equal(typeof ins.params?.[1], 'string')
      assert.equal((ins.params?.[1] as string).length, 64)
    }
  )

  // resetPassword: unknown token, used token, expired token, valid update
  const rawReset = 'raw-reset-token-123'
  const expectedResetHash = crypto.createHash('sha256').update(rawReset).digest('hex')
  assert.equal(hashResetToken(rawReset), expectedResetHash)

  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(
        () => authService.resetPassword(rawReset, 'NewPassword1'),
        /Token inválido ou expirado/
      )
    }
  )
  await withDbStub(
    async () => ({
      rows: [
        {
          id: 1,
          user_id: 'u-auth',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          used: true,
        },
      ],
    }),
    async () => {
      await assert.rejects(
        () => authService.resetPassword(rawReset, 'NewPassword1'),
        /Token inválido ou expirado/
      )
    }
  )
  await withDbStub(
    async () => ({
      rows: [
        {
          id: 2,
          user_id: 'u-auth',
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          used: false,
        },
      ],
    }),
    async () => {
      await assert.rejects(
        () => authService.resetPassword(rawReset, 'NewPassword1'),
        /Token inválido ou expirado/
      )
    }
  )
  await withDbStub(
    async (sql) => {
      if (/FROM password_reset_tokens/i.test(sql)) {
        return {
          rows: [
            {
              id: 3,
              user_id: 'u-auth',
              expires_at: new Date(Date.now() + 600_000).toISOString(),
              used: false,
            },
          ],
        }
      }
      return { rows: [] }
    },
    async (queries) => {
      await authService.resetPassword(rawReset, 'NewPassword1')
      const updUser = queries.find((q) => /UPDATE users SET password_hash/i.test(q.sql))
      const updToken = queries.find((q) => /UPDATE password_reset_tokens SET used = TRUE/i.test(q.sql))
      assert.ok(updUser)
      assert.ok(updToken)
      assert.equal(await bcrypt.compare('NewPassword1', String(updUser.params?.[0])), true)
    }
  )
})

// ============================================================================
// 4. Workout Module: planGenerator + workoutService + workoutController
// ============================================================================
test('modules/workout: planGenerator cobre schemeFor, exerciseCount, categoryOrder, planName e pickBalanced', () => {
  assert.deepEqual(planGenerator.schemeFor('emagrecimento'), { sets: 3, reps: 15 })
  assert.deepEqual(planGenerator.schemeFor('condicionamento_fisico'), { sets: 3, reps: 15 })
  assert.deepEqual(planGenerator.schemeFor('ganho_massa_muscular'), { sets: 4, reps: 10 })
  assert.deepEqual(planGenerator.schemeFor('ganho_peso'), { sets: 4, reps: 8 })
  assert.deepEqual(planGenerator.schemeFor('saude_bem_estar'), { sets: 3, reps: 12 })
  assert.deepEqual(planGenerator.schemeFor(null), { sets: 3, reps: 12 })

  assert.equal(
    planGenerator.exerciseCount({
      fitnessGoal: null,
      experienceLevel: 'avancado',
      activityLevel: 'moderado',
      workoutFrequency: null,
    }),
    8
  )
  assert.equal(
    planGenerator.exerciseCount({
      fitnessGoal: null,
      experienceLevel: 'intermediario',
      activityLevel: 'muito_ativo',
      workoutFrequency: null,
    }),
    8
  )
  assert.equal(
    planGenerator.exerciseCount({
      fitnessGoal: null,
      experienceLevel: 'iniciante',
      activityLevel: 'moderado',
      workoutFrequency: null,
    }),
    5
  )
  assert.equal(
    planGenerator.exerciseCount({
      fitnessGoal: null,
      experienceLevel: 'intermediario',
      activityLevel: 'moderado',
      workoutFrequency: null,
    }),
    6
  )

  assert.equal(planGenerator.categoryOrder('emagrecimento')[0], 'Cardio')
  assert.equal(planGenerator.categoryOrder('ganho_massa_muscular')[0], 'Chest')
  assert.equal(planGenerator.planName('ganho_peso'), 'Plano IA · Ganho de peso')
  assert.equal(planGenerator.planName(null), 'Plano IA · Treino personalizado')

  const picked = planGenerator.pickBalanced(
    [
      { id: 1, category: 'Chest' },
      { id: 2, category: 'Chest' },
      { id: 3, category: 'Back' },
      { id: 4, category: null },
    ],
    ['Chest', 'Back'],
    4
  )
  assert.deepEqual(picked, [1, 3, 4, 2])
})

test('modules/workout: workoutService valida elegibilidade, criação, busca, edição, remoção e controller', async () => {
  // getEligibility: free under limit, free at limit, premium unlimited, professor blocked
  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 1 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      return { rows: [] }
    },
    async (queries) => {
      const elig = await workoutService.getEligibility('u1')
      assert.equal(elig.limit, 2)
      assert.equal(elig.used, 1)
      assert.equal(elig.canCreate, true)
      assert.match(queries[0].sql, /created_by_trainer_id IS NULL/i)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 2 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      return { rows: [] }
    },
    async () => {
      const elig = await workoutService.getEligibility('u1')
      assert.equal(elig.canCreate, false)
      assert.match(String(elig.reason), /limite de 2 planos/i)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 10 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'premium' }] }
      }
      return { rows: [] }
    },
    async () => {
      const elig = await workoutService.getEligibility('u1')
      assert.equal(elig.limit, null)
      assert.equal(elig.canCreate, true)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 0 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'professor', subscription_type: 'basic' }] }
      }
      return { rows: [] }
    },
    async () => {
      const elig = await workoutService.getEligibility('prof1')
      assert.equal(elig.limit, 0)
      assert.equal(elig.canCreate, false)
    }
  )

  // create: ValidationError & SubscriptionLimitError & happy path
  await assert.rejects(
    () => workoutService.create('u1', { name: '   ', exercises: [] }),
    ValidationError
  )
  await assert.rejects(
    () =>
      workoutService.create('u1', {
        name: 'Treino A',
        exercises: [{ exerciseId: 1, sets: 0, reps: 10 }],
      }),
    ValidationError
  )

  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM exercises/i.test(sql)) return { rows: [{ id: 1 }] }
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 2 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      return { rows: [] }
    },
    async (queries) => {
      await assert.rejects(
        () =>
          workoutService.create('u1', {
            name: 'Treino Limite',
            exercises: [{ exerciseId: 1, sets: 3, reps: 12 }],
          }),
        SubscriptionLimitError
      )
      assert.equal(queries.some((q) => q.sql === 'ROLLBACK'), true)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/SELECT id FROM exercises/i.test(sql)) return { rows: [{ id: 10 }] }
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 0 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      if (/INSERT INTO workout_plans/i.test(sql)) return { rows: [{ id: 99 }] }
      if (/FROM workout_plans/i.test(sql)) {
        return {
          rows: [
            {
              id: 99,
              userId: 'u1',
              name: 'Treino Push',
              createdAt: '2026-11-01T10:00:00Z',
              createdByTrainerId: null,
            },
          ],
        }
      }
      if (/FROM plan_exercises/i.test(sql)) {
        return {
          rows: [
            {
              id: 1,
              exerciseId: 10,
              sets: 4,
              reps: 10,
              orderIndex: 0,
              restSeconds: 60,
              exercise: { id: 10, name: 'Supino', category: 'Chest', imageUrl: null, muscles: [] },
            },
          ],
        }
      }
      return { rows: [] }
    },
    async () => {
      const created = await workoutService.create('u1', {
        name: '  Treino Push  ',
        exercises: [{ exerciseId: 10, sets: 4, reps: 10 }],
      })
      assert.equal(created.id, 99)
      assert.equal(created.name, 'Treino Push')
      assert.equal(created.exercises.length, 1)
    }
  )

  // getById: PlanNotFoundError; update & remove: ForbiddenPlanError & PlanNotFoundError
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(() => workoutService.getById('u1', 999), PlanNotFoundError)
      await assert.rejects(
        () => workoutService.update('u1', 999, { name: 'X' }),
        PlanNotFoundError
      )
      await assert.rejects(() => workoutService.remove('u1', 999), PlanNotFoundError)
    }
  )

  await withDbStub(
    async () => ({ rows: [{ id: 5, created_by_trainer_id: 'trainer-1' }] }),
    async () => {
      await assert.rejects(
        () => workoutService.update('u1', 5, { name: 'Hack' }),
        ForbiddenPlanError
      )
      await assert.rejects(() => workoutService.remove('u1', 5), ForbiddenPlanError)
    }
  )

  // workoutController maps domain errors and invalid ids
  const badIdRes = createMockRes()
  await workoutController.getById(
    { userId: 'u1', params: { id: 'abc' } } as unknown as Request,
    badIdRes.res,
    createNextTracker().next
  )
  assert.equal(badIdRes.statusCode, 400)

  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      const notFoundRes = createMockRes()
      await workoutController.getById(
        { userId: 'u1', params: { id: '42' } } as unknown as Request,
        notFoundRes.res,
        createNextTracker().next
      )
      assert.equal(notFoundRes.statusCode, 404)
    }
  )

  // generateDraft: SubscriptionLimitError when blocked, fallback when no image_url, balanced draft
  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 2 }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      return { rows: [] }
    },
    async () => {
      await assert.rejects(() => workoutService.generateDraft('u1'), SubscriptionLimitError)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 0 }] }
      if (/FROM user_profiles/i.test(sql) && /SELECT role/i.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      if (/SELECT fitness_goal/i.test(sql)) {
        return {
          rows: [
            {
              fitnessGoal: 'emagrecimento',
              experienceLevel: 'iniciante',
              activityLevel: 'moderado',
              workoutFrequency: 3,
            },
          ],
        }
      }
      if (/WHERE image_url IS NOT NULL/i.test(sql)) return { rows: [] }
      if (/SELECT id, category FROM exercises/i.test(sql)) {
        return {
          rows: [
            { id: 1, category: 'Cardio' },
            { id: 2, category: 'Legs' },
          ],
        }
      }
      if (/WHERE e\.id = ANY/i.test(sql)) {
        return {
          rows: [
            { id: 1, name: 'Corrida', category: 'Cardio', imageUrl: null, muscles: [] },
            { id: 2, name: 'Agachamento', category: 'Legs', imageUrl: null, muscles: [] },
          ],
        }
      }
      return { rows: [] }
    },
    async () => {
      const draft = await workoutService.generateDraft('u1')
      assert.equal(draft.name, 'Plano IA · Emagrecimento')
      assert.equal(draft.goal, 'emagrecimento')
      assert.equal(draft.exercises.length, 2)
      assert.equal(draft.exercises[0].sets, 3)
      assert.equal(draft.exercises[0].reps, 15)
    }
  )

  // update & remove happy paths
  await withDbStub(
    async (sql) => {
      if (/SELECT id, created_by_trainer_id FROM workout_plans/i.test(sql)) {
        return { rows: [{ id: 8, created_by_trainer_id: null }] }
      }
      if (/FROM workout_plans/i.test(sql)) {
        return {
          rows: [
            {
              id: 8,
              userId: 'u1',
              name: 'Treino Editado',
              createdAt: '2026-11-01T10:00:00Z',
              createdByTrainerId: null,
            },
          ],
        }
      }
      return { rows: [] }
    },
    async (queries) => {
      const updated = await workoutService.update('u1', 8, { name: '  Treino Editado  ' })
      assert.equal(updated.name, 'Treino Editado')
      assert.equal(queries.some((q) => /UPDATE workout_plans SET name/i.test(q.sql)), true)

      await workoutService.remove('u1', 8)
      assert.equal(queries.some((q) => /DELETE FROM plan_exercises/i.test(q.sql)), true)
      assert.equal(queries.some((q) => /DELETE FROM workout_plans WHERE id/i.test(q.sql)), true)
    }
  )
})

// ============================================================================
// 5. Hydration Module
// ============================================================================
test('modules/hydration: buildHydrationStatus, getStatus, addIntake e setCustomGoal', async () => {
  const full = buildHydrationStatus('2026-11-10', 3000, 2500, null)
  assert.equal(full.goalMl, 2500)
  assert.equal(full.cups.consumed, 12)
  assert.equal(full.cups.total, 10)
  assert.equal(full.percentage, 100)

  const zeroGoal = buildHydrationStatus('2026-11-10', 0, 0, null)
  assert.equal(zeroGoal.cups.total, 1)
  assert.equal(zeroGoal.percentage, 0)

  // getStatus: profile missing vs fallback DEFAULT_GOAL_ML vs weight-based goal
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(() => hydrationService.getStatus('u1'), /Perfil não encontrado/)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ weight_kg: null, hydration_goal_ml: null }] }
      }
      return { rows: [] }
    },
    async () => {
      const status = await hydrationService.getStatus('u1')
      assert.equal(status.suggestedGoalMl, 2000)
      assert.equal(status.consumedMl, 0)
    }
  )

  await withDbStub(
    async (sql) => {
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ weight_kg: '80', hydration_goal_ml: 3000 }] }
      }
      if (/INSERT INTO hydration_logs/i.test(sql)) {
        return { rows: [{ consumed_ml: 500, log_date: '2026-11-10' }] }
      }
      return { rows: [] }
    },
    async (queries) => {
      const status = await hydrationService.addIntake('u1', 250.4)
      assert.equal(status.suggestedGoalMl, 2800)
      assert.equal(status.goalMl, 3000)
      assert.equal(status.consumedMl, 500)
      const ins = queries.find((q) => /INSERT INTO hydration_logs/i.test(q.sql))
      assert.equal(ins?.params?.[2], 250)
    }
  )

  // Controller validates amountMl & goalMl types
  const badIntakeRes = createMockRes()
  await hydrationController.addIntake(
    { userId: 'u1', body: { amountMl: '250' } } as unknown as Request,
    badIntakeRes.res,
    createNextTracker().next
  )
  assert.equal(badIntakeRes.statusCode, 400)

  const badGoalRes = createMockRes()
  await hydrationController.setGoal(
    { userId: 'u1', body: { goalMl: '2500' } } as unknown as Request,
    badGoalRes.res,
    createNextTracker().next
  )
  assert.equal(badGoalRes.statusCode, 400)

  // setCustomGoal bounds validation + null reset via controller
  await assert.rejects(() => hydrationService.setCustomGoal('u1', 499), /500ml e 8000ml/)
  await assert.rejects(() => hydrationService.setCustomGoal('u1', 8001), /500ml e 8000ml/)

  await withDbStub(
    async (sql) => {
      if (/UPDATE user_profiles/i.test(sql)) return { rows: [{ user_id: 'u1' }] }
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ weight_kg: '70', hydration_goal_ml: null }] }
      }
      return { rows: [] }
    },
    async () => {
      const resetRes = createMockRes()
      await hydrationController.setGoal(
        { userId: 'u1', body: { goalMl: null } } as unknown as Request,
        resetRes.res,
        createNextTracker().next
      )
      assert.equal(resetRes.statusCode, 200)
      const reset = resetRes.body as { customGoalMl: number | null; goalMl: number }
      assert.equal(reset.customGoalMl, null)
      assert.equal(reset.goalMl, 2450)
    }
  )
})

// ============================================================================
// 6. Measurement Module
// ============================================================================
test('modules/measurement: create, getSummary e setGoal', async () => {
  await assert.rejects(
    () => measurementService.create('u1', { weightKg: 0 }),
    MeasurementValidationError
  )
  await assert.rejects(
    () => measurementService.create('u1', { weightKg: 501 }),
    MeasurementValidationError
  )
  await assert.rejects(
    () => measurementService.create('u1', { weightKg: 75, measuredAt: '2999-01-01' }),
    MeasurementValidationError
  )

  // Retroactive weight preserves most recent chronological measurement
  await withDbStub(
    async (sql) => {
      if (/INSERT INTO body_measurements/i.test(sql)) {
        return { rows: [{ id: 12, weight_kg: '71.2', measured_at: '2026-09-01' }] }
      }
      if (/SELECT weight_kg FROM body_measurements/i.test(sql)) {
        return { rows: [{ weight_kg: '74.8' }] }
      }
      return { rows: [] }
    },
    async (queries) => {
      const m = await measurementService.create('u1', {
        weightKg: 71.2,
        measuredAt: '2026-09-01',
      })
      assert.equal(m.weightKg, 71.2)
      assert.equal(m.measuredAt, '2026-09-01')
      const updProfile = queries.find((q) => /UPDATE user_profiles SET weight_kg/i.test(q.sql))
      const updUser = queries.find((q) => /UPDATE users SET weight_kg/i.test(q.sql))
      assert.equal(updProfile?.params?.[0], 74.8)
      assert.equal(updUser?.params?.[0], 74.8)
    }
  )

  // getSummary calculates delta, remainingToGoal, progressPct clamped [0, 100]
  await withDbStub(
    async (sql) => {
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ weight_kg: '75', desired_weight_kg: '70' }] }
      }
      if (/FROM body_measurements/i.test(sql)) {
        return {
          rows: [
            { id: 1, weight_kg: '80', measured_at: '2026-09-01' },
            { id: 2, weight_kg: '75', measured_at: '2026-10-01' },
          ],
        }
      }
      return { rows: [] }
    },
    async () => {
      const summary = await measurementService.getSummary('u1')
      assert.equal(summary.start, 80)
      assert.equal(summary.current, 75)
      assert.equal(summary.goal, 70)
      assert.equal(summary.deltaFromStart, -5)
      assert.equal(summary.remainingToGoal, 5)
      assert.equal(summary.progressPct, 50)
      assert.equal(summary.history.length, 2)
    }
  )

  // getSummary with empty history falls back to profile weight and handles start === goal
  await withDbStub(
    async (sql) => {
      if (/FROM user_profiles/i.test(sql)) {
        return { rows: [{ weight_kg: '70', desired_weight_kg: '70' }] }
      }
      return { rows: [] }
    },
    async () => {
      const emptySummary = await measurementService.getSummary('u1')
      assert.equal(emptySummary.current, 70)
      assert.equal(emptySummary.start, 70)
      assert.equal(emptySummary.progressPct, null)
      assert.deepEqual(emptySummary.history, [])
    }
  )

  // setGoal validation & persistence
  await assert.rejects(() => measurementService.setGoal('u1', -5), /Meta de peso inválida/)
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(() => measurementService.setGoal('u1', 70), /Perfil não encontrado/)
    }
  )

  const goalRes = createMockRes()
  await measurementController.setGoal(
    { userId: 'u1', body: { desiredWeightKg: '70' } } as unknown as Request,
    goalRes.res,
    createNextTracker().next
  )
  assert.equal(goalRes.statusCode, 400)
})

// ============================================================================
// 7. Session Module
// ============================================================================
test('modules/session: dateKey, isValidIsoDate, create e getStats', async () => {
  assert.equal(dateKey(new Date('2026-11-03T01:30:00.000Z')), '2026-11-02')
  assert.equal(isValidIsoDate('2024-02-29'), true)
  assert.equal(isValidIsoDate('2025-02-29'), false)
  assert.equal(isValidIsoDate('2026-04-31'), false)
  assert.equal(isValidIsoDate('1899-01-01'), false)
  assert.equal(isValidIsoDate(null), false)

  // Controller requires startedAt
  const missingStartRes = createMockRes()
  await sessionController.create(
    { userId: 'u1', body: {} } as Request,
    missingStartRes.res,
    createNextTracker().next
  )
  assert.equal(missingStartRes.statusCode, 400)

  // create persists with null planId fallback
  await withDbStub(
    async () => ({ rows: [{ id: 77 }] }),
    async (queries) => {
      const created = await sessionService.create('u1', {
        startedAt: '2026-11-10T10:00:00.000Z',
      })
      assert.equal(created.id, 77)
      assert.equal(queries[0].params?.[1], null)
      assert.equal(typeof queries[0].params?.[3], 'string')
    }
  )

  // getStats computes streak, totals, avgDurationMin and 7-day week array
  const today = dateKey(new Date())
  const todayAnchor = new Date(`${today}T12:00:00Z`)
  const yesterdayAnchor = new Date(todayAnchor.getTime() - 24 * 3600 * 1000)
  const twoDaysAgoAnchor = new Date(todayAnchor.getTime() - 2 * 24 * 3600 * 1000)

  const scheduleDays = [false, false, false, false, false, false, false]
  scheduleDays[yesterdayAnchor.getUTCDay()] = true
  scheduleDays[twoDaysAgoAnchor.getUTCDay()] = true

  await withDbStub(
    async (sql) => {
      if (/SELECT workout_schedule.*FROM user_profiles/i.test(sql)) {
        return { rows: [{ workout_schedule: { days: scheduleDays, time: '18:00' } }] }
      }
      if (/AVG\(EXTRACT/i.test(sql)) {
        return { rows: [{ total: 4, avg_seconds: 2700 }] }
      }
      if (/SELECT finished_at/i.test(sql)) {
        return {
          rows: [
            { finished_at: yesterdayAnchor.toISOString() },
            { finished_at: twoDaysAgoAnchor.toISOString() },
          ],
        }
      }
      return { rows: [] }
    },
    async () => {
      const stats = await sessionService.getStats('u1')
      assert.equal(stats.total, 4)
      assert.equal(stats.avgDurationMin, 45)
      assert.equal(stats.scheduledPerWeek, 2)
      assert.equal(stats.week.length, 7)
      assert.equal(stats.streak >= 2, true)
      assert.equal(stats.week.some((d) => d.isToday), true)
      assert.equal(typeof stats.adherencePct, 'number')
    }
  )

  // getStats with no scheduled days returns adherencePct null and streak 0
  await withDbStub(
    async (sql) => {
      if (/SELECT workout_schedule.*FROM user_profiles/i.test(sql)) {
        return { rows: [{ workout_schedule: null }] }
      }
      if (/AVG\(EXTRACT/i.test(sql)) {
        return { rows: [{ total: 0, avg_seconds: null }] }
      }
      return { rows: [] }
    },
    async () => {
      const emptyStats = await sessionService.getStats('u1')
      assert.equal(emptyStats.total, 0)
      assert.equal(emptyStats.avgDurationMin, null)
      assert.equal(emptyStats.scheduledPerWeek, 0)
      assert.equal(emptyStats.streak, 0)
      assert.equal(emptyStats.adherencePct, null)
    }
  )

  // getStats for newly created account today does not count pre-signup days as missed
  await withDbStub(
    async (sql) => {
      if (/SELECT workout_schedule.*FROM user_profiles/i.test(sql)) {
        return {
          rows: [
            {
              workout_schedule: {
                days: [true, true, true, true, true, true, true],
                time: '18:00',
              },
              created_at: new Date().toISOString(),
            },
          ],
        }
      }
      if (/AVG\(EXTRACT/i.test(sql)) {
        return { rows: [{ total: 0, avg_seconds: null }] }
      }
      return { rows: [] }
    },
    async () => {
      const newStats = await sessionService.getStats('u-new')
      assert.equal(newStats.week.filter((d) => d.missed).length, 0)
      assert.equal(newStats.adherencePct, null)
      assert.equal(newStats.streak, 0)
    }
  )
})

// ============================================================================
// 8. User Profile Module
// ============================================================================
test('modules/user-profile: PROFILE_FIELD_MAP, getByUserId, upsert e update seguro', async () => {
  assert.equal(PROFILE_FIELD_MAP.weightKg, 'weight_kg')
  assert.equal(PROFILE_FIELD_MAP['role; DROP TABLE users;--'], undefined)

  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(() => userProfileService.getByUserId('u-missing'), /Perfil não encontrado/)
    }
  )

  const dbProfileRow = {
    id: 'p1',
    user_id: 'u1',
    weight_kg: '80',
    height_cm: 180,
    birth_date: '1995-01-15',
    gender: 'masculino',
    fitness_goal: 'ganho_massa_muscular',
    experience_level: 'intermediario',
    activity_level: 'ativo',
    workout_days: 4,
    workout_frequency: 4,
    last_workout_date: null,
    consistency_score: 80,
    subscription_type: 'free',
    desired_weight_kg: '78',
    hydration_reminder: true,
    desired_modality: 'Musculação',
    workout_schedule: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  }

  await withDbStub(
    async () => ({ rows: [dbProfileRow] }),
    async () => {
      const res = await userProfileService.getByUserId('u1')
      assert.equal(res.profile.weightKg, 80)
      assert.equal(res.profile.bmi, 24.69)
      assert.equal(typeof res.profile.age, 'number')

      const upserted = await userProfileService.upsert('u1', {
        weightKg: 80,
        heightCm: 180,
      })
      assert.equal(upserted.profile.bmi, 24.69)
    }
  )

  // update ignores unknown fields and fails cleanly if nothing valid remains
  await assert.rejects(
    () =>
      userProfileService.update('u1', {
        hackedField: 'DROP TABLE',
      } as unknown as Record<string, unknown>),
    /Nenhum campo para atualizar/
  )

  await withDbStub(
    async () => ({ rows: [dbProfileRow] }),
    async (queries) => {
      const updated = await userProfileService.update('u1', {
        weightKg: 79,
        workoutSchedule: { days: [false, true, false, true, false, false, false], time: '08:00' },
        ignoredUnknownColumn: 'malicious',
      } as unknown as Record<string, unknown>)
      assert.equal(updated.profile.userId, 'u1')
      assert.doesNotMatch(queries[0].sql, /ignoredUnknownColumn/)
      assert.match(queries[0].sql, /weight_kg = \$1/)
      assert.match(queries[0].sql, /workout_schedule = \$2/)
    }
  )

  // update throws when profile not found
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(
        () => userProfileService.update('u-missing', { weightKg: 75 }),
        /Perfil não encontrado/
      )
    }
  )

  // Controller 401 when unauthenticated
  const unauthRes = createMockRes()
  await userProfileController.getProfile(
    {} as Request,
    unauthRes.res,
    createNextTracker().next
  )
  assert.equal(unauthRes.statusCode, 401)
})

// ============================================================================
// 9. Exercise Module
// ============================================================================
test('modules/exercise: list com filtros/paginação, listByIds, getById, categories e muscles', async () => {
  await withDbStub(
    async (sql) => {
      if (/SELECT COUNT\(\*\)::int AS total/i.test(sql)) return { rows: [{ total: 1 }] }
      return {
        rows: [
          {
            id: 10,
            wgerId: 100,
            name: 'Supino Reto',
            description: 'Peitoral',
            category: 'Chest',
            imageUrl: null,
            muscles: [{ id: 1, name: 'Pectoralis major', isPrimary: true }],
          },
        ],
      }
    },
    async (queries) => {
      const res = await exerciseService.list({
        search: 'Supino',
        category: 'Chest',
        muscleId: 1,
        limit: 999,
        offset: 5,
      })
      assert.equal(res.pagination.total, 1)
      assert.equal(res.pagination.limit, 100)
      assert.equal(res.pagination.offset, 5)
      assert.equal(res.exercises[0].name, 'Supino Reto')
      assert.match(queries[0].sql, /ILIKE \$1/i)
      assert.match(queries[0].sql, /e\.category = \$2/i)
      assert.match(queries[0].sql, /em2\.muscle_id = \$3/i)
    }
  )

  // listByIds empty guard does not query DB
  await withDbStub(
    async () => {
      throw new Error('listByIds([]) não deveria consultar o banco')
    },
    async () => {
      const empty = await exerciseService.listByIds([])
      assert.deepEqual(empty, [])
    }
  )

  // listByIds preserves requested ID order
  await withDbStub(
    async () => ({
      rows: [
        { id: 2, wgerId: 2, name: 'B', description: null, category: 'Back', imageUrl: null, muscles: [] },
        { id: 1, wgerId: 1, name: 'A', description: null, category: 'Chest', imageUrl: null, muscles: [] },
      ],
    }),
    async () => {
      const ordered = await exerciseService.listByIds([1, 999, 2])
      assert.deepEqual(
        ordered.map((e) => e.id),
        [1, 2]
      )
    }
  )

  // getById & controller 400 / 404
  await withDbStub(
    async () => ({ rows: [] }),
    async () => {
      await assert.rejects(() => exerciseService.getById(999), /Exercício não encontrado/)
      const notFoundRes = createMockRes()
      await exerciseController.getById(
        { params: { id: '999' } } as unknown as Request,
        notFoundRes.res,
        createNextTracker().next
      )
      assert.equal(notFoundRes.statusCode, 404)
    }
  )

  const badExIdRes = createMockRes()
  await exerciseController.getById(
    { params: { id: 'not-int' } } as unknown as Request,
    badExIdRes.res,
    createNextTracker().next
  )
  assert.equal(badExIdRes.statusCode, 400)

  await withDbStub(
    async (sql) => {
      if (/SELECT DISTINCT category/i.test(sql)) {
        return { rows: [{ category: 'Back' }, { category: 'Chest' }] }
      }
      return { rows: [{ id: 1, name: 'Biceps', wgerId: 1 }] }
    },
    async () => {
      assert.deepEqual(await exerciseService.listCategories(), ['Back', 'Chest'])
      assert.deepEqual(await exerciseService.listMuscles(), [{ id: 1, name: 'Biceps', wgerId: 1 }])
    }
  )
})

// ============================================================================
// 10. Payment Module
// ============================================================================
test('modules/payment: isSubscriptionAllowedForRole e rota POST /api/payment/subscribe', async () => {
  assert.equal(isSubscriptionAllowedForRole('comum', 'free'), true)
  assert.equal(isSubscriptionAllowedForRole('comum', 'premium'), true)
  assert.equal(isSubscriptionAllowedForRole('comum', 'basic'), false)
  assert.equal(isSubscriptionAllowedForRole('comum', 'enterprise'), false)

  assert.equal(isSubscriptionAllowedForRole('professor', 'free'), true)
  assert.equal(isSubscriptionAllowedForRole('professor', 'basic'), true)
  assert.equal(isSubscriptionAllowedForRole('professor', 'premium'), false)
  assert.equal(isSubscriptionAllowedForRole('professor', null), false)

  const studentToken = jwt.sign(
    { userId: 'u-pay', email: 'pay@bodysync.com', role: 'comum' },
    env.JWT_SECRET,
    { expiresIn: '5m' }
  )

  await withDbStub(
    async (sql) => {
      if (/SELECT role FROM users/i.test(sql)) return { rows: [{ role: 'comum' }] }
      return { rows: [] }
    },
    async (queries) => {
      const forbiddenPlan = await dispatchToApp('POST', '/api/payment/subscribe', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: { subscriptionType: 'basic' },
      })
      assert.equal(forbiddenPlan.status, 400)

      const okPlan = await dispatchToApp('POST', '/api/payment/subscribe', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: { subscriptionType: 'premium' },
      })
      assert.equal(okPlan.status, 200)
      const json = okPlan.json<{
        success: boolean
        data: { subscription: string; status: string }
      }>()
      assert.equal(json.success, true)
      assert.equal(json.data.subscription, 'premium')
      assert.equal(
        queries.some((q) => /UPDATE user_profiles SET subscription_type/i.test(q.sql)),
        true
      )
      assert.equal(
        queries.some((q) => /UPDATE users SET subscription_type/i.test(q.sql)),
        true
      )
    }
  )
})
