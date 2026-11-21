import { db } from "./db.ts";
import {
  dateKey,
  jsonResponse,
  parseJsonBody,
  parseJsonColumn,
} from "./security.ts";

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function addDaysUTC(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// deno-lint-ignore no-explicit-any
function scheduledDays(schedule: any): boolean[] {
  const parsed = parseJsonColumn<{ days?: unknown[] }>(schedule);
  if (parsed && Array.isArray(parsed.days) && parsed.days.length === 7) {
    return parsed.days.map(Boolean);
  }
  return [false, false, false, false, false, false, false];
}

export async function handleSessionRoutes(
  req: Request,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === "/sessions" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const startedAt = typeof body.startedAt === "string" ? body.startedAt : "";
    if (!startedAt) {
      return jsonResponse({ error: "startedAt é obrigatório" }, 400);
    }

    const planId = body.planId ?? null;
    const finishedAt = typeof body.finishedAt === "string" && body.finishedAt
      ? body.finishedAt
      : new Date().toISOString();

    const result = await db.query<{ id: number }>(
      `INSERT INTO workout_sessions (user_id, plan_id, started_at, finished_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, planId, startedAt, finishedAt],
    );

    return jsonResponse({ id: Number(result.rows[0].id) }, 201);
  }

  if (path === "/sessions/stats" && req.method === "GET") {
    const profileRes = await db.query<{
      workout_schedule: unknown;
      created_at: string | Date | null;
    }>(
      "SELECT workout_schedule, created_at FROM user_profiles WHERE user_id = $1",
      [userId],
    );
    const days = scheduledDays(profileRes.rows[0]?.workout_schedule);
    const scheduledPerWeek = days.filter(Boolean).length;
    const createdAtRaw = profileRes.rows[0]?.created_at;
    const createdDateKey = createdAtRaw
      ? dateKey(new Date(createdAtRaw))
      : null;

    const aggRes = await db.query<{
      total: number;
      avg_seconds: number | null;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         AVG(EXTRACT(EPOCH FROM (finished_at - started_at)))::float AS avg_seconds
       FROM workout_sessions
       WHERE user_id = $1 AND finished_at IS NOT NULL`,
      [userId],
    );
    const total = aggRes.rows[0]?.total ?? 0;
    const avgSeconds = aggRes.rows[0]?.avg_seconds ?? null;
    const avgDurationMin = avgSeconds != null
      ? Math.round(avgSeconds / 60)
      : null;

    const sessRes = await db.query<{ finished_at: string | Date }>(
      `SELECT finished_at
       FROM workout_sessions
       WHERE user_id = $1 AND finished_at IS NOT NULL
         AND finished_at > NOW() - INTERVAL '120 days'
       ORDER BY finished_at DESC`,
      [userId],
    );
    const doneDates = new Set<string>();
    for (const row of sessRes.rows) {
      doneDates.add(dateKey(new Date(row.finished_at)));
    }

    const todayKey = dateKey(new Date());
    const todayAnchor = new Date(`${todayKey}T12:00:00Z`);
    const todayWeekday = todayAnchor.getUTCDay();

    const weekStart = addDaysUTC(todayAnchor, -todayWeekday);
    const week = [];
    let thisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDaysUTC(weekStart, i);
      const key = d.toISOString().slice(0, 10);
      const done = doneDates.has(key);
      const scheduled = days[i];
      const isToday = key === todayKey;
      const isFuture = key > todayKey;
      const isBeforeCreation = createdDateKey !== null && key < createdDateKey;
      if (done) thisWeek++;
      week.push({
        date: key,
        weekday: i,
        label: WEEK_LABELS[i],
        scheduled,
        done,
        missed: scheduled && !done && !isFuture && !isToday && !isBeforeCreation,
        isToday,
        isFuture,
      });
    }

    let streak = 0;
    for (let i = 0; i < 90; i++) {
      const d = addDaysUTC(todayAnchor, -i);
      const key = d.toISOString().slice(0, 10);
      if (createdDateKey !== null && key < createdDateKey) break;
      const wd = d.getUTCDay();
      if (!days[wd]) continue;
      const done = doneDates.has(key);
      if (done) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    let scheduledCount = 0;
    let doneScheduled = 0;
    for (let i = 1; i <= 30; i++) {
      const d = addDaysUTC(todayAnchor, -i);
      const key = d.toISOString().slice(0, 10);
      if (createdDateKey !== null && key < createdDateKey) break;
      if (!days[d.getUTCDay()]) continue;
      scheduledCount++;
      if (doneDates.has(key)) doneScheduled++;
    }
    const adherencePct = scheduledCount > 0
      ? Math.round((doneScheduled / scheduledCount) * 100)
      : null;

    return jsonResponse(
      {
        total,
        thisWeek,
        streak,
        avgDurationMin,
        adherencePct,
        scheduledPerWeek,
        week,
      },
      200,
    );
  }

  return null;
}
