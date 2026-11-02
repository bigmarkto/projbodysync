// src/modules/session/session.service.ts
import { db } from '../../config/database'
import type { CreateSessionRequest, DayStat, WorkoutStats } from './session.types'

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Chave YYYY-MM-DD no fuso America/Sao_Paulo (independente do fuso do servidor)
export function dateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function addDaysUTC(base: Date, n: number): Date {
  const d = new Date(base.getTime())
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

// Extrai os dias agendados (bool[7], 0=domingo) do workout_schedule
function scheduledDays(schedule: any): boolean[] {
  if (schedule && Array.isArray(schedule.days) && schedule.days.length === 7) {
    return schedule.days.map(Boolean)
  }
  return [false, false, false, false, false, false, false]
}

export const sessionService = {
  // Registra uma sessão de treino concluída
  async create(userId: string, data: CreateSessionRequest): Promise<{ id: number }> {
    const finishedAt = data.finishedAt ?? new Date().toISOString()
    const result = await db.query(
      `INSERT INTO workout_sessions (user_id, plan_id, started_at, finished_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, data.planId ?? null, data.startedAt, finishedAt]
    )
    return { id: result.rows[0].id }
  },

  // Estatísticas de treino do usuário
  async getStats(userId: string): Promise<WorkoutStats> {
    const profileRes = await db.query(
      'SELECT workout_schedule FROM user_profiles WHERE user_id = $1',
      [userId]
    )
    const days = scheduledDays(profileRes.rows[0]?.workout_schedule)
    const scheduledPerWeek = days.filter(Boolean).length

    const aggRes = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         AVG(EXTRACT(EPOCH FROM (finished_at - started_at)))::float AS avg_seconds
       FROM workout_sessions
       WHERE user_id = $1 AND finished_at IS NOT NULL`,
      [userId]
    )
    const total: number = aggRes.rows[0].total
    const avgSeconds: number | null = aggRes.rows[0].avg_seconds
    const avgDurationMin =
      avgSeconds != null ? Math.round(avgSeconds / 60) : null

    const sessRes = await db.query(
      `SELECT finished_at
       FROM workout_sessions
       WHERE user_id = $1 AND finished_at IS NOT NULL
         AND finished_at > NOW() - INTERVAL '120 days'
       ORDER BY finished_at DESC`,
      [userId]
    )
    const doneDates = new Set<string>()
    for (const row of sessRes.rows) {
      doneDates.add(dateKey(new Date(row.finished_at)))
    }

    const todayKey = dateKey(new Date())
    const todayAnchor = new Date(`${todayKey}T12:00:00Z`)
    const todayWeekday = todayAnchor.getUTCDay()

    // Semana atual (domingo → sábado) ancorada no fuso de São Paulo
    const weekStart = addDaysUTC(todayAnchor, -todayWeekday)
    const week: DayStat[] = []
    let thisWeek = 0
    for (let i = 0; i < 7; i++) {
      const d = addDaysUTC(weekStart, i)
      const key = d.toISOString().slice(0, 10)
      const done = doneDates.has(key)
      const scheduled = days[i]
      const isToday = key === todayKey
      const isFuture = key > todayKey
      if (done) thisWeek++
      week.push({
        date: key,
        weekday: i,
        label: WEEK_LABELS[i],
        scheduled,
        done,
        missed: scheduled && !done && !isFuture && !isToday,
        isToday,
        isFuture,
      })
    }

    // Streak: dias agendados consecutivos (voltando de hoje) sem falhar.
    let streak = 0
    for (let i = 0; i < 90; i++) {
      const d = addDaysUTC(todayAnchor, -i)
      const wd = d.getUTCDay()
      if (!days[wd]) continue
      const key = d.toISOString().slice(0, 10)
      const done = doneDates.has(key)
      if (done) {
        streak++
      } else if (i === 0) {
        continue
      } else {
        break
      }
    }

    // Aderência: dias agendados nos últimos 30 dias (passados) que foram feitos
    let scheduledCount = 0
    let doneScheduled = 0
    for (let i = 1; i <= 30; i++) {
      const d = addDaysUTC(todayAnchor, -i)
      if (!days[d.getUTCDay()]) continue
      scheduledCount++
      if (doneDates.has(d.toISOString().slice(0, 10))) doneScheduled++
    }
    const adherencePct =
      scheduledCount > 0
        ? Math.round((doneScheduled / scheduledCount) * 100)
        : null

    return {
      total,
      thisWeek,
      streak,
      avgDurationMin,
      adherencePct,
      scheduledPerWeek,
      week,
    }
  },
}
