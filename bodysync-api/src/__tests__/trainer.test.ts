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
})
