// src/modules/workout/workout.service.ts
import { db } from '../../config/database'
import { exerciseService } from '../exercise/exercise.service'
import { planGenerator } from './plan-generator'
import {
  WorkoutPlan,
  WorkoutPlanSummary,
  WorkoutPlanDraft,
  WorkoutPlansResult,
  PlanEligibility,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanExerciseInput,
} from './workout.types'

export class PlanNotFoundError extends Error {
  constructor() {
    super('Plano não encontrado')
  }
}
export class ValidationError extends Error {}
export class SubscriptionLimitError extends Error {}

const FREE_PLAN_LIMIT = 2

async function computeEligibility(
  userId: string,
  used: number,
  queryable: { query: typeof db.query } = db,
  forUpdate: boolean = false
): Promise<PlanEligibility> {
  const lockClause = forUpdate ? ' FOR UPDATE' : ''
  const r = await queryable.query(
    `SELECT role, subscription_type FROM user_profiles WHERE user_id = $1${lockClause}`,
    [userId]
  )
  const role: string = r.rows[0]?.role ?? 'comum'
  const subscriptionType: string = r.rows[0]?.subscription_type ?? 'free'

  let limit: number | null
  let reason: string | null = null

  if (role !== 'comum') {
    limit = 0
    reason = 'Contas de profissionais não criam planos de treino.'
  } else if (subscriptionType === 'basic') {
    limit = 0
    reason =
      'O plano Basic é exclusivo para personais e não inclui planos de treino.'
  } else if (subscriptionType === 'premium') {
    limit = null
  } else {
    limit = FREE_PLAN_LIMIT
  }

  let canCreate: boolean
  if (limit === 0) {
    canCreate = false
  } else if (limit === null) {
    canCreate = true
  } else {
    canCreate = used < limit
    if (!canCreate) {
      reason = `Você atingiu o limite de ${limit} planos do plano Free. Faça upgrade para o Premium para planos ilimitados.`
    }
  }

  return { role, subscriptionType, limit, used, canCreate, reason }
}

async function countPlans(
  userId: string,
  queryable: { query: typeof db.query } = db
): Promise<number> {
  const r = await queryable.query(
    'SELECT COUNT(*)::int AS total FROM workout_plans WHERE user_id = $1',
    [userId]
  )
  return r.rows[0].total
}

async function validateExercises(exercises: PlanExerciseInput[]): Promise<void> {
  for (const [i, ex] of exercises.entries()) {
    if (!Number.isInteger(ex.exerciseId)) {
      throw new ValidationError(`exercises[${i}].exerciseId é obrigatório`)
    }
    if (!Number.isInteger(ex.sets) || ex.sets <= 0) {
      throw new ValidationError(`exercises[${i}].sets deve ser um inteiro > 0`)
    }
    if (!Number.isInteger(ex.reps) || ex.reps <= 0) {
      throw new ValidationError(`exercises[${i}].reps deve ser um inteiro > 0`)
    }
  }

  if (exercises.length === 0) return

  const ids = exercises.map(e => e.exerciseId)
  const found = await db.query(
    'SELECT id FROM exercises WHERE id = ANY($1)',
    [ids]
  )
  const foundIds = new Set(found.rows.map(r => r.id))
  const missing = ids.filter(id => !foundIds.has(id))
  if (missing.length > 0) {
    throw new ValidationError(
      `Exercícios inexistentes: ${[...new Set(missing)].join(', ')}`
    )
  }
}

async function insertPlanExercises(
  client: any,
  planId: number,
  exercises: PlanExerciseInput[]
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i]
    await client.query(
      `INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, order_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [planId, ex.exerciseId, ex.sets, ex.reps, i]
    )
  }
}

export const workoutService = {
  async listByUser(userId: string): Promise<WorkoutPlanSummary[]> {
    const result = await db.query(
      `SELECT
         p.id,
         p.name,
         p.created_at AS "createdAt",
         COUNT(pe.id)::int AS "exerciseCount"
       FROM workout_plans p
       LEFT JOIN plan_exercises pe ON pe.plan_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    )
    return result.rows as WorkoutPlanSummary[]
  },

  async listWithMeta(userId: string): Promise<WorkoutPlansResult> {
    const plans = await this.listByUser(userId)
    const meta = await computeEligibility(userId, plans.length)
    return { plans, meta }
  },

  async getEligibility(userId: string): Promise<PlanEligibility> {
    const used = await countPlans(userId)
    return computeEligibility(userId, used)
  },

  async generateDraft(userId: string): Promise<WorkoutPlanDraft> {
    const eligibility = await this.getEligibility(userId)
    if (!eligibility.canCreate) {
      throw new SubscriptionLimitError(
        eligibility.reason ?? 'Não é possível criar planos nesta conta.'
      )
    }

    const profileRes = await db.query(
      `SELECT fitness_goal AS "fitnessGoal",
              experience_level AS "experienceLevel",
              activity_level AS "activityLevel",
              workout_frequency AS "workoutFrequency"
       FROM user_profiles WHERE user_id = $1`,
      [userId]
    )
    const profile = profileRes.rows[0] ?? {
      fitnessGoal: null,
      experienceLevel: null,
      activityLevel: null,
      workoutFrequency: null,
    }

    const goal: string | null = profile.fitnessGoal
    const scheme = planGenerator.schemeFor(goal)
    const count = planGenerator.exerciseCount(profile)

    let candidatesRes = await db.query(
      `SELECT id, category FROM exercises
       WHERE image_url IS NOT NULL
       ORDER BY random() LIMIT 300`
    )
    if (candidatesRes.rows.length === 0) {
      candidatesRes = await db.query(
        `SELECT id, category FROM exercises ORDER BY random() LIMIT 300`
      )
    }

    const pickedIds = planGenerator.pickBalanced(
      candidatesRes.rows,
      planGenerator.categoryOrder(goal),
      count
    )

    const details = await exerciseService.listByIds(pickedIds)

    const exercises = details.map((e, i) => ({
      id: 0,
      exerciseId: e.id,
      sets: scheme.sets,
      reps: scheme.reps,
      orderIndex: i,
      exercise: {
        id: e.id,
        name: e.name,
        category: e.category,
        imageUrl: e.imageUrl,
        muscles: e.muscles,
      },
    }))

    return {
      name: planGenerator.planName(goal),
      goal,
      exercises,
    }
  },

  async getById(userId: string, planId: number): Promise<WorkoutPlan> {
    const planResult = await db.query(
      `SELECT id, user_id AS "userId", name, created_at AS "createdAt"
       FROM workout_plans
       WHERE id = $1 AND user_id = $2`,
      [planId, userId]
    )

    if (planResult.rows.length === 0) {
      throw new PlanNotFoundError()
    }
    const plan = planResult.rows[0]

    const exResult = await db.query(
      `SELECT
         pe.id,
         pe.exercise_id AS "exerciseId",
         pe.sets,
         pe.reps,
         pe.order_index AS "orderIndex",
         json_build_object(
           'id', e.id,
           'name', COALESCE(NULLIF(e.name_pt, ''), e.name),
           'category', e.category,
           'imageUrl', e.image_url,
           'muscles', COALESCE(
             (SELECT json_agg(
                json_build_object('id', m.id, 'name', m.name, 'isPrimary', em.is_primary)
                ORDER BY em.is_primary DESC, m.name)
              FROM exercise_muscles em
              JOIN muscle_groups m ON m.id = em.muscle_id
              WHERE em.exercise_id = e.id),
             '[]'
           )
         ) AS exercise
       FROM plan_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_id = $1
       ORDER BY pe.order_index`,
      [planId]
    )

    return { ...plan, exercises: exResult.rows }
  },

  async create(
    userId: string,
    data: CreatePlanRequest
  ): Promise<WorkoutPlan> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('O nome do plano é obrigatório')
    }

    const exercises = data.exercises ?? []
    await validateExercises(exercises)

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Trava a linha do perfil e conta os planos dentro da transação (previne TOCTOU)
      await client.query(
        'SELECT user_id FROM user_profiles WHERE user_id = $1 FOR UPDATE',
        [userId]
      )
      const used = await countPlans(userId, client)
      const eligibility = await computeEligibility(userId, used, client, false)
      if (!eligibility.canCreate) {
        throw new SubscriptionLimitError(
          eligibility.reason ?? 'Não é possível criar mais planos nesta conta.'
        )
      }

      const planResult = await client.query(
        `INSERT INTO workout_plans (user_id, name) VALUES ($1, $2) RETURNING id`,
        [userId, data.name.trim()]
      )
      const planId = planResult.rows[0].id

      await insertPlanExercises(client, planId, exercises)

      await client.query('COMMIT')
      return this.getById(userId, planId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async update(
    userId: string,
    planId: number,
    data: UpdatePlanRequest
  ): Promise<WorkoutPlan> {
    const owns = await db.query(
      'SELECT id FROM workout_plans WHERE id = $1 AND user_id = $2',
      [planId, userId]
    )
    if (owns.rows.length === 0) {
      throw new PlanNotFoundError()
    }

    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('O nome do plano não pode ser vazio')
    }
    if (data.exercises) {
      await validateExercises(data.exercises)
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      if (data.name !== undefined) {
        await client.query(
          'UPDATE workout_plans SET name = $1 WHERE id = $2',
          [data.name.trim(), planId]
        )
      }

      if (data.exercises) {
        await client.query('DELETE FROM plan_exercises WHERE plan_id = $1', [
          planId,
        ])
        await insertPlanExercises(client, planId, data.exercises)
      }

      await client.query('COMMIT')
      return this.getById(userId, planId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async remove(userId: string, planId: number): Promise<void> {
    const owns = await db.query(
      'SELECT id FROM workout_plans WHERE id = $1 AND user_id = $2',
      [planId, userId]
    )
    if (owns.rows.length === 0) {
      throw new PlanNotFoundError()
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM plan_exercises WHERE plan_id = $1', [
        planId,
      ])
      await client.query('DELETE FROM workout_plans WHERE id = $1', [planId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}
