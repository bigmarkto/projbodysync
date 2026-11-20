import { AppError, db } from "./db.ts";
import { dateKey, jsonResponse, parseJsonBody } from "./security.ts";

const CUP_SIZE_ML = 250;
const ML_PER_KG = 35;
const DEFAULT_GOAL_ML = 2000;
const MIN_GOAL_ML = 500;
const MAX_GOAL_ML = 8000;

async function getProfileGoals(userId: string): Promise<{
  suggestedGoalMl: number;
  customGoalMl: number | null;
}> {
  const result = await db.query<{
    weight_kg: string | number | null;
    hydration_goal_ml: number | null;
  }>(
    "SELECT weight_kg, hydration_goal_ml FROM user_profiles WHERE user_id = $1",
    [userId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Perfil não encontrado", 404);
  }

  const row = result.rows[0];
  const weight = row.weight_kg ? Number(row.weight_kg) : null;
  const suggestedGoalMl = weight
    ? Math.round(weight * ML_PER_KG)
    : DEFAULT_GOAL_ML;
  const customGoalMl = row.hydration_goal_ml != null
    ? Number(row.hydration_goal_ml)
    : null;

  return { suggestedGoalMl, customGoalMl };
}

function buildHydrationStatus(
  date: string,
  consumedMl: number,
  suggestedGoalMl: number,
  customGoalMl: number | null,
) {
  const goalMl = customGoalMl ?? suggestedGoalMl;
  const total = Math.max(1, Math.ceil(goalMl / CUP_SIZE_ML));
  const consumed = Math.round(consumedMl / CUP_SIZE_ML);
  const percentage = goalMl > 0
    ? Math.min(100, Math.round((consumedMl / goalMl) * 100))
    : 0;

  return {
    date,
    consumedMl,
    goalMl,
    suggestedGoalMl,
    customGoalMl,
    cupSizeMl: CUP_SIZE_ML,
    cups: { consumed, total },
    percentage,
  };
}

async function getStatus(userId: string) {
  const { suggestedGoalMl, customGoalMl } = await getProfileGoals(userId);
  const today = dateKey();

  const result = await db.query<{
    consumed_ml: number;
    log_date: string;
  }>(
    `SELECT consumed_ml, to_char(log_date, 'YYYY-MM-DD') AS log_date
     FROM hydration_logs
     WHERE user_id = $1 AND log_date = $2::date`,
    [userId, today],
  );

  const consumedMl = result.rows[0] ? Number(result.rows[0].consumed_ml) : 0;
  const date = result.rows[0]?.log_date ?? today;

  return buildHydrationStatus(date, consumedMl, suggestedGoalMl, customGoalMl);
}

export async function handleHydrationRoutes(
  req: Request,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === "/hydration" && req.method === "GET") {
    return jsonResponse(await getStatus(userId), 200);
  }

  if (path === "/hydration" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const amountMl = body.amountMl;

    if (amountMl !== undefined && typeof amountMl !== "number") {
      return jsonResponse({ error: "amountMl deve ser um número" }, 400);
    }

    const { suggestedGoalMl, customGoalMl } = await getProfileGoals(userId);
    const today = dateKey();
    const effectiveAmount = amountMl ?? CUP_SIZE_ML;

    const result = await db.query<{
      consumed_ml: number;
      log_date: string;
    }>(
      `INSERT INTO hydration_logs (user_id, log_date, consumed_ml)
       VALUES ($1, $2::date, GREATEST(0, $3))
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         consumed_ml = GREATEST(0, hydration_logs.consumed_ml + $3),
         updated_at = NOW()
       RETURNING consumed_ml, to_char(log_date, 'YYYY-MM-DD') AS log_date`,
      [userId, today, Math.round(effectiveAmount)],
    );

    const consumedMl = Number(result.rows[0].consumed_ml);
    const date = result.rows[0].log_date;

    return jsonResponse(
      buildHydrationStatus(date, consumedMl, suggestedGoalMl, customGoalMl),
      200,
    );
  }

  if (path === "/hydration/goal" && req.method === "PUT") {
    const body = await parseJsonBody(req);
    const goalMl = body.goalMl;

    if (
      goalMl !== null &&
      goalMl !== undefined &&
      typeof goalMl !== "number"
    ) {
      return jsonResponse(
        { error: "goalMl deve ser um número ou null" },
        400,
      );
    }

    let value: number | null = null;
    if (goalMl != null) {
      const rounded = Math.round(goalMl);
      if (rounded < MIN_GOAL_ML || rounded > MAX_GOAL_ML) {
        return jsonResponse(
          { error: `A meta deve estar entre ${MIN_GOAL_ML}ml e ${MAX_GOAL_ML}ml` },
          400,
        );
      }
      value = rounded;
    }

    const updated = await db.query(
      `UPDATE user_profiles
       SET hydration_goal_ml = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id`,
      [value, userId],
    );

    if (updated.rows.length === 0) {
      throw new AppError("Perfil não encontrado", 404);
    }

    return jsonResponse(await getStatus(userId), 200);
  }

  return null;
}
