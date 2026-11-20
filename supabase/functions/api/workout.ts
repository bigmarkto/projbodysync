import { AppError, db, type Queryable } from "./db.ts";
import { listExercisesByIds } from "./exercise.ts";
import {
  jsonResponse,
  noContentResponse,
  parseJsonBody,
  parseJsonColumn,
} from "./security.ts";

const FREE_PLAN_LIMIT = 2;

const REP_SCHEMES: Record<string, { sets: number; reps: number }> = {
  emagrecimento: { sets: 3, reps: 15 },
  condicionamento_fisico: { sets: 3, reps: 15 },
  ganho_massa_muscular: { sets: 4, reps: 10 },
  ganho_peso: { sets: 4, reps: 8 },
  saude_bem_estar: { sets: 3, reps: 12 },
};
const DEFAULT_SCHEME = { sets: 3, reps: 12 };

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_peso: "Ganho de peso",
  ganho_massa_muscular: "Ganho de massa muscular",
  condicionamento_fisico: "Condicionamento físico",
  saude_bem_estar: "Saúde e bem-estar",
};

interface GeneratorProfile {
  fitnessGoal: string | null;
  experienceLevel: string | null;
  activityLevel: string | null;
  workoutFrequency: number | null;
}

const planGenerator = {
  schemeFor(goal: string | null): { sets: number; reps: number } {
    return (goal && REP_SCHEMES[goal]) || DEFAULT_SCHEME;
  },

  exerciseCount(profile: GeneratorProfile): number {
    const { experienceLevel, activityLevel } = profile;
    if (
      experienceLevel === "avancado" ||
      activityLevel === "ativo" ||
      activityLevel === "muito_ativo"
    ) {
      return 8;
    }
    if (experienceLevel === "iniciante" || activityLevel === "sedentario") {
      return 5;
    }
    return 6;
  },

  categoryOrder(goal: string | null): string[] {
    if (goal === "emagrecimento" || goal === "condicionamento_fisico") {
      return [
        "Cardio",
        "Legs",
        "Chest",
        "Back",
        "Abs",
        "Shoulders",
        "Arms",
        "Calves",
      ];
    }
    return [
      "Chest",
      "Back",
      "Legs",
      "Shoulders",
      "Arms",
      "Abs",
      "Calves",
      "Cardio",
    ];
  },

  planName(goal: string | null): string {
    const label = (goal && GOAL_LABELS[goal]) || "Treino personalizado";
    return `Plano IA · ${label}`;
  },

  pickBalanced(
    candidates: { id: number; category: string | null }[],
    order: string[],
    count: number,
  ): number[] {
    const byCat = new Map<string, number[]>();
    for (const c of candidates) {
      const cat = c.category ?? "Outros";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(Number(c.id));
    }

    const cats = [
      ...order.filter((c) => byCat.has(c)),
      ...[...byCat.keys()].filter((c) => !order.includes(c)),
    ];

    const picked: number[] = [];
    let progressed = true;
    while (picked.length < count && progressed) {
      progressed = false;
      for (const cat of cats) {
        const list = byCat.get(cat)!;
        if (list.length > 0) {
          picked.push(list.shift()!);
          progressed = true;
          if (picked.length >= count) break;
        }
      }
    }
    return picked;
  },
};

interface PlanExerciseInput {
  exerciseId: number;
  sets: number;
  reps: number;
  restSeconds?: number;
}

async function computeEligibility(
  userId: string,
  used: number,
  queryable: Queryable = db,
  forUpdate: boolean = false,
) {
  const lockClause = forUpdate ? " FOR UPDATE" : "";
  const r = await queryable.query<{ role: string; subscription_type: string }>(
    `SELECT role, subscription_type FROM user_profiles WHERE user_id = $1${lockClause}`,
    [userId],
  );
  const role: string = r.rows[0]?.role ?? "comum";
  const subscriptionType: string = r.rows[0]?.subscription_type ?? "free";

  let limit: number | null;
  let reason: string | null = null;

  if (role !== "comum") {
    limit = 0;
    reason = "Contas de profissionais não criam planos de treino.";
  } else if (subscriptionType === "basic") {
    limit = 0;
    reason =
      "O plano Basic é exclusivo para personais e não inclui planos de treino.";
  } else if (subscriptionType === "premium") {
    limit = null;
  } else {
    limit = FREE_PLAN_LIMIT;
  }

  let canCreate: boolean;
  if (limit === 0) {
    canCreate = false;
  } else if (limit === null) {
    canCreate = true;
  } else {
    canCreate = used < limit;
    if (!canCreate) {
      reason =
        `Você atingiu o limite de ${limit} planos do plano Free. Faça upgrade para o Premium para planos ilimitados.`;
    }
  }

  return { role, subscriptionType, limit, used, canCreate, reason };
}

async function countPlans(
  userId: string,
  queryable: Queryable = db,
): Promise<number> {
  const r = await queryable.query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM workout_plans WHERE user_id = $1 AND created_by_trainer_id IS NULL",
    [userId],
  );
  return r.rows[0]?.total ?? 0;
}

async function validateExercises(exercises: PlanExerciseInput[]): Promise<void> {
  for (const [i, ex] of exercises.entries()) {
    if (!Number.isInteger(ex.exerciseId)) {
      throw new AppError(`exercises[${i}].exerciseId é obrigatório`, 400);
    }
    if (!Number.isInteger(ex.sets) || ex.sets <= 0) {
      throw new AppError(
        `exercises[${i}].sets deve ser um inteiro > 0`,
        400,
      );
    }
    if (!Number.isInteger(ex.reps) || ex.reps <= 0) {
      throw new AppError(
        `exercises[${i}].reps deve ser um inteiro > 0`,
        400,
      );
    }
  }

  if (exercises.length === 0) return;

  const ids = exercises.map((e) => e.exerciseId);
  const found = await db.query<{ id: number }>(
    "SELECT id FROM exercises WHERE id = ANY($1::int[])",
    [ids],
  );
  const foundIds = new Set(found.rows.map((r) => Number(r.id)));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new AppError(
      `Exercícios inexistentes: ${[...new Set(missing)].join(", ")}`,
      400,
    );
  }
}

async function insertPlanExercises(
  tx: Queryable,
  planId: number,
  exercises: PlanExerciseInput[],
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await tx.query(
      `INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps, order_index, rest_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [planId, ex.exerciseId, ex.sets, ex.reps, i, ex.restSeconds ?? 60],
    );
  }
}

async function getPlanById(userId: string, planId: number) {
  const planResult = await db.query(
    `SELECT id, user_id AS "userId", name, created_at AS "createdAt", created_by_trainer_id AS "createdByTrainerId"
     FROM workout_plans
     WHERE id = $1 AND user_id = $2`,
    [planId, userId],
  );

  if (planResult.rows.length === 0) {
    throw new AppError("Plano não encontrado", 404);
  }
  const plan = planResult.rows[0];

  const exResult = await db.query(
    `SELECT
       pe.id,
       pe.exercise_id AS "exerciseId",
       pe.sets,
       pe.reps,
       pe.order_index AS "orderIndex",
       COALESCE(pe.rest_seconds, 60)::int AS "restSeconds",
       json_build_object(
         'id', e.id,
         'name', COALESCE(NULLIF(e.name_pt, ''), e.name),
         'category', e.category,
         'imageUrl', e.image_url,
         'muscles', COALESCE(
           (SELECT json_agg(
              json_build_object('id', m.id, 'name', m.name, 'isPrimary', em.is_primary)
              ORDER BY em.is_primary DESC, m.name)
            FROM exercise_muscles em
            JOIN muscle_groups m ON m.id = em.muscle_id
            WHERE em.exercise_id = e.id),
           '[]'
         )
       ) AS exercise
     FROM plan_exercises pe
     JOIN exercises e ON e.id = pe.exercise_id
     WHERE pe.plan_id = $1
     ORDER BY pe.order_index`,
    [planId],
  );

  const exercises = exResult.rows.map((row) => ({
    ...row,
    exercise: parseJsonColumn(row.exercise),
  }));

  return { ...plan, exercises };
}

export async function handleWorkoutRoutes(
  req: Request,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === "/workouts" && req.method === "GET") {
    const plansRes = await db.query<{
      id: number;
      name: string;
      createdAt: string;
      createdByTrainerId: string | null;
      exerciseCount: number;
    }>(
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
      [userId],
    );
    const plans = plansRes.rows;
    const ownPlansCount = plans.filter((p) => !p.createdByTrainerId).length;
    const meta = await computeEligibility(userId, ownPlansCount);
    return jsonResponse({ plans, meta }, 200);
  }

  if (path === "/workouts/generate" && req.method === "POST") {
    const used = await countPlans(userId);
    const eligibility = await computeEligibility(userId, used);
    if (!eligibility.canCreate) {
      throw new AppError(
        eligibility.reason ?? "Não é possível criar planos nesta conta.",
        403,
      );
    }

    const profileRes = await db.query<GeneratorProfile>(
      `SELECT fitness_goal AS "fitnessGoal",
              experience_level AS "experienceLevel",
              activity_level AS "activityLevel",
              workout_frequency AS "workoutFrequency"
       FROM user_profiles WHERE user_id = $1`,
      [userId],
    );
    const profile: GeneratorProfile = profileRes.rows[0] ?? {
      fitnessGoal: null,
      experienceLevel: null,
      activityLevel: null,
      workoutFrequency: null,
    };

    const goal = profile.fitnessGoal;
    const scheme = planGenerator.schemeFor(goal);
    const count = planGenerator.exerciseCount(profile);

    let candidatesRes = await db.query<{ id: number; category: string | null }>(
      `SELECT id, category FROM exercises
       WHERE image_url IS NOT NULL
       ORDER BY random() LIMIT 300`,
    );
    if (candidatesRes.rows.length === 0) {
      candidatesRes = await db.query<{ id: number; category: string | null }>(
        `SELECT id, category FROM exercises ORDER BY random() LIMIT 300`,
      );
    }

    const pickedIds = planGenerator.pickBalanced(
      candidatesRes.rows,
      planGenerator.categoryOrder(goal),
      count,
    );

    const details = await listExercisesByIds(pickedIds);
    const exercises = details.map((e, i) => ({
      id: 0,
      exerciseId: e.id,
      sets: scheme.sets,
      reps: scheme.reps,
      orderIndex: i,
      exercise: {
        id: e.id,
        name: e.name,
        category: e.category,
        imageUrl: e.imageUrl,
        muscles: e.muscles,
      },
    }));

    return jsonResponse(
      {
        draft: {
          name: planGenerator.planName(goal),
          goal,
          exercises,
        },
      },
      200,
    );
  }

  if (path === "/workouts" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const name = typeof body.name === "string" ? body.name : "";
    if (!name || name.trim().length === 0) {
      throw new AppError("O nome do plano é obrigatório", 400);
    }

    const exercises = Array.isArray(body.exercises)
      ? (body.exercises as PlanExerciseInput[])
      : [];
    await validateExercises(exercises);

    const planId = await db.transaction(async (tx) => {
      await tx.query(
        "SELECT user_id FROM user_profiles WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      const used = await countPlans(userId, tx);
      const eligibility = await computeEligibility(userId, used, tx, false);
      if (!eligibility.canCreate) {
        throw new AppError(
          eligibility.reason ?? "Não é possível criar mais planos nesta conta.",
          403,
        );
      }

      const planResult = await tx.query<{ id: number }>(
        `INSERT INTO workout_plans (user_id, name) VALUES ($1, $2) RETURNING id`,
        [userId, name.trim()],
      );
      const createdId = Number(planResult.rows[0].id);

      await insertPlanExercises(tx, createdId, exercises);
      return createdId;
    });

    const plan = await getPlanById(userId, planId);
    return jsonResponse({ plan }, 201);
  }

  const idMatch = path.match(/^\/workouts\/([^/]+)$/);
  if (idMatch) {
    const id = Number(decodeURIComponent(idMatch[1]));
    if (!Number.isInteger(id)) {
      return jsonResponse({ error: "ID inválido" }, 400);
    }

    if (req.method === "GET") {
      const plan = await getPlanById(userId, id);
      return jsonResponse({ plan }, 200);
    }

    if (req.method === "PUT") {
      const body = await parseJsonBody(req);
      const owns = await db.query<{
        id: number;
        created_by_trainer_id: string | null;
      }>(
        "SELECT id, created_by_trainer_id FROM workout_plans WHERE id = $1 AND user_id = $2",
        [id, userId],
      );
      if (owns.rows.length === 0) {
        throw new AppError("Plano não encontrado", 404);
      }
      if (owns.rows[0].created_by_trainer_id) {
        throw new AppError(
          "Treinos prescritos pelo seu Personal Trainer não podem ser alterados por você.",
          403,
        );
      }

      if (
        body.name !== undefined &&
        (typeof body.name !== "string" || body.name.trim().length === 0)
      ) {
        throw new AppError("O nome do plano não pode ser vazio", 400);
      }

      const exercises = Array.isArray(body.exercises)
        ? (body.exercises as PlanExerciseInput[])
        : undefined;
      if (exercises) {
        await validateExercises(exercises);
      }

      await db.transaction(async (tx) => {
        if (typeof body.name === "string") {
          await tx.query("UPDATE workout_plans SET name = $1 WHERE id = $2", [
            body.name.trim(),
            id,
          ]);
        }
        if (exercises) {
          await tx.query("DELETE FROM plan_exercises WHERE plan_id = $1", [id]);
          await insertPlanExercises(tx, id, exercises);
        }
      });

      const plan = await getPlanById(userId, id);
      return jsonResponse({ plan }, 200);
    }

    if (req.method === "DELETE") {
      const owns = await db.query<{
        id: number;
        created_by_trainer_id: string | null;
      }>(
        "SELECT id, created_by_trainer_id FROM workout_plans WHERE id = $1 AND user_id = $2",
        [id, userId],
      );
      if (owns.rows.length === 0) {
        throw new AppError("Plano não encontrado", 404);
      }
      if (owns.rows[0].created_by_trainer_id) {
        throw new AppError(
          "Treinos prescritos pelo seu Personal Trainer não podem ser excluídos por você.",
          403,
        );
      }

      await db.transaction(async (tx) => {
        await tx.query("DELETE FROM plan_exercises WHERE plan_id = $1", [id]);
        await tx.query("DELETE FROM workout_plans WHERE id = $1", [id]);
      });

      return noContentResponse();
    }
  }

  return null;
}
