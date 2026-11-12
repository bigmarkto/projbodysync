// src/modules/measurement/measurement.service.ts
import { db } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'
import { dateKey, isValidIsoDate } from '../session/session.service'
import {
  CreateMeasurementRequest,
  Measurement,
  ProgressSummary,
} from './measurement.types'

export class MeasurementValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export const measurementService = {
  async create(
    userId: string,
    data: CreateMeasurementRequest
  ): Promise<Measurement> {
    const weight = Number(data.weightKg)
    if (!weight || weight <= 0 || weight > 500) {
      throw new MeasurementValidationError('Peso inválido')
    }

    const measuredAt = data.measuredAt ?? dateKey()
    if (!isValidIsoDate(measuredAt) || measuredAt > dateKey()) {
      throw new MeasurementValidationError('Data de medição inválida (use YYYY-MM-DD até hoje)')
    }

    const client = await db.connect()

    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO body_measurements (user_id, weight_kg, measured_at)
         VALUES ($1, $2, $3::date)
         RETURNING id, weight_kg, to_char(measured_at, 'YYYY-MM-DD') AS measured_at`,
        [userId, weight, measuredAt]
      )

      const latestRes = await client.query(
        `SELECT weight_kg FROM body_measurements
         WHERE user_id = $1
         ORDER BY measured_at DESC, id DESC
         LIMIT 1`,
        [userId]
      )
      const latestWeight = latestRes.rows[0]?.weight_kg != null
        ? Number(latestRes.rows[0].weight_kg)
        : weight

      await client.query(
        'UPDATE user_profiles SET weight_kg = $1, updated_at = NOW() WHERE user_id = $2',
        [latestWeight, userId]
      )
      await client.query(
        'UPDATE users SET weight_kg = $1 WHERE id = $2',
        [latestWeight, userId]
      )

      await client.query('COMMIT')

      const row = result.rows[0]
      return {
        id: row.id,
        weightKg: Number(row.weight_kg),
        measuredAt: row.measured_at,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async list(userId: string): Promise<Measurement[]> {
    const result = await db.query(
      `SELECT id, weight_kg, to_char(measured_at, 'YYYY-MM-DD') AS measured_at
       FROM body_measurements
       WHERE user_id = $1
       ORDER BY measured_at ASC, id ASC`,
      [userId]
    )
    return result.rows.map((r) => ({
      id: r.id,
      weightKg: Number(r.weight_kg),
      measuredAt: r.measured_at,
    }))
  },

  async getSummary(userId: string): Promise<ProgressSummary> {
    const profileRes = await db.query(
      'SELECT weight_kg, desired_weight_kg FROM user_profiles WHERE user_id = $1',
      [userId]
    )
    const profileWeight = profileRes.rows[0]?.weight_kg
      ? Number(profileRes.rows[0].weight_kg)
      : null
    const goal = profileRes.rows[0]?.desired_weight_kg
      ? Number(profileRes.rows[0].desired_weight_kg)
      : null

    const history = await this.list(userId)

    const current =
      history.length > 0 ? history[history.length - 1].weightKg : profileWeight
    const start = history.length > 0 ? history[0].weightKg : profileWeight

    const deltaFromStart =
      current != null && start != null ? Number((current - start).toFixed(1)) : null
    const remainingToGoal =
      current != null && goal != null ? Number((current - goal).toFixed(1)) : null

    let progressPct: number | null = null
    if (current != null && start != null && goal != null && start !== goal) {
      progressPct = clamp(
        Math.round(((start - current) / (start - goal)) * 100),
        0,
        100
      )
    }

    return {
      current,
      start,
      goal,
      deltaFromStart,
      remainingToGoal,
      progressPct,
      history,
    }
  },

  async setGoal(userId: string, desiredWeightKg: number): Promise<void> {
    const goal = Number(desiredWeightKg)
    if (!goal || goal <= 0 || goal > 500) {
      throw new Error('Meta de peso inválida')
    }
    const res = await db.query(
      'UPDATE user_profiles SET desired_weight_kg = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id',
      [goal, userId]
    )
    if (res.rows.length === 0) {
      throw new Error('Perfil não encontrado')
    }
    await db.query(
      'UPDATE users SET desired_weight_kg = $1 WHERE id = $2',
      [goal, userId]
    )
  },
}
