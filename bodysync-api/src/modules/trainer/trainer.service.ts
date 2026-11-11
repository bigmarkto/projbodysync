// bodysync-api/src/modules/trainer/trainer.service.ts
import crypto from 'crypto'
import { db } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'
import { dateKey } from '../session/session.service'
import {
  TrainerStudentSummary,
  TrainerStudentDetail,
  PrescribeWorkoutInput,
  TrainerAnalytics,
  TrainerProfileResponse,
  TrainerLookupResponse,
  MyTrainerResponse,
} from './trainer.types'

export class TrainerError extends AppError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode)
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(id: string | undefined | null, label = 'ID'): string {
  if (!id || !UUID_REGEX.test(id)) {
    throw new TrainerError(`${label} inválido`, 400)
  }
  return id
}

function generateCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = 'BS-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return code
}

function daysBetweenDateKeys(olderKey: string, newerKey: string): number {
  const a = new Date(`${olderKey}T12:00:00Z`).getTime()
  const b = new Date(`${newerKey}T12:00:00Z`).getTime()
  return Math.max(0, Math.round((b - a) / (1000 * 3600 * 24)))
}

function computeLastWorkoutStatus(
  lastWorkoutIso: string | Date | null
): 'today' | 'yesterday' | 'warning' | 'recent' {
  if (!lastWorkoutIso) return 'warning'
  const todayStr = dateKey(new Date())
  const woStr = dateKey(new Date(lastWorkoutIso))
  const diffDays = daysBetweenDateKeys(woStr, todayStr)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays >= 4) return 'warning'
  return 'recent'
}

export const trainerService = {
  // 1. Obter perfil e código de convite mestre do Personal
  async getOrCreateProfile(trainerId: string): Promise<TrainerProfileResponse> {
    assertUuid(trainerId, 'Treinador')

    const trainerUserRes = await db.query(
      `SELECT COALESCE(NULLIF(u.name, ''), 'Personal Trainer') AS name, u.email
       FROM users u
       WHERE u.id = $1`,
      [trainerId]
    )

    if (trainerUserRes.rows.length === 0) {
      throw new TrainerError('Treinador não encontrado', 404)
    }

    const { name: trainerName, email } = trainerUserRes.rows[0]

    // Busca código mestre existente (student_id IS NULL)
    let codeRes = await db.query(
      `SELECT invite_code FROM trainer_students
       WHERE trainer_id = $1 AND student_id IS NULL
       LIMIT 1`,
      [trainerId]
    )

    let inviteCode: string
    if (codeRes.rows.length > 0 && codeRes.rows[0].invite_code) {
      inviteCode = codeRes.rows[0].invite_code
    } else {
      const candidate = generateCode()
      await db.query(
        `INSERT INTO trainer_students (trainer_id, student_id, invite_code, status)
         VALUES ($1, NULL, $2, 'active')
         ON CONFLICT (trainer_id) WHERE student_id IS NULL DO NOTHING`,
        [trainerId, candidate]
      )
      codeRes = await db.query(
        `SELECT invite_code FROM trainer_students
         WHERE trainer_id = $1 AND student_id IS NULL
         LIMIT 1`,
        [trainerId]
      )
      inviteCode = codeRes.rows[0]?.invite_code || candidate
    }

    const countsRes = await db.query(
      `SELECT
         COUNT(DISTINCT ts.student_id)::int AS active_students,
         (SELECT COUNT(*)::int FROM workout_plans WHERE created_by_trainer_id = $1) AS total_prescriptions
       FROM trainer_students ts
       WHERE ts.trainer_id = $1 AND ts.student_id IS NOT NULL AND ts.status = 'active'`,
      [trainerId]
    )

    return {
      trainerId,
      name: trainerName,
      email,
      inviteCode,
      activeStudentsCount: countsRes.rows[0]?.active_students || 0,
      totalPrescriptions: countsRes.rows[0]?.total_prescriptions || 0,
    }
  },

  // 2. Listar alunos ativos vinculados ao Personal
  async listStudents(trainerId: string): Promise<TrainerStudentSummary[]> {
    assertUuid(trainerId, 'Treinador')

    const query = `
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
        (
          SELECT ws.finished_at
          FROM workout_sessions ws
          WHERE ws.user_id = ts.student_id AND ws.finished_at IS NOT NULL
          ORDER BY ws.finished_at DESC
          LIMIT 1
        ) AS "lastWorkoutDate",
        (
          SELECT COUNT(*)::int
          FROM workout_sessions ws
          WHERE ws.user_id = ts.student_id
            AND ws.finished_at IS NOT NULL
            AND ws.finished_at >= CURRENT_DATE - INTERVAL '7 days'
        ) AS "weekAttended"
      FROM trainer_students ts
      JOIN users u ON u.id = ts.student_id
      LEFT JOIN user_profiles up ON up.user_id = ts.student_id
      WHERE ts.trainer_id = $1 AND ts.student_id IS NOT NULL AND ts.status = 'active'
      ORDER BY ts.created_at DESC
    `

    const res = await db.query(query, [trainerId])

    return res.rows.map((r: any) => ({
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
    }))
  },

  // 3. Detalhes 360° de um aluno vinculado
  async getStudentDetail(trainerId: string, studentId: string): Promise<TrainerStudentDetail> {
    assertUuid(trainerId, 'Treinador')
    assertUuid(studentId, 'Aluno')

    const linkRes = await db.query(
      `SELECT id, created_at AS "joinedAt" FROM trainer_students
       WHERE trainer_id = $1 AND student_id = $2 AND status = 'active'`,
      [trainerId, studentId]
    )

    if (linkRes.rows.length === 0) {
      throw new TrainerError('Aluno não encontrado ou não vinculado à sua consultoria', 404)
    }

    const profileRes = await db.query(
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
      [studentId]
    )

    if (profileRes.rows.length === 0) {
      throw new TrainerError('Perfil do aluno não encontrado', 404)
    }

    const student = profileRes.rows[0]
    let age = 0
    if (student.birthDate) {
      const birth = new Date(student.birthDate)
      age = Math.max(0, Math.floor((Date.now() - birth.getTime()) / (1000 * 3600 * 24 * 365.25)))
    }

    // Planos de treino do aluno com exercícios
    const plansRes = await db.query(
      `SELECT
         p.id,
         p.name,
         p.created_at AS "createdAt",
         COUNT(pe.id)::int AS "exerciseCount"
       FROM workout_plans p
       LEFT JOIN plan_exercises pe ON pe.plan_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY (p.created_by_trainer_id IS NOT NULL) DESC, p.created_at DESC`,
      [studentId]
    )

    const prescribedPlans = []
    if (plansRes.rows.length > 0) {
      const planIds = plansRes.rows.map((p: any) => p.id)
      const exRes = await db.query(
        `SELECT
           pe.id,
           pe.plan_id AS "planId",
           pe.exercise_id AS "exerciseId",
           COALESCE(NULLIF(e.name_pt, ''), e.name) AS name,
           pe.sets,
           pe.reps,
           pe.order_index AS "orderIndex",
           60 AS "restSeconds"
         FROM plan_exercises pe
         JOIN exercises e ON e.id = pe.exercise_id
         WHERE pe.plan_id = ANY($1::int[])
         ORDER BY pe.plan_id, pe.order_index ASC`,
        [planIds]
      )
      const byPlan = new Map<number, any[]>()
      for (const ex of exRes.rows) {
        const arr = byPlan.get(ex.planId) ?? []
        arr.push(ex)
        byPlan.set(ex.planId, arr)
      }
      for (const plan of plansRes.rows) {
        prescribedPlans.push({
          ...plan,
          exercises: byPlan.get(plan.id) ?? [],
        })
      }
    }

    // Sessões concluídas reais (calcula duração via started_at / finished_at)
    const sessionsRes = await db.query(
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
      [studentId]
    )

    // Histórico real de pesagens (body_measurements.weight_kg)
    const weightsRes = await db.query(
      `SELECT
         id::text AS id,
         weight_kg::float AS "weightKg",
         to_char(measured_at, 'YYYY-MM-DD') AS "measuredAt"
       FROM body_measurements
       WHERE user_id = $1
       ORDER BY measured_at DESC, id DESC
       LIMIT 15`,
      [studentId]
    )

    // Hidratação de hoje
    const todayKey = dateKey(new Date())
    const hydroRes = await db.query(
      `SELECT COALESCE(consumed_ml, 0)::int AS "consumedMl"
       FROM hydration_logs
       WHERE user_id = $1 AND log_date = $2::date`,
      [studentId, todayKey]
    )

    const weightHistory = weightsRes.rows
    const latestWeight = weightHistory.length > 0 ? Number(weightHistory[0].weightKg) : Number(student.weightKg) || 0
    const oldestWeight = weightHistory.length > 0 ? Number(weightHistory[weightHistory.length - 1].weightKg) : latestWeight
    const deltaWeightKg = weightHistory.length >= 2 ? Number((latestWeight - oldestWeight).toFixed(1)) : 0

    const lastWorkout = sessionsRes.rows[0]?.finishedAt || null
    const weekAttended = sessionsRes.rows.filter((s: any) => {
      const diff = Date.now() - new Date(s.finishedAt).getTime()
      return diff >= 0 && diff <= 7 * 24 * 3600 * 1000
    }).length

    return {
      id: linkRes.rows[0].id,
      studentId,
      name: student.name,
      email: student.email,
      fitnessGoal: student.fitnessGoal,
      weightKg: latestWeight,
      startWeightKg: oldestWeight,
      targetWeightKg: student.targetWeightKg != null ? Number(student.targetWeightKg) : null,
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
    }
  },

  // 4. Prescrever novo treino para aluno vinculado
  async prescribeWorkout(trainerId: string, input: PrescribeWorkoutInput) {
    assertUuid(trainerId, 'Treinador')
    const studentId = assertUuid(input?.studentId, 'Aluno')
    const { name, exercises } = input

    if (!name || !name.trim()) {
      throw new TrainerError('Aluno e nome do treino são obrigatórios', 400)
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw new TrainerError('Adicione pelo menos um exercício ao treino', 400)
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      if (!Number.isInteger(ex.exerciseId) || ex.exerciseId <= 0) {
        throw new TrainerError(`exercises[${i}].exerciseId inválido`, 400)
      }
      if (!Number.isInteger(ex.sets) || ex.sets <= 0) {
        throw new TrainerError(`exercises[${i}].sets deve ser maior que zero`, 400)
      }
      if (!Number.isInteger(ex.reps) || ex.reps <= 0) {
        throw new TrainerError(`exercises[${i}].reps deve ser maior que zero`, 400)
      }
    }

    // Validar vínculo ativo
    const linkRes = await db.query(
      `SELECT id FROM trainer_students
       WHERE trainer_id = $1 AND student_id = $2 AND status = 'active'`,
      [trainerId, studentId]
    )

    if (linkRes.rows.length === 0) {
      throw new TrainerError('Aluno não está vinculado à sua consultoria', 403)
    }

    // Validar que todos os exercícios existem no catálogo
    const exIds = [...new Set(exercises.map((e) => e.exerciseId))]
    const foundExRes = await db.query('SELECT id FROM exercises WHERE id = ANY($1::int[])', [exIds])
    if (foundExRes.rows.length !== exIds.length) {
      throw new TrainerError('Um ou mais exercícios selecionados não existem no catálogo', 400)
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const planRes = await client.query(
        `INSERT INTO workout_plans (user_id, name, created_by_trainer_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, created_at AS "createdAt"`,
        [studentId, name.trim(), trainerId]
      )

      const planId = planRes.rows[0].id

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await client.query(
          `INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, order_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [planId, ex.exerciseId, ex.sets, ex.reps, i]
        )
      }

      await client.query('COMMIT')

      return {
        id: planId,
        name: planRes.rows[0].name,
        createdAt: planRes.rows[0].createdAt,
        exerciseCount: exercises.length,
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // 5. Métricas reais da consultoria
  async getAnalytics(trainerId: string): Promise<TrainerAnalytics> {
    assertUuid(trainerId, 'Treinador')

    const studentsRes = await this.listStudents(trainerId)
    const activeStudentsCount = studentsRes.length

    const prescriptionsCountRes = await db.query(
      `SELECT COUNT(*)::int AS count FROM workout_plans WHERE created_by_trainer_id = $1`,
      [trainerId]
    )
    const totalPrescriptions = prescriptionsCountRes.rows[0]?.count || 0

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
      }
    }

    let totalAttended = 0
    let totalTarget = 0
    let trainedTodayCount = 0
    const attentionStudents = []
    const ranking = []
    const todayKey = dateKey(new Date())

    for (const st of studentsRes) {
      totalAttended += st.weeklyConsistency.attended
      totalTarget += st.weeklyConsistency.target

      if (st.lastWorkoutStatus === 'today') {
        trainedTodayCount++
      }

      const diffDays = st.lastWorkoutDate
        ? daysBetweenDateKeys(dateKey(new Date(st.lastWorkoutDate)), todayKey)
        : 7

      if (diffDays >= 4) {
        attentionStudents.push({
          studentId: st.studentId,
          name: st.name,
          daysInactive: diffDays,
        })
      }

      const pct = Math.min(
        100,
        Math.round((st.weeklyConsistency.attended / Math.max(1, st.weeklyConsistency.target)) * 100)
      )
      ranking.push({
        studentId: st.studentId,
        name: st.name,
        attended: st.weeklyConsistency.attended,
        target: st.weeklyConsistency.target,
        percentage: pct,
      })
    }

    ranking.sort((a, b) => b.percentage - a.percentage)

    const weeklyAttendanceRate =
      totalTarget > 0 ? Math.min(100, Math.round((totalAttended / totalTarget) * 100)) : 0

    // Contagem e duração média reais das sessões finalizadas na semana
    const metricsRes = await db.query(
      `SELECT
         COUNT(ws.id)::int AS weekly_count,
         COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (ws.finished_at - ws.started_at)) / 60)), 0)::int AS avg_dur
       FROM workout_sessions ws
       JOIN trainer_students ts ON ts.student_id = ws.user_id
       WHERE ts.trainer_id = $1
         AND ts.student_id IS NOT NULL
         AND ts.status = 'active'
         AND ws.finished_at IS NOT NULL
         AND ws.finished_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [trainerId]
    )

    // Meta de água real de hoje entre os alunos vinculados
    const waterRes = await db.query(
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
      [trainerId, todayKey]
    )

    return {
      activeStudentsCount,
      weeklyAttendanceRate,
      trainedTodayCount,
      totalPrescriptions,
      weeklyWorkoutsCount: metricsRes.rows[0]?.weekly_count || 0,
      avgWorkoutDurationMinutes: Math.max(0, metricsRes.rows[0]?.avg_dur || 0),
      waterComplianceRate: waterRes.rows[0]?.water_pct || 0,
      attentionStudents,
      ranking,
    }
  },

  // 6a. Pré-visualizar dados do Personal antes de o aluno confirmar o vínculo
  async lookupTrainerByCode(studentId: string, inviteCode: string): Promise<TrainerLookupResponse> {
    assertUuid(studentId, 'Aluno')
    if (!inviteCode || !inviteCode.trim()) {
      throw new TrainerError('Informe o código de convite', 400)
    }

    const cleanCode = inviteCode.trim().toUpperCase()

    const codeRes = await db.query(
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
      [cleanCode]
    )

    if (codeRes.rows.length === 0) {
      throw new TrainerError('Código de treinador inválido ou inexistente', 404)
    }

    const { trainer_id, invite_code, trainer_name } = codeRes.rows[0]

    if (trainer_id === studentId) {
      throw new TrainerError('Você não pode vincular seu próprio código', 400)
    }

    return {
      trainerId: trainer_id,
      name: trainer_name,
      inviteCode: invite_code,
    }
  },

  // 6b. Obter Personal Trainer atualmente vinculado ao aluno
  async getMyTrainer(studentId: string): Promise<MyTrainerResponse> {
    assertUuid(studentId, 'Aluno')

    const res = await db.query(
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
      [studentId]
    )

    if (res.rows.length === 0) {
      return { connected: false, trainer: null }
    }

    return {
      connected: true,
      trainer: res.rows[0],
    }
  },

  // 6c. Conectar aluno ao Personal após confirmação
  async connectStudent(studentId: string, inviteCode: string) {
    const trainer = await this.lookupTrainerByCode(studentId, inviteCode)

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Desativa vínculo anterior com outro personal se existir
      await client.query(
        `UPDATE trainer_students
         SET status = 'inactive', updated_at = NOW()
         WHERE student_id = $1 AND status = 'active' AND trainer_id <> $2`,
        [studentId, trainer.trainerId]
      )

      await client.query(
        `INSERT INTO trainer_students (trainer_id, student_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (trainer_id, student_id)
         DO UPDATE SET status = 'active', updated_at = NOW()`,
        [trainer.trainerId, studentId]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return {
      success: true,
      trainerId: trainer.trainerId,
      trainerName: trainer.name,
      message: `Você está conectado com ${trainer.name}! Seus treinos serão sincronizados.`,
    }
  },

  // 7. Desvincular consultoria (Mútuo)
  async disconnect(userId: string, targetId: string) {
    assertUuid(userId, 'Usuário')
    assertUuid(targetId, 'Destinatário')

    const res = await db.query(
      `UPDATE trainer_students
       SET status = 'inactive', updated_at = NOW()
       WHERE status = 'active'
         AND ((trainer_id = $1 AND student_id = $2)
           OR (trainer_id = $2 AND student_id = $1))
       RETURNING id`,
      [userId, targetId]
    )

    if (res.rows.length === 0) {
      throw new TrainerError('Vínculo ativo não encontrado', 404)
    }

    return { success: true, message: 'Consultoria desvinculada com sucesso' }
  },
}
