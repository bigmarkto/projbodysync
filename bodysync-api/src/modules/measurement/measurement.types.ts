// src/modules/measurement/measurement.types.ts

export interface CreateMeasurementRequest {
  weightKg: number
  measuredAt?: string // YYYY-MM-DD (default: hoje)
}

export interface Measurement {
  id: number
  weightKg: number
  measuredAt: string
}

export interface ProgressSummary {
  current: number | null
  start: number | null
  goal: number | null
  deltaFromStart: number | null // current - start
  remainingToGoal: number | null // current - goal (positivo = falta perder)
  progressPct: number | null // 0–100 rumo à meta
  history: Measurement[]
}
