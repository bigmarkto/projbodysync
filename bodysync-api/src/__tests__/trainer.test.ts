// @ts-nocheck
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Trainer Module: TDD (Erros, Autorização e Schema SQL)', async (t) => {
  const { trainerService, TrainerError } = require('../modules/trainer/trainer.service')
  const { AppError } = require('../middleware/error.middleware')
  const authMw = require('../middleware/auth.middleware')

  await t.test('TrainerError deve herdar de AppError para preservar status HTTP', () => {
    const err = new TrainerError('Proibido', 403)
    assert.equal(err instanceof AppError, true)
    assert.equal(err.statusCode, 403)
  })

  await t.test('requireProfessor bloqueia aluno (comum) com 403 e libera professor', async () => {
    assert.equal(typeof authMw.requireProfessor, 'function')

    let statusCode = null
    let jsonBody = null
    let nextCalled = false

    const resStub = {
      status(code) {
        statusCode = code
        return this
      },
      json(body) {
        jsonBody = body
        return this
      },
    }

    await authMw.requireProfessor({ userId: 'u1', userRole: 'comum' }, resStub, () => {
      nextCalled = true
    })
    assert.equal(statusCode, 403)
    assert.equal(nextCalled, false)
    assert.ok(jsonBody?.error)

    statusCode = null
    nextCalled = false
    await authMw.requireProfessor({ userId: 't1', userRole: 'professor' }, resStub, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
  })

  await t.test('getStudentDetail e prescribeWorkout validam formato UUID', async () => {
    await assert.rejects(
      () => trainerService.getStudentDetail('not-a-uuid', '11111111-1111-4111-8111-111111111111'),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )
    await assert.rejects(
      () => trainerService.getStudentDetail('11111111-1111-4111-8111-111111111111', 'stu-1'),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )
  })

  await t.test('lookupTrainerByCode rejeita código vazio', async () => {
    assert.equal(typeof trainerService.lookupTrainerByCode, 'function')
    await assert.rejects(
      () => trainerService.lookupTrainerByCode('11111111-1111-4111-8111-111111111111', '   '),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )
  })

  await t.test('connectStudent rejeita código vazio', async () => {
    await assert.rejects(
      () => trainerService.connectStudent('11111111-1111-4111-8111-111111111111', ''),
      (err) => err instanceof TrainerError && err.message === 'Informe o código de convite'
    )
  })

  await t.test('prescribeWorkout valida payload e UUID do aluno', async () => {
    await assert.rejects(
      () =>
        trainerService.prescribeWorkout('11111111-1111-4111-8111-111111111111', {
          studentId: 'stu-1',
          name: 'Treino A',
          exercises: [{ exerciseId: 1, sets: 3, reps: 10 }],
        }),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )

    await assert.rejects(
      () =>
        trainerService.prescribeWorkout('11111111-1111-4111-8111-111111111111', {
          studentId: '11111111-1111-4111-8111-111111111112',
          name: 'Treino A',
          exercises: [],
        }),
      (err) => err instanceof TrainerError && /pelo menos um exercício/i.test(err.message)
    )
  })

  await t.test('trainer.service.ts não referencia colunas inexistentes no schema do Postgres', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../modules/trainer/trainer.service.ts'),
      'utf8'
    )
    assert.equal(/\bup\.name\b/.test(src), false, 'up.name não existe em user_profiles')
    assert.equal(/\bcalories_burned\b/.test(src), false, 'calories_burned não existe em workout_sessions')
    assert.equal(/\bduration_seconds\b/.test(src), false, 'duration_seconds não existe em workout_sessions')
    assert.equal(/\bweight::float\b/.test(src), false, 'use weight_kg em body_measurements')
  })

  async function withDbStub(handler, fn) {
    const { db } = require('../config/database')
    const origQuery = db.query
    const origConnect = db.connect
    db.query = handler
    db.connect = async () => ({
      query: handler,
      release() {},
    })
    try {
      await fn()
    } finally {
      db.query = origQuery
      db.connect = origConnect
    }
  }

  await t.test('prescribeWorkout persiste restSeconds e getStudentDetail retorna restSeconds, category e createdByTrainerId', async () => {
    const queries = []
    await withDbStub(async (sql, params) => {
      queries.push({ sql, params })
      if (/FROM trainer_students/.test(sql)) return { rows: [{ id: 'link-1', joinedAt: new Date().toISOString() }] }
      if (/SELECT id FROM exercises/.test(sql)) return { rows: [{ id: 10 }] }
      if (/INSERT INTO workout_plans/.test(sql)) {
        return { rows: [{ id: 55, name: 'Treino Peito', createdAt: new Date().toISOString() }] }
      }
      if (/INSERT INTO plan_exercises/.test(sql)) return { rows: [] }
      if (/FROM users u/.test(sql)) {
        return {
          rows: [{
            studentId: '22222222-2222-4222-8222-222222222222',
            name: 'Aluno Teste',
            email: 'aluno@teste.com',
            fitnessGoal: 'hipertrofia',
            weightKg: 75,
            targetWeightKg: 80,
            heightCm: 175,
            gender: 'masculino',
            birthDate: '1998-05-15',
            workoutFrequency: 4,
            hydrationGoalMl: 2500,
          }],
        }
      }
      if (/FROM workout_plans p/.test(sql)) {
        return {
          rows: [{
            id: 55,
            name: 'Treino Peito',
            createdAt: new Date().toISOString(),
            createdByTrainerId: '11111111-1111-4111-8111-111111111111',
            exerciseCount: 1,
          }],
        }
      }
      if (/FROM plan_exercises pe/.test(sql)) {
        return {
          rows: [{
            id: 1,
            planId: 55,
            exerciseId: 10,
            name: 'Supino Reto',
            category: 'Chest',
            sets: 4,
            reps: 10,
            orderIndex: 0,
            restSeconds: 90,
          }],
        }
      }
      return { rows: [] }
    }, async () => {
      await trainerService.prescribeWorkout('11111111-1111-4111-8111-111111111111', {
        studentId: '22222222-2222-4222-8222-222222222222',
        name: 'Treino Peito',
        exercises: [{ exerciseId: 10, sets: 4, reps: 10, restSeconds: 90 }],
      })

      const insertEx = queries.find((q) => /INSERT INTO plan_exercises/.test(q.sql))
      assert.ok(insertEx, 'esperava INSERT INTO plan_exercises')
      assert.match(insertEx.sql, /rest_seconds/, 'INSERT deve gravar rest_seconds')
      assert.equal(insertEx.params.includes(90), true, 'INSERT deve receber restSeconds = 90')

      const detail = await trainerService.getStudentDetail(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222'
      )
      assert.equal(detail.prescribedPlans[0].createdByTrainerId, '11111111-1111-4111-8111-111111111111')
      assert.equal(detail.prescribedPlans[0].exercises[0].restSeconds, 90)
      assert.equal(detail.prescribedPlans[0].exercises[0].category, 'Chest')
    })
  })

  await t.test('deletePrescribedPlan valida posse e exclui ficha do Personal', async () => {
    assert.equal(typeof trainerService.deletePrescribedPlan, 'function', 'deletePrescribedPlan deve existir')
    const queries = []
    await withDbStub(async (sql, params) => {
      queries.push({ sql, params })
      if (/DELETE FROM workout_plans/.test(sql)) {
        return { rows: [{ id: 77 }] }
      }
      return { rows: [] }
    }, async () => {
      await assert.rejects(
        () => trainerService.deletePrescribedPlan('11111111-1111-4111-8111-111111111111', 0),
        (err) => err instanceof TrainerError && err.statusCode === 400
      )
      const res = await trainerService.deletePrescribedPlan('11111111-1111-4111-8111-111111111111', 77)
      assert.equal(res.success, true)
      const del = queries.find((q) => /DELETE FROM workout_plans/.test(q.sql))
      assert.match(del.sql, /created_by_trainer_id/, 'DELETE deve exigir created_by_trainer_id')
    })
  })

  await t.test('connectStudent bloqueia professor/admin de se vincular como aluno', async () => {
    await withDbStub(async (sql) => {
      if (/SELECT role FROM users/.test(sql)) {
        return { rows: [{ role: 'professor' }] }
      }
      if (/FROM trainer_students ts/.test(sql)) {
        return {
          rows: [{
            trainer_id: '11111111-1111-4111-8111-111111111111',
            invite_code: 'BS-ABCD',
            trainer_name: 'Prof X',
          }],
        }
      }
      return { rows: [] }
    }, async () => {
      await assert.rejects(
        () => trainerService.connectStudent('22222222-2222-4222-8222-222222222222', 'BS-ABCD'),
        (err) => err instanceof TrainerError && err.statusCode === 403
      )
    })
  })

  await t.test('getAnalytics usa joinedAt quando não há treinos (sem inventar 7 dias para aluno novo)', async () => {
    const joinedToday = new Date().toISOString()
    const joinedSixDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
    await withDbStub(async (sql) => {
      if (/FROM trainer_students ts/.test(sql) && /lastWorkoutDate/.test(sql)) {
        return {
          rows: [
            {
              id: 'link-1',
              studentId: '22222222-2222-4222-8222-222222222222',
              name: 'Aluno Novo',
              email: 'novo@teste.com',
              fitnessGoal: 'hipertrofia',
              weightKg: 70,
              heightCm: 170,
              gender: 'masculino',
              workoutFrequency: 4,
              joinedAt: joinedToday,
              lastWorkoutDate: null,
              weekAttended: 0,
            },
            {
              id: 'link-2',
              studentId: '33333333-3333-4333-8333-333333333333',
              name: 'Aluno Inativo',
              email: 'inativo@teste.com',
              fitnessGoal: 'hipertrofia',
              weightKg: 75,
              heightCm: 175,
              gender: 'masculino',
              workoutFrequency: 4,
              joinedAt: joinedSixDaysAgo,
              lastWorkoutDate: null,
              weekAttended: 0,
            },
          ],
        }
      }
      return { rows: [] }
    }, async () => {
      const analytics = await trainerService.getAnalytics('11111111-1111-4111-8111-111111111111')
      assert.equal(analytics.attentionStudents.length, 1, 'somente o aluno vinculado há >= 4 dias entra em atenção')
      assert.equal(analytics.attentionStudents[0].studentId, '33333333-3333-4333-8333-333333333333')
      assert.equal(analytics.attentionStudents[0].neverTrained, true)
      assert.equal(analytics.attentionStudents[0].daysInactive >= 5, true)
    })
  })

  await t.test('workoutService protege ficha prescrita contra edição/exclusão e não conta no limite Free', async () => {
    const { workoutService, ForbiddenPlanError } = require('../modules/workout/workout.service')
    const queries = []
    await withDbStub(async (sql, params) => {
      queries.push({ sql, params })
      if (/FROM workout_plans WHERE id = \$1 AND user_id = \$2/.test(sql)) {
        return {
          rows: [{ id: 10, created_by_trainer_id: '11111111-1111-4111-8111-111111111111' }],
        }
      }
      if (/SELECT[\s\S]*created_by_trainer_id[\s\S]*FROM workout_plans/i.test(sql)) {
        return {
          rows: [{
            id: 10,
            name: 'Ficha do Personal',
            createdAt: new Date().toISOString(),
            createdByTrainerId: '11111111-1111-4111-8111-111111111111',
            exerciseCount: 2,
          }],
        }
      }
      if (/FROM user_profiles WHERE user_id/.test(sql)) {
        return { rows: [{ role: 'comum', subscription_type: 'free' }] }
      }
      return { rows: [] }
    }, async () => {
      const metaResult = await workoutService.listWithMeta('22222222-2222-4222-8222-222222222222')
      assert.equal(metaResult.meta.used, 0, 'ficha do personal não deve consumir cota Free')

      await assert.rejects(
        () => workoutService.remove('22222222-2222-4222-8222-222222222222', 10),
        (err) => err instanceof ForbiddenPlanError && /personal/i.test(err.message)
      )
      await assert.rejects(
        () => workoutService.update('22222222-2222-4222-8222-222222222222', 10, { name: 'Hack' }),
        (err) => err instanceof ForbiddenPlanError && /personal/i.test(err.message)
      )
    })
  })

  await t.test('authController.register bloqueia admin e inicia assinatura paga como free até PaymentScreen', async () => {
    const { authController } = require('../modules/auth/auth.controller')
    const { authService } = require('../modules/auth/auth.service')
    const origRegister = authService.register
    let capturedRole = null
    let capturedSub = null

    authService.register = async (payload) => {
      capturedRole = payload.role
      capturedSub = payload.subscriptionType
      return { user: { id: 'u1', ...payload }, accessToken: 'a', refreshToken: 'r' }
    }

    const runRegister = async (body) => {
      let status = 200
      let payload = null
      const res = {
        status(code) { status = code; return this },
        json(data) { payload = data; return this },
      }
      await authController.register({ body }, res, () => {})
      return { status, payload }
    }

    try {
      const adminAttempt = await runRegister({
        email: 'adm@teste.com',
        password: 'Password1',
        name: 'Admin Hack',
        birthYear: '1990-01-01',
        heightCm: 170,
        weightKg: 70,
        gender: 'masculino',
        role: 'admin',
      })
      assert.equal(adminAttempt.status >= 400, true, 'não pode permitir auto-cadastro como admin')

      const profAttempt = await runRegister({
        email: 'prof@teste.com',
        password: 'Password1',
        name: 'Prof Teste',
        birthYear: '1990-01-01',
        heightCm: 170,
        weightKg: 70,
        gender: 'masculino',
        role: 'professor',
        subscriptionType: 'premium',
      })
      assert.equal(profAttempt.status, 201)
      assert.equal(capturedRole, 'professor')
      assert.equal(capturedSub, 'free', 'cadastro público deve iniciar como free até confirmar pagamento')
    } finally {
      authService.register = origRegister
    }
  })

  await t.test('isSubscriptionAllowedForRole valida plano compatível por perfil', () => {
    const { isSubscriptionAllowedForRole } = require('../modules/payment/payment.routes')
    assert.equal(isSubscriptionAllowedForRole('professor', 'basic'), true)
    assert.equal(isSubscriptionAllowedForRole('professor', 'free'), true)
    assert.equal(isSubscriptionAllowedForRole('professor', 'premium'), false)
    assert.equal(isSubscriptionAllowedForRole('comum', 'premium'), true)
    assert.equal(isSubscriptionAllowedForRole('comum', 'basic'), false)
    assert.equal(isSubscriptionAllowedForRole('comum', 'hack'), false)
  })

  await t.test('migration 005 corrige FK workout_sessions, coluna rest_seconds e índice único invite_code', () => {
    const migPath = path.resolve(__dirname, '../../migrations/005_trainer_plan_rest_and_fk.sql')
    assert.equal(fs.existsSync(migPath), true, 'migration 005 deve existir')
    const sql = fs.readFileSync(migPath, 'utf8')
    assert.match(sql, /rest_seconds/i)
    assert.match(sql, /ON DELETE SET NULL/i)
    assert.match(sql, /CREATE UNIQUE INDEX/i)
  })

  await t.test('createEvaluation valida campos, vínculo ativo e persiste avaliação física do Personal', async () => {
    assert.equal(typeof trainerService.createEvaluation, 'function', 'createEvaluation deve existir')

    const trainerId = '11111111-1111-4111-8111-111111111111'
    const studentId = '22222222-2222-4222-8222-222222222222'

    await assert.rejects(
      () =>
        trainerService.createEvaluation(trainerId, {
          studentId,
          evaluatedAt: '11/11/2026',
          rating: 5,
          notes: 'Boa evolução',
        }),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )

    await assert.rejects(
      () =>
        trainerService.createEvaluation(trainerId, {
          studentId,
          evaluatedAt: '2026-11-11',
          rating: 6,
          notes: 'Nota fora da faixa',
        }),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )

    await assert.rejects(
      () =>
        trainerService.createEvaluation(trainerId, {
          studentId,
          evaluatedAt: '2026-11-11',
          rating: 4,
          notes: '   ',
        }),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )

    await withDbStub(async (sql) => {
      if (/FROM trainer_students/.test(sql)) return { rows: [] }
      return { rows: [] }
    }, async () => {
      await assert.rejects(
        () =>
          trainerService.createEvaluation(trainerId, {
            studentId,
            evaluatedAt: '2026-11-11',
            rating: 5,
            notes: 'Sem vínculo ativo',
          }),
        (err) => err instanceof TrainerError && err.statusCode === 403
      )
    })

    const queries = []
    await withDbStub(async (sql, params) => {
      queries.push({ sql, params })
      if (/FROM trainer_students/.test(sql)) return { rows: [{ id: 'link-1' }] }
      if (/INSERT INTO student_evaluations/.test(sql)) {
        return {
          rows: [{
            id: '33333333-3333-4333-8333-333333333333',
            trainerId,
            trainerName: 'Personal Teste',
            studentId,
            evaluatedAt: '2026-11-11',
            rating: 5,
            notes: 'Excelente evolução de carga e postura.',
            weightKg: 76.5,
            bodyFatPct: 14.2,
            chestCm: null,
            waistCm: 80.5,
            armCm: 37,
            thighCm: null,
            createdAt: new Date().toISOString(),
          }],
        }
      }
      return { rows: [] }
    }, async () => {
      const created = await trainerService.createEvaluation(trainerId, {
        studentId,
        evaluatedAt: '2026-11-11',
        rating: 5,
        notes: 'Excelente evolução de carga e postura.',
        weightKg: 76.5,
        bodyFatPct: 14.2,
        waistCm: 80.5,
        armCm: 37,
      })
      assert.equal(created.rating, 5)
      assert.equal(created.weightKg, 76.5)
      assert.equal(created.waistCm, 80.5)
      const ins = queries.find((q) => /INSERT INTO student_evaluations/.test(q.sql))
      assert.ok(ins, 'deve executar INSERT em student_evaluations')
    })
  })

  await t.test('deleteEvaluation e getMyEvaluations respeitam posse e UUID', async () => {
    assert.equal(typeof trainerService.deleteEvaluation, 'function', 'deleteEvaluation deve existir')
    assert.equal(typeof trainerService.getMyEvaluations, 'function', 'getMyEvaluations deve existir')

    const trainerId = '11111111-1111-4111-8111-111111111111'
    const studentId = '22222222-2222-4222-8222-222222222222'
    const evalId = '33333333-3333-4333-8333-333333333333'

    await assert.rejects(
      () => trainerService.deleteEvaluation(trainerId, 'invalid-id'),
      (err) => err instanceof TrainerError && err.statusCode === 400
    )

    const queries = []
    await withDbStub(async (sql, params) => {
      queries.push({ sql, params })
      if (/DELETE FROM student_evaluations/.test(sql)) return { rows: [{ id: evalId }] }
      if (/FROM student_evaluations se/.test(sql)) {
        return {
          rows: [{
            id: evalId,
            trainerId,
            trainerName: 'Personal Teste',
            studentId,
            evaluatedAt: '2026-11-11',
            rating: 4,
            notes: 'Constância ótima.',
            weightKg: 76,
            bodyFatPct: null,
            chestCm: null,
            waistCm: null,
            armCm: null,
            thighCm: null,
            createdAt: new Date().toISOString(),
          }],
        }
      }
      return { rows: [] }
    }, async () => {
      const del = await trainerService.deleteEvaluation(trainerId, evalId)
      assert.equal(del.success, true)
      const delQuery = queries.find((q) => /DELETE FROM student_evaluations/.test(q.sql))
      assert.match(delQuery.sql, /trainer_id/, 'exclusão deve validar trainer_id')

      const mine = await trainerService.getMyEvaluations(studentId)
      assert.equal(mine.length, 1)
      assert.equal(mine[0].trainerName, 'Personal Teste')
    })
  })

  await t.test('measurementService valida measuredAt e mantém peso atual cronológico em datas retroativas', async () => {
    const { measurementService, MeasurementValidationError } = require('../modules/measurement/measurement.service')
    const { measurementController } = require('../modules/measurement/measurement.controller')
    assert.ok(MeasurementValidationError, 'MeasurementValidationError deve existir para retornar 400')

    await assert.rejects(
      () =>
        measurementService.create('22222222-2222-4222-8222-222222222222', {
          weightKg: 74,
          measuredAt: 'data-invalida',
        }),
      (err) => err instanceof MeasurementValidationError
    )

    let statusCode = 200
    let body = null
    await measurementController.create(
      { userId: '22222222-2222-4222-8222-222222222222', body: { weightKg: 74, measuredAt: '2026-02-31' } },
      { status(c) { statusCode = c; return this }, json(d) { body = d; return this } },
      () => {}
    )
    assert.equal(statusCode, 400)
    assert.ok(body?.error)

    const executed = []
    await withDbStub(async (sql, params) => {
      executed.push({ sql, params })
      if (/INSERT INTO body_measurements/.test(sql)) {
        return { rows: [{ id: 10, weight_kg: 72, measured_at: '2026-10-01' }] }
      }
      if (/SELECT weight_kg FROM body_measurements/.test(sql)) {
        return { rows: [{ weight_kg: 75.5 }] }
      }
      return { rows: [] }
    }, async () => {
      await measurementService.create('22222222-2222-4222-8222-222222222222', {
        weightKg: 72,
        measuredAt: '2026-10-01',
      })
      const profileUpdate = executed.find((q) => /UPDATE user_profiles SET weight_kg/.test(q.sql))
      assert.ok(profileUpdate, 'deve atualizar user_profiles com a medição cronologicamente mais recente')
      assert.equal(profileUpdate.params[0], 75.5, 'medição retroativa não deve sobrescrever peso atual mais recente')
    })
  })

  await t.test('migration 006 cria student_evaluations com RLS, revogação anon e índices', () => {
    const migPath = path.resolve(__dirname, '../../migrations/006_student_evaluations.sql')
    assert.equal(fs.existsSync(migPath), true, 'migration 006 deve existir')
    const sql = fs.readFileSync(migPath, 'utf8')
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.student_evaluations/i)
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/i)
    assert.match(sql, /REVOKE ALL ON TABLE public\.student_evaluations FROM anon, authenticated/i)
    assert.match(sql, /CREATE INDEX/i)
  })
})
