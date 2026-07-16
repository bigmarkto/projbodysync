// src/modules/session/session.types.ts

export interface CreateSessionRequest {
  planId?: number | null
  startedAt: string // ISO
  finishedAt?: string // ISO (default: agora)
}

export interface DayStat {
  date: string // YYYY-MM-DD
  weekday: number // 0 = domingo
  label: string // Dom..Sáb
  scheduled: boolean
  done: boolean
  missed: boolean // agendado, no passado e não feito
  isToday: boolean
  isFuture: boolean
}

export interface WorkoutStats {
  total: number
  thisWeek: number
  streak: number // treinos agendados seguidos sem falhar
  avgDurationMin: number | null
  adherencePct: number | null // % de dias agendados cumpridos (últimos 30 dias)
  scheduledPerWeek: number
  week: DayStat[]
}
