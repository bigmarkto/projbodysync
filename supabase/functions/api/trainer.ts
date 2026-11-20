import { AppError, db } from "./db.ts";
import {
  type AuthContext,
  dateKey,
  isValidIsoDate,
  jsonResponse,
  parseJsonBody,
  randomInt,
  requireProfessor,
} from "./security.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string | undefined | null, label = "ID"): string {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(`${label} inválido`, 400);
  }
  return id;
}

function generateCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "BS-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  return code;
}

function daysBetweenDateKeys(olderKey: string, newerKey: string): number {
  const a = new Date(`${olderKey}T12:00:00Z`).getTime();
  const b = new Date(`${newerKey}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 3600 * 24)));
}

function weekStartDateKey(): string {
  const anchor = new Date(`${dateKey(new Date())}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - 7);
  return anchor.toISOString().slice(0, 10);
}

function computeLastWorkoutStatus(
  lastWorkoutIso: string | Date | null,
): "today" | "yesterday" | "warning" | "recent" {
  if (!lastWorkoutIso) return "warning";
  const todayStr = dateKey(new Date());
  const woStr = dateKey(new Date(lastWorkoutIso));
  const diffDays = daysBetweenDateKeys(woStr, todayStr);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays >= 4) return "warning";
  return "recent";
}

const EVALUATION_METRIC_LIMITS: Record<
  "weightKg" | "bodyFatPct" | "chestCm" | "waistCm" | "armCm" | "thighCm",
  { label: string; min: number; max: number }
> = {
  weightKg: { label: "Peso", min: 1, max: 500 },
  bodyFatPct: { label: "Gordura corporal (%)", min: 1, max: 70 },
  chestCm: { label: "Tórax (cm)", min: 1, max: 300 },
  waistCm: { label: "Cintura (cm)", min: 1, max: 300 },
  armCm: { label: "Braço (cm)", min: 1, max: 150 },
  thighCm: { label: "Coxa (cm)", min: 1, max: 200 },
};

function parseOptionalMetric(
  raw: unknown,
  key: keyof typeof EVALUATION_METRIC_LIMITS,
): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  const { label, min, max } = EVALUATION_METRIC_LIMITS[key];
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new AppError(`${label} deve estar entre ${min} e ${max}`, 400);
  }
  return Number(num.toFixed(2));
}

// deno-lint-ignore no-explicit-any
function mapEvaluationRow(row: any) {
  const numOrNull = (v: unknown) => (v != null ? Number(v) : null);
  return {
    id: String(row.id),
    trainerId: String(row.trainerId),
    trainerName: row.trainerName || "Personal Trainer",
    studentId: String(row.studentId),
    evaluatedAt: String(row.evaluatedAt),
    rating: Number(row.rating),
    notes: String(row.notes),
    weightKg: numOrNull(row.weightKg),
    bodyFatPct: numOrNull(row.bodyFatPct),
    chestCm: numOrNull(row.chestCm),
    waistCm: numOrNull(row.waistCm),
    armCm: numOrNull(row.armCm),
    thighCm: numOrNull(row.thighCm),
    createdAt: String(row.createdAt),
  };
}

const EVALUATION_SELECT = `
  SELECT
    se.id,
    se.trainer_id AS "trainerId",
    COALESCE(NULLIF(t.name, ''), 'Personal Trainer') AS "trainerName",
    se.student_id AS "studentId",
    to_char(se.evaluated_at, 'YYYY-MM-DD') AS "evaluatedAt",
    se.rating::int AS rating,
    se.notes,
    se.weight_kg::float AS "weightKg",
    se.body_fat_pct::float AS "bodyFatPct",
    se.chest_cm::float AS "chestCm",
    se.waist_cm::float AS "waistCm",
    se.arm_cm::float AS "armCm",
    se.thigh_cm::float AS "thighCm",
    se.created_at AS "createdAt"
  FROM student_evaluations se
  LEFT JOIN users t ON t.id = se.trainer_id
`;

async function getOrCreateProfile(trainerId: string) {
  assertUuid(trainerId, "Treinador");

  const trainerUserRes = await db.query<{ name: string; email: string }>(
    `SELECT COALESCE(NULLIF(u.name, ''), 'Personal Trainer') AS name, u.email
     FROM users u
     WHERE u.id = $1`,
    [trainerId],
  );

  if (trainerUserRes.rows.length === 0) {
    throw new AppError("Treinador não encontrado", 404);
  }

  const { name: trainerName, email } = trainerUserRes.rows[0];

  let codeRes = await db.query<{ invite_code: string }>(
    `SELECT invite_code FROM trainer_students
     WHERE trainer_id = $1 AND student_id IS NULL
     LIMIT 1`,
    [trainerId],
  );

  let inviteCode: string;
  if (codeRes.rows.length > 0 && codeRes.rows[0].invite_code) {
    inviteCode = codeRes.rows[0].invite_code;
  } else {
    let insertedCandidate = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateCode();
      try {
        await db.query(
          `INSERT INTO trainer_students (trainer_id, student_id, invite_code, status)
           VALUES ($1, NULL, $2, 'active')
           ON CONFLICT (trainer_id) WHERE student_id IS NULL DO NOTHING`,
          [trainerId, candidate],
        );
        insertedCandidate = candidate;
        break;
      } catch (err) {
        // deno-lint-ignore no-explicit-any
        if ((err as any)?.code === "23505" && attempt < 2) continue;
        throw err;
      }
    }
    codeRes = await db.query<{ invite_code: string }>(
      `SELECT invite_code FROM trainer_students
       WHERE trainer_id = $1 AND student_id IS NULL
       LIMIT 1`,
      [trainerId],
    );
    inviteCode = codeRes.rows[0]?.invite_code || insertedCandidate;
  }

  const countsRes = await db.query<{
    active_students: number;
    total_prescriptions: number;
  }>(
    `SELECT
       COUNT(DISTINCT ts.student_id)::int AS active_students,
       (SELECT COUNT(*)::int FROM workout_plans WHERE created_by_trainer_id = $1) AS total_prescriptions
     FROM trainer_students ts
     WHERE ts.trainer_id = $1 AND ts.student_id IS NOT NULL AND ts.status = 'active'`,
    [trainerId],
  );

  return {
    trainerId,
    name: trainerName,
    email,
    inviteCode,
    activeStudentsCount: countsRes.rows[0]?.active_students || 0,
    totalPrescriptions: countsRes.rows[0]?.total_prescriptions || 0,
  };
}

async function fetchStudentsWithSessionTotals(trainerId: string) {
  assertUuid(trainerId, "Treinador");
  const sinceKey = weekStartDateKey();

  const query = `
    WITH weekly_sessions AS (
      SELECT
        ws.user_id,
        MAX(ws.finished_at) AS last_workout_date,
        COUNT(*) FILTER (
          WHERE (ws.finished_at AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
        )::int AS week_attended,
        COALESCE(
          SUM(GREATEST(1, ROUND(EXTRACT(EPOCH FROM (ws.finished_at - ws.started_at)) / 60))) FILTER (
            WHERE (ws.finished_at AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date
          ),
          0
        )::int AS week_duration_sum
      FROM workout_sessions ws
      JOIN trainer_students ts_f
        ON ts_f.student_id = ws.user_id
       AND ts_f.trainer_id = $1
       AND ts_f.status = 'active'
      WHERE ws.finished_at IS NOT NULL
      GROUP BY ws.user_id
    )
    SELECT
      ts.id,
      ts.student_id AS "studentId",
      COALESCE(NULLIF(u.name, ''), 'Aluno') AS name,
      u.email,
      COALESCE(up.fitness_goal, u.fitness_goal, 'condicionamento_fisico') AS "fitnessGoal",
      COALESCE(up.weight_kg, u.weight_kg, 0)::float AS "weightKg",
      COALESCE(up.height_cm, u.height_cm, 170)::float AS "heightCm",
      COALESCE(up.gender, u.gender, 'outro') AS gender,
      COALESCE(up.workout_frequency, u.workout_frequency, 5)::int AS "workoutFrequency",
      ts.created_at AS "joinedAt",
      ws.last_workout_date AS "lastWorkoutDate",
      COALESCE(ws.week_attended, 0)::int AS "weekAttended",
      COALESCE(ws.week_duration_sum, 0)::int AS "weekDurationSum"
    FROM trainer_students ts
    JOIN users u ON u.id = ts.student_id
    LEFT JOIN user_profiles up ON up.user_id = ts.student_id
    LEFT JOIN weekly_sessions ws ON ws.user_id = ts.student_id
    WHERE ts.trainer_id = $1 AND ts.student_id IS NOT NULL AND ts.status = 'active'
    ORDER BY ts.created_at DESC
  `;

  // deno-lint-ignore no-explicit-any
  const res = await db.query<any>(query, [trainerId, sinceKey]);
  let totalDurationMinutes = 0;

  const students = res.rows.map((r) => {
    totalDurationMinutes += Number(r.weekDurationSum) || 0;
    return {
      id: r.id,
      studentId: r.studentId,
      name: r.name,
      email: r.email,
      fitnessGoal: r.fitnessGoal,
      weightKg: Number(r.weightKg) || 0,
      heightCm: Number(r.heightCm) || 0,
      gender: r.gender,
      lastWorkoutDate: r.lastWorkoutDate,
      lastWorkoutStatus: computeLastWorkoutStatus(r.lastWorkoutDate),
      weeklyConsistency: {
        attended: r.weekAttended || 0,
        target: Math.max(1, r.workoutFrequency || 5),
      },
      joinedAt: r.joinedAt,
    };
  });

  return { students, totalDurationMinutes };
}

async function getStudentDetail(trainerId: string, studentId: string) {
  assertUuid(trainerId, "Treinador");
  assertUuid(studentId, "Aluno");

  const linkRes = await db.query<{ id: string; joinedAt: string }>(
    `SELECT id, created_at AS "joinedAt" FROM trainer_students
     WHERE trainer_id = $1 AND student_id = $2 AND status = 'active'`,
    [trainerId, studentId],
  );

  if (linkRes.rows.length === 0) {
    throw new AppError(
      "Aluno não encontrado ou não vinculado à sua consultoria",
      404,
    );
  }

  // deno-lint-ignore no-explicit-any
  const profileRes = await db.query<any>(
    `SELECT
       u.id AS "studentId",
       COALESCE(NULLIF(u.name, ''), 'Aluno') AS name,
       u.email,
       COALESCE(up.fitness_goal, u.fitness_goal, 'condicionamento_fisico') AS "fitnessGoal",
       COALESCE(up.weight_kg, u.weight_kg, 0)::float AS "weightKg",
       COALESCE(up.desired_weight_kg, u.desired_weight_kg)::float AS "targetWeightKg",
       COALESCE(up.height_cm, u.height_cm, 170)::float AS "heightCm",
       COALESCE(up.gender, u.gender, 'outro') AS gender,
       COALESCE(up.birth_date, u.birth_date) AS "birthDate",
       COALESCE(up.workout_frequency, u.workout_frequency, 5)::int AS "workoutFrequency",
       COALESCE(up.hydration_goal_ml, 2000)::int AS "hydrationGoalMl"
     FROM users u
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE u.id = $1`,
    [studentId],
  );

  if (profileRes.rows.length === 0) {
    throw new AppError("Perfil do aluno não encontrado", 404);
  }

  const student = profileRes.rows[0];
  let age = 0;
  if (student.birthDate) {
    const birth = new Date(student.birthDate);
    age = Math.max(
      0,
      Math.floor((Date.now() - birth.getTime()) / (1000 * 3600 * 24 * 365.25)),
    );
  }

  // deno-lint-ignore no-explicit-any
  const plansRes = await db.query<any>(
    `SELECT
       p.id,
       p.name,
       p.created_at AS "createdAt",
       p.created_by_trainer_id AS "createdByTrainerId",
       COUNT(pe.id)::int AS "exerciseCount"
     FROM workout_plans p
     LEFT JOIN plan_exercises pe ON pe.plan_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY (p.created_by_trainer_id IS NOT NULL) DESC, p.created_at DESC`,
    [studentId],
  );

  // deno-lint-ignore no-explicit-any
  const prescribedPlans: any[] = [];
  if (plansRes.rows.length > 0) {
    const planIds = plansRes.rows.map((p) => Number(p.id));
    // deno-lint-ignore no-explicit-any
    const exRes = await db.query<any>(
      `SELECT
         pe.id,
         pe.plan_id AS "planId",
         pe.exercise_id AS "exerciseId",
         COALESCE(NULLIF(e.name_pt, ''), e.name) AS name,
         COALESCE(e.category, 'Geral') AS category,
         pe.sets,
         pe.reps,
         pe.order_index AS "orderIndex",
         COALESCE(pe.rest_seconds, 60)::int AS "restSeconds"
       FROM plan_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_id = ANY($1::int[])
       ORDER BY pe.plan_id, pe.order_index ASC`,
      [planIds],
    );
    // deno-lint-ignore no-explicit-any
    const byPlan = new Map<number, any[]>();
    for (const ex of exRes.rows) {
      const pid = Number(ex.planId);
      const arr = byPlan.get(pid) ?? [];
      arr.push(ex);
      byPlan.set(pid, arr);
    }
    for (const plan of plansRes.rows) {
      prescribedPlans.push({
        ...plan,
        exercises: byPlan.get(Number(plan.id)) ?? [],
      });
    }
  }

  const sinceKey = weekStartDateKey();
  const [sessionsRes, weekCountRes] = await Promise.all([
    // deno-lint-ignore no-explicit-any
    db.query<any>(
      `SELECT
         ws.id,
         COALESCE(p.name, 'Treino Livre') AS "planName",
         ws.finished_at AS "finishedAt",
         GREATEST(1, ROUND(EXTRACT(EPOCH FROM (ws.finished_at - ws.started_at)) / 60))::int AS "durationMinutes"
       FROM workout_sessions ws
       LEFT JOIN workout_plans p ON p.id = ws.plan_id
       WHERE ws.user_id = $1 AND ws.finished_at IS NOT NULL
       ORDER BY ws.finished_at DESC
       LIMIT 15`,
      [studentId],
    ),
    db.query<{ attended: number }>(
      `SELECT COUNT(*)::int AS attended
       FROM workout_sessions ws
       WHERE ws.user_id = $1
         AND ws.finished_at IS NOT NULL
         AND (ws.finished_at AT TIME ZONE 'America/Sao_Paulo')::date >= $2::date`,
      [studentId, sinceKey],
    ),
  ]);

  const weightsRes = await db.query<{
    id: string;
    weightKg: number;
    measuredAt: string;
  }>(
    `SELECT
       id::text AS id,
       weight_kg::float AS "weightKg",
       to_char(measured_at, 'YYYY-MM-DD') AS "measuredAt"
     FROM body_measurements
     WHERE user_id = $1
     ORDER BY measured_at DESC, id DESC
     LIMIT 15`,
    [studentId],
  );

  const todayKey = dateKey(new Date());
  const [hydroRes, evaluationsRes] = await Promise.all([
    db.query<{ consumedMl: number }>(
      `SELECT COALESCE(consumed_ml, 0)::int AS "consumedMl"
       FROM hydration_logs
       WHERE user_id = $1 AND log_date = $2::date`,
      [studentId, todayKey],
    ),
    db.query(
      `${EVALUATION_SELECT}
       WHERE se.student_id = $1
       ORDER BY se.evaluated_at DESC, se.created_at DESC
       LIMIT 30`,
      [studentId],
    ),
  ]);

  const weightHistory = weightsRes.rows;
  const latestWeight = weightHistory.length > 0
    ? Number(weightHistory[0].weightKg)
    : Number(student.weightKg) || 0;
  const oldestWeight = weightHistory.length > 0
    ? Number(weightHistory[weightHistory.length - 1].weightKg)
    : latestWeight;
  const deltaWeightKg = weightHistory.length >= 2
    ? Number((latestWeight - oldestWeight).toFixed(1))
    : 0;

  const lastWorkout = sessionsRes.rows[0]?.finishedAt || null;
  const weekAttended = weekCountRes.rows[0]?.attended || 0;

  return {
    id: linkRes.rows[0].id,
    studentId,
    name: student.name,
    email: student.email,
    fitnessGoal: student.fitnessGoal,
    weightKg: latestWeight,
    startWeightKg: oldestWeight,
    targetWeightKg: student.targetWeightKg != null
      ? Number(student.targetWeightKg)
      : null,
    heightCm: Number(student.heightCm) || 0,
    gender: student.gender,
    age,
    deltaWeightKg,
    hydrationTodayMl: hydroRes.rows[0]?.consumedMl || 0,
    hydrationGoalMl: Number(student.hydrationGoalMl) || 2000,
    lastWorkoutDate: lastWorkout,
    lastWorkoutStatus: computeLastWorkoutStatus(lastWorkout),
    weeklyConsistency: {
      attended: weekAttended,
      target: Math.max(1, student.workoutFrequency || 5),
    },
    joinedAt: linkRes.rows[0].joinedAt,
    weightHistory,
    recentSessions: sessionsRes.rows,
    prescribedPlans,
    evaluations: evaluationsRes.rows.map(mapEvaluationRow),
  };
}

async function prescribeWorkout(
  trainerId: string,
  input: Record<string, unknown>,
) {
  assertUuid(trainerId, "Treinador");
  const studentId = assertUuid(
    typeof input?.studentId === "string" ? input.studentId : undefined,
    "Aluno",
  );
  const name = typeof input.name === "string" ? input.name : "";
  const exercises = input.exercises as Array<{
    exerciseId: number;
    sets: number;
    reps: number;
    restSeconds?: number;
  }>;

  if (!name || !name.trim()) {
    throw new AppError("Aluno e nome do treino são obrigatórios", 400);
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new AppError("Adicione pelo menos um exercício ao treino", 400);
  }

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (!Number.isInteger(ex.exerciseId) || ex.exerciseId <= 0) {
      throw new AppError(`exercises[${i}].exerciseId inválido`, 400);
    }
    if (!Number.isInteger(ex.sets) || ex.sets <= 0) {
      throw new AppError(`exercises[${i}].sets deve ser maior que zero`, 400);
    }
    if (!Number.isInteger(ex.reps) || ex.reps <= 0) {
      throw new AppError(`exercises[${i}].reps deve ser maior que zero`, 400);
    }
    const restSeconds = ex.restSeconds ?? 60;
    if (
      !Number.isInteger(restSeconds) ||
      restSeconds < 10 ||
      restSeconds > 600
    ) {
      throw new AppError(
        `exercises[${i}].restSeconds deve estar entre 10 e 600 segundos`,
        400,
      );
    }
  }

  const linkRes = await db.query(
    `SELECT id FROM trainer_students
     WHERE trainer_id = $1 AND student_id = $2 AND status = 'active'`,
    [trainerId, studentId],
  );

  if (linkRes.rows.length === 0) {
    throw new AppError("Aluno não está vinculado à sua consultoria", 403);
  }

  const exIds = [...new Set(exercises.map((e) => e.exerciseId))];
  const foundExRes = await db.query(
    "SELECT id FROM exercises WHERE id = ANY($1::int[])",
    [exIds],
  );
  if (foundExRes.rows.length !== exIds.length) {
    throw new AppError(
      "Um ou mais exercícios selecionados não existem no catálogo",
      400,
    );
  }

  return await db.transaction(async (tx) => {
    const planRes = await tx.query<{
      id: number;
      name: string;
      createdAt: string;
    }>(
      `INSERT INTO workout_plans (user_id, name, created_by_trainer_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, created_at AS "createdAt"`,
      [studentId, name.trim(), trainerId],
    );

    const planId = Number(planRes.rows[0].id);

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const restSeconds = ex.restSeconds ?? 60;
      await tx.query(
        `INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, order_index, rest_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [planId, ex.exerciseId, ex.sets, ex.reps, i, restSeconds],
      );
    }

    return {
      id: planId,
      name: planRes.rows[0].name,
      createdAt: planRes.rows[0].createdAt,
      exerciseCount: exercises.length,
    };
  });
}

async function getAnalytics(trainerId: string) {
  assertUuid(trainerId, "Treinador");

  const { students: studentsRes, totalDurationMinutes } =
    await fetchStudentsWithSessionTotals(trainerId);
  const activeStudentsCount = studentsRes.length;

  const prescriptionsCountRes = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM workout_plans WHERE created_by_trainer_id = $1`,
    [trainerId],
  );
  const totalPrescriptions = prescriptionsCountRes.rows[0]?.count || 0;

  if (activeStudentsCount === 0) {
    return {
      activeStudentsCount: 0,
      weeklyAttendanceRate: 0,
      trainedTodayCount: 0,
      totalPrescriptions,
      weeklyWorkoutsCount: 0,
      avgWorkoutDurationMinutes: 0,
      waterComplianceRate: 0,
      attentionStudents: [],
      ranking: [],
    };
  }

  let totalAttended = 0;
  let totalTarget = 0;
  let trainedTodayCount = 0;
  const attentionStudents: Array<{
    studentId: string;
    name: string;
    daysInactive: number;
    neverTrained: boolean;
  }> = [];
  const ranking: Array<{
    studentId: string;
    name: string;
    attended: number;
    target: number;
    percentage: number;
  }> = [];
  const todayKey = dateKey(new Date());

  for (const st of studentsRes) {
    totalAttended += st.weeklyConsistency.attended;
    totalTarget += st.weeklyConsistency.target;

    if (st.lastWorkoutStatus === "today") {
      trainedTodayCount++;
    }

    const hasTrained = Boolean(st.lastWorkoutDate);
    const refIso = st.lastWorkoutDate || st.joinedAt;
    const diffDays = refIso
      ? daysBetweenDateKeys(dateKey(new Date(refIso)), todayKey)
      : 0;

    if (diffDays >= 4) {
      attentionStudents.push({
        studentId: st.studentId,
        name: st.name,
        daysInactive: diffDays,
        neverTrained: !hasTrained,
      });
    }

    const pct = Math.min(
      100,
      Math.round(
        (st.weeklyConsistency.attended /
          Math.max(1, st.weeklyConsistency.target)) *
          100,
      ),
    );
    ranking.push({
      studentId: st.studentId,
      name: st.name,
      attended: st.weeklyConsistency.attended,
      target: st.weeklyConsistency.target,
      percentage: pct,
    });
  }

  ranking.sort((a, b) => b.percentage - a.percentage);

  const weeklyAttendanceRate = totalTarget > 0
    ? Math.min(100, Math.round((totalAttended / totalTarget) * 100))
    : 0;

  const avgWorkoutDurationMinutes = totalAttended > 0
    ? Math.round(totalDurationMinutes / totalAttended)
    : 0;

  const waterRes = await db.query<{ water_pct: number }>(
    `SELECT
       COALESCE(
         ROUND(
           AVG(
             LEAST(100, (COALESCE(hl.consumed_ml, 0)::float / GREATEST(500, COALESCE(up.hydration_goal_ml, 2000))) * 100)
           )
         ),
         0
       )::int AS water_pct
     FROM trainer_students ts
     LEFT JOIN user_profiles up ON up.user_id = ts.student_id
     LEFT JOIN hydration_logs hl ON hl.user_id = ts.student_id AND hl.log_date = $2::date
     WHERE ts.trainer_id = $1 AND ts.student_id IS NOT NULL AND ts.status = 'active'`,
    [trainerId, todayKey],
  );

  return {
    activeStudentsCount,
    weeklyAttendanceRate,
    trainedTodayCount,
    totalPrescriptions,
    weeklyWorkoutsCount: totalAttended,
    avgWorkoutDurationMinutes,
    waterComplianceRate: waterRes.rows[0]?.water_pct || 0,
    attentionStudents,
    ranking,
  };
}

async function lookupTrainerByCode(studentId: string, inviteCode: string) {
  assertUuid(studentId, "Aluno");
  if (!inviteCode || !inviteCode.trim()) {
    throw new AppError("Informe o código de convite", 400);
  }

  const cleanCode = inviteCode.trim().toUpperCase();

  const codeRes = await db.query<{
    trainer_id: string;
    invite_code: string;
    trainer_name: string;
  }>(
    `SELECT
       ts.trainer_id,
       ts.invite_code,
       COALESCE(NULLIF(u.name, ''), 'Personal Trainer') AS trainer_name
     FROM trainer_students ts
     JOIN users u ON u.id = ts.trainer_id
     LEFT JOIN user_profiles up ON up.user_id = ts.trainer_id
     WHERE ts.invite_code = $1
       AND ts.student_id IS NULL
       AND ts.status = 'active'
       AND COALESCE(up.role, u.role) = 'professor'
     LIMIT 1`,
    [cleanCode],
  );

  if (codeRes.rows.length === 0) {
    throw new AppError("Código de treinador inválido ou inexistente", 404);
  }

  const { trainer_id, invite_code, trainer_name } = codeRes.rows[0];

  if (trainer_id === studentId) {
    throw new AppError("Você não pode vincular seu próprio código", 400);
  }

  return {
    trainerId: trainer_id,
    name: trainer_name,
    inviteCode: invite_code,
  };
}

async function getMyTrainer(studentId: string) {
  assertUuid(studentId, "Aluno");

  const res = await db.query<{
    trainerId: string;
    name: string;
    email: string;
    inviteCode: string | null;
    connectedAt: string;
  }>(
    `SELECT
       ts.trainer_id AS "trainerId",
       COALESCE(NULLIF(u.name, ''), 'Personal Trainer') AS name,
       u.email,
       master.invite_code AS "inviteCode",
       ts.created_at AS "connectedAt"
     FROM trainer_students ts
     JOIN users u ON u.id = ts.trainer_id
     LEFT JOIN trainer_students master ON master.trainer_id = ts.trainer_id AND master.student_id IS NULL
     WHERE ts.student_id = $1 AND ts.status = 'active'
     ORDER BY ts.created_at DESC
     LIMIT 1`,
    [studentId],
  );

  if (res.rows.length === 0) {
    return { connected: false, trainer: null };
  }

  return {
    connected: true,
    trainer: res.rows[0],
  };
}

async function connectStudent(studentId: string, inviteCode: string) {
  const trainer = await lookupTrainerByCode(studentId, inviteCode);

  const userRes = await db.query<{ role: string }>(
    "SELECT role FROM users WHERE id = $1 LIMIT 1",
    [studentId],
  );
  if (userRes.rows.length === 0) {
    throw new AppError("Usuário não encontrado", 404);
  }
  if (userRes.rows[0].role !== "comum") {
    throw new AppError(
      "Apenas contas de aluno podem se vincular a um Personal Trainer",
      403,
    );
  }

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE trainer_students
       SET status = 'inactive', updated_at = NOW()
       WHERE student_id = $1 AND status = 'active' AND trainer_id <> $2`,
      [studentId, trainer.trainerId],
    );

    await tx.query(
      `INSERT INTO trainer_students (trainer_id, student_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (trainer_id, student_id)
       DO UPDATE SET status = 'active', updated_at = NOW()`,
      [trainer.trainerId, studentId],
    );
  });

  return {
    success: true,
    trainerId: trainer.trainerId,
    trainerName: trainer.name,
    message:
      `Você está conectado com ${trainer.name}! Seus treinos serão sincronizados.`,
  };
}

async function disconnect(userId: string, targetId: string) {
  assertUuid(userId, "Usuário");
  assertUuid(targetId, "Destinatário");

  const res = await db.query(
    `UPDATE trainer_students
     SET status = 'inactive', updated_at = NOW()
     WHERE status = 'active'
       AND ((trainer_id = $1 AND student_id = $2)
         OR (trainer_id = $2 AND student_id = $1))
     RETURNING id`,
    [userId, targetId],
  );

  if (res.rows.length === 0) {
    throw new AppError("Vínculo ativo não encontrado", 404);
  }

  return { success: true, message: "Consultoria desvinculada com sucesso" };
}

async function deletePrescribedPlan(trainerId: string, planId: number) {
  assertUuid(trainerId, "Treinador");
  if (!Number.isInteger(planId) || planId <= 0) {
    throw new AppError("ID do plano inválido", 400);
  }

  const res = await db.query(
    `DELETE FROM workout_plans
     WHERE id = $1 AND created_by_trainer_id = $2
     RETURNING id`,
    [planId, trainerId],
  );

  if (res.rows.length === 0) {
    throw new AppError(
      "Ficha prescrita não encontrada ou sem permissão para excluir",
      404,
    );
  }

  return { success: true, message: "Ficha removida com sucesso" };
}

async function createEvaluation(
  trainerId: string,
  studentIdParam: string,
  input: Record<string, unknown>,
) {
  assertUuid(trainerId, "Treinador");
  const studentId = assertUuid(studentIdParam, "Aluno");

  const evaluatedAt = input?.evaluatedAt
    ? String(input.evaluatedAt).trim()
    : dateKey(new Date());
  if (!isValidIsoDate(evaluatedAt) || evaluatedAt > dateKey(new Date())) {
    throw new AppError(
      "Data da avaliação inválida (use YYYY-MM-DD até hoje)",
      400,
    );
  }

  const rating = Number(input?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("Nota da avaliação deve ser um inteiro de 1 a 5", 400);
  }

  const notes = typeof input?.notes === "string" ? input.notes.trim() : "";
  if (!notes || notes.length > 1500) {
    throw new AppError(
      "Parecer/observações é obrigatório (máx. 1500 caracteres)",
      400,
    );
  }

  const weightKg = parseOptionalMetric(input?.weightKg, "weightKg");
  const bodyFatPct = parseOptionalMetric(input?.bodyFatPct, "bodyFatPct");
  const chestCm = parseOptionalMetric(input?.chestCm, "chestCm");
  const waistCm = parseOptionalMetric(input?.waistCm, "waistCm");
  const armCm = parseOptionalMetric(input?.armCm, "armCm");
  const thighCm = parseOptionalMetric(input?.thighCm, "thighCm");

  const linkRes = await db.query(
    `SELECT id FROM trainer_students
     WHERE trainer_id = $1 AND student_id = $2 AND status = 'active'`,
    [trainerId, studentId],
  );
  if (linkRes.rows.length === 0) {
    throw new AppError("Aluno não está vinculado à sua consultoria", 403);
  }

  const res = await db.query(
    `WITH inserted AS (
       INSERT INTO student_evaluations (
         trainer_id, student_id, evaluated_at, rating, notes,
         weight_kg, body_fat_pct, chest_cm, waist_cm, arm_cm, thigh_cm
       )
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *
     )
     SELECT
       i.id,
       i.trainer_id AS "trainerId",
       COALESCE(NULLIF(t.name, ''), 'Personal Trainer') AS "trainerName",
       i.student_id AS "studentId",
       to_char(i.evaluated_at, 'YYYY-MM-DD') AS "evaluatedAt",
       i.rating::int AS rating,
       i.notes,
       i.weight_kg::float AS "weightKg",
       i.body_fat_pct::float AS "bodyFatPct",
       i.chest_cm::float AS "chestCm",
       i.waist_cm::float AS "waistCm",
       i.arm_cm::float AS "armCm",
       i.thigh_cm::float AS "thighCm",
       i.created_at AS "createdAt"
     FROM inserted i
     LEFT JOIN users t ON t.id = i.trainer_id`,
    [
      trainerId,
      studentId,
      evaluatedAt,
      rating,
      notes,
      weightKg,
      bodyFatPct,
      chestCm,
      waistCm,
      armCm,
      thighCm,
    ],
  );

  return mapEvaluationRow(res.rows[0]);
}

async function deleteEvaluation(trainerId: string, evaluationId: string) {
  assertUuid(trainerId, "Treinador");
  assertUuid(evaluationId, "Avaliação");

  const res = await db.query(
    `DELETE FROM student_evaluations
     WHERE id = $1 AND trainer_id = $2
     RETURNING id`,
    [evaluationId, trainerId],
  );

  if (res.rows.length === 0) {
    throw new AppError(
      "Avaliação não encontrada ou sem permissão para excluir",
      404,
    );
  }

  return { success: true, message: "Avaliação excluída com sucesso" };
}

async function getMyEvaluations(studentId: string) {
  assertUuid(studentId, "Aluno");
  const res = await db.query(
    `${EVALUATION_SELECT}
     WHERE se.student_id = $1
     ORDER BY se.evaluated_at DESC, se.created_at DESC
     LIMIT 30`,
    [studentId],
  );
  return res.rows.map(mapEvaluationRow);
}

export async function handleTrainerRoutes(
  req: Request,
  path: string,
  auth: AuthContext,
): Promise<Response | null> {
  // Rotas acessíveis por alunos
  const lookupMatch = path.match(/^\/trainer\/lookup\/([^/]+)$/);
  if (lookupMatch && req.method === "GET") {
    const code = decodeURIComponent(lookupMatch[1]);
    return jsonResponse(await lookupTrainerByCode(auth.userId, code), 200);
  }

  if (path === "/trainer/my-trainer" && req.method === "GET") {
    return jsonResponse(await getMyTrainer(auth.userId), 200);
  }

  if (path === "/trainer/my-evaluations" && req.method === "GET") {
    const evaluations = await getMyEvaluations(auth.userId);
    return jsonResponse({ evaluations }, 200);
  }

  if (path === "/trainer/connect" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : "";
    return jsonResponse(await connectStudent(auth.userId, inviteCode), 200);
  }

  const studentIdMatch = path.match(/^\/trainer\/students\/([^/]+)$/);
  if (studentIdMatch && req.method === "DELETE") {
    const targetId = decodeURIComponent(studentIdMatch[1]);
    return jsonResponse(await disconnect(auth.userId, targetId), 200);
  }

  // Rotas restritas exclusivamente a contas de Personal Trainer (role = 'professor' | 'admin')
  if (path === "/trainer/profile" && req.method === "GET") {
    await requireProfessor(auth);
    return jsonResponse(await getOrCreateProfile(auth.userId), 200);
  }

  if (path === "/trainer/students" && req.method === "GET") {
    await requireProfessor(auth);
    const { students } = await fetchStudentsWithSessionTotals(auth.userId);
    return jsonResponse({ students }, 200);
  }

  if (studentIdMatch && req.method === "GET") {
    await requireProfessor(auth);
    const studentId = decodeURIComponent(studentIdMatch[1]);
    return jsonResponse(await getStudentDetail(auth.userId, studentId), 200);
  }

  const evalPostMatch = path.match(
    /^\/trainer\/students\/([^/]+)\/evaluations$/,
  );
  if (evalPostMatch && req.method === "POST") {
    await requireProfessor(auth);
    const studentId = decodeURIComponent(evalPostMatch[1]);
    const body = await parseJsonBody(req);
    const evaluation = await createEvaluation(auth.userId, studentId, body);
    return jsonResponse(
      { evaluation, message: "Avaliação registrada com sucesso!" },
      201,
    );
  }

  const evalDelMatch = path.match(/^\/trainer\/evaluations\/([^/]+)$/);
  if (evalDelMatch && req.method === "DELETE") {
    await requireProfessor(auth);
    const evaluationId = decodeURIComponent(evalDelMatch[1]);
    return jsonResponse(
      await deleteEvaluation(auth.userId, evaluationId),
      200,
    );
  }

  if (path === "/trainer/prescribe" && req.method === "POST") {
    await requireProfessor(auth);
    const body = await parseJsonBody(req);
    const plan = await prescribeWorkout(auth.userId, body);
    return jsonResponse(
      { plan, message: "Treino prescrito com sucesso!" },
      201,
    );
  }

  const planDelMatch = path.match(/^\/trainer\/plans\/([^/]+)$/);
  if (planDelMatch && req.method === "DELETE") {
    await requireProfessor(auth);
    const rawId = decodeURIComponent(planDelMatch[1]);
    return jsonResponse(
      await deletePrescribedPlan(auth.userId, Number(rawId)),
      200,
    );
  }

  if (path === "/trainer/analytics" && req.method === "GET") {
    await requireProfessor(auth);
    return jsonResponse(await getAnalytics(auth.userId), 200);
  }

  return null;
}
