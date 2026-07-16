// src/modules/session/session.service.ts
import { db } from '../../config/database'
import { CreateSessionRequest, DayStat, WorkoutStats } from './session.types'

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Chave YYYY-MM-DD no fuso local do servidor
function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
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
    // Agenda (para saber dias planejados e faltas)
    const profileRes = await db.query(
      'SELECT workout_schedule FROM user_profiles WHERE user_id = $1',
      [userId]
    )
    const days = scheduledDays(profileRes.rows[0]?.workout_schedule)
    const scheduledPerWeek = days.filter(Boolean).length

    // Total e duração média (todas as sessões concluídas)
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

    // Datas concluídas (últimos 120 dias) para streak/aderência/semana
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

    const today = new Date()
    const todayKey = dateKey(today)
    const todayWeekday = today.getDay()

    // Semana atual (domingo → sábado)
    const weekStart = addDays(today, -todayWeekday)
    const week: DayStat[] = []
    let thisWeek = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const key = dateKey(d)
      const done = doneDates.has(key)
      const scheduled = days[i]
      const isToday = key === todayKey
      const isFuture = d > today && !isToday
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
    // Hoje agendado e ainda não feito não quebra (o dia não acabou).
    let streak = 0
    for (let i = 0; i < 90; i++) {
      const d = addDays(today, -i)
      const wd = d.getDay()
      if (!days[wd]) continue // dia sem treino agendado: ignora
      const key = dateKey(d)
      const done = doneDates.has(key)
      if (done) {
        streak++
      } else if (i === 0) {
        continue // hoje ainda pode ser feito
      } else {
        break
      }
    }

    // Aderência: dias agendados nos últimos 30 dias (passados) que foram feitos
    let scheduledCount = 0
    let doneScheduled = 0
    for (let i = 1; i <= 30; i++) {
      const d = addDays(today, -i)
      if (!days[d.getDay()]) continue
      scheduledCount++
      if (doneDates.has(dateKey(d))) doneScheduled++
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
