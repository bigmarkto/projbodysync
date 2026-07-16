// src/modules/measurement/measurement.service.ts
import { db } from '../../config/database'
import {
  CreateMeasurementRequest,
  Measurement,
  ProgressSummary,
} from './measurement.types'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export const measurementService = {
  // Registra um novo peso e atualiza o peso atual do perfil
  async create(
    userId: string,
    data: CreateMeasurementRequest
  ): Promise<Measurement> {
    const weight = Number(data.weightKg)
    if (!weight || weight <= 0 || weight > 500) {
      throw new Error('Peso inválido')
    }

    const result = await db.query(
      `INSERT INTO body_measurements (user_id, weight_kg, measured_at)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE))
       RETURNING id, weight_kg, to_char(measured_at, 'YYYY-MM-DD') AS measured_at`,
      [userId, weight, data.measuredAt ?? null]
    )

    // Mantém o peso atual do perfil em sincronia
    await db.query(
      'UPDATE user_profiles SET weight_kg = $1, updated_at = NOW() WHERE user_id = $2',
      [weight, userId]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      weightKg: Number(row.weight_kg),
      measuredAt: row.measured_at,
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

  // Resumo de progresso rumo à meta
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

  // Define a meta de peso (desired_weight_kg no perfil)
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
  },
}
