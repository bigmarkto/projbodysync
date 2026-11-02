// src/modules/hydration/hydration.service.ts
import { db } from '../../config/database'
import { dateKey } from '../session/session.service'
import {
  CUP_SIZE_ML,
  ML_PER_KG,
  DEFAULT_GOAL_ML,
  MIN_GOAL_ML,
  MAX_GOAL_ML,
  type HydrationStatus,
} from './hydration.types'

async function getProfileGoals(userId: string): Promise<{
  suggestedGoalMl: number
  customGoalMl: number | null
}> {
  const result = await db.query(
    'SELECT weight_kg, hydration_goal_ml FROM user_profiles WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Perfil não encontrado')
  }

  const row = result.rows[0]
  const weight = row.weight_kg ? Number(row.weight_kg) : null
  const suggestedGoalMl = weight
    ? Math.round(weight * ML_PER_KG)
    : DEFAULT_GOAL_ML
  const customGoalMl =
    row.hydration_goal_ml != null ? Number(row.hydration_goal_ml) : null

  return { suggestedGoalMl, customGoalMl }
}

export function buildHydrationStatus(
  date: string,
  consumedMl: number,
  suggestedGoalMl: number,
  customGoalMl: number | null
): HydrationStatus {
  const goalMl = customGoalMl ?? suggestedGoalMl
  const total = Math.max(1, Math.ceil(goalMl / CUP_SIZE_ML))
  const consumed = Math.round(consumedMl / CUP_SIZE_ML)
  const percentage =
    goalMl > 0 ? Math.min(100, Math.round((consumedMl / goalMl) * 100)) : 0

  return {
    date,
    consumedMl,
    goalMl,
    suggestedGoalMl,
    customGoalMl,
    cupSizeMl: CUP_SIZE_ML,
    cups: { consumed, total },
    percentage,
  }
}

export const hydrationService = {
  async getStatus(userId: string): Promise<HydrationStatus> {
    const { suggestedGoalMl, customGoalMl } = await getProfileGoals(userId)
    const today = dateKey()

    const result = await db.query(
      `SELECT consumed_ml, to_char(log_date, 'YYYY-MM-DD') AS log_date
       FROM hydration_logs
       WHERE user_id = $1 AND log_date = $2::date`,
      [userId, today]
    )

    const consumedMl = result.rows[0] ? Number(result.rows[0].consumed_ml) : 0
    const date = result.rows[0]?.log_date ?? today

    return buildHydrationStatus(date, consumedMl, suggestedGoalMl, customGoalMl)
  },

  async addIntake(
    userId: string,
    amountMl: number = CUP_SIZE_ML
  ): Promise<HydrationStatus> {
    const { suggestedGoalMl, customGoalMl } = await getProfileGoals(userId)
    const today = dateKey()

    const result = await db.query(
      `INSERT INTO hydration_logs (user_id, log_date, consumed_ml)
       VALUES ($1, $2::date, GREATEST(0, $3))
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         consumed_ml = GREATEST(0, hydration_logs.consumed_ml + $3),
         updated_at = NOW()
       RETURNING consumed_ml, to_char(log_date, 'YYYY-MM-DD') AS log_date`,
      [userId, today, Math.round(amountMl)]
    )

    const consumedMl = Number(result.rows[0].consumed_ml)
    const date = result.rows[0].log_date

    return buildHydrationStatus(date, consumedMl, suggestedGoalMl, customGoalMl)
  },

  async setCustomGoal(
    userId: string,
    goalMl: number | null
  ): Promise<HydrationStatus> {
    let value: number | null = null

    if (goalMl != null) {
      const rounded = Math.round(goalMl)
      if (rounded < MIN_GOAL_ML || rounded > MAX_GOAL_ML) {
        throw new Error(
          `A meta deve estar entre ${MIN_GOAL_ML}ml e ${MAX_GOAL_ML}ml`
        )
      }
      value = rounded
    }

    const updated = await db.query(
      `UPDATE user_profiles
       SET hydration_goal_ml = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id`,
      [value, userId]
    )

    if (updated.rows.length === 0) {
      throw new Error('Perfil não encontrado')
    }

    return this.getStatus(userId)
  },
}
