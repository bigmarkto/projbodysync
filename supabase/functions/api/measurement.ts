import { AppError, db } from "./db.ts";
import {
  dateKey,
  isValidIsoDate,
  jsonResponse,
  parseJsonBody,
} from "./security.ts";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

async function getSummary(userId: string) {
  const profileRes = await db.query<{
    weight_kg: string | number | null;
    desired_weight_kg: string | number | null;
  }>(
    "SELECT weight_kg, desired_weight_kg FROM user_profiles WHERE user_id = $1",
    [userId],
  );
  const profileWeight = profileRes.rows[0]?.weight_kg
    ? Number(profileRes.rows[0].weight_kg)
    : null;
  const goal = profileRes.rows[0]?.desired_weight_kg
    ? Number(profileRes.rows[0].desired_weight_kg)
    : null;

  const listRes = await db.query<{
    id: number;
    weight_kg: string | number;
    measured_at: string;
  }>(
    `SELECT id, weight_kg, to_char(measured_at, 'YYYY-MM-DD') AS measured_at
     FROM body_measurements
     WHERE user_id = $1
     ORDER BY measured_at ASC, id ASC`,
    [userId],
  );
  const history = listRes.rows.map((r) => ({
    id: Number(r.id),
    weightKg: Number(r.weight_kg),
    measuredAt: r.measured_at,
  }));

  const current = history.length > 0
    ? history[history.length - 1].weightKg
    : profileWeight;
  const start = history.length > 0 ? history[0].weightKg : profileWeight;

  const deltaFromStart = current != null && start != null
    ? Number((current - start).toFixed(1))
    : null;
  const remainingToGoal = current != null && goal != null
    ? Number((current - goal).toFixed(1))
    : null;

  let progressPct: number | null = null;
  if (current != null && start != null && goal != null && start !== goal) {
    progressPct = clamp(
      Math.round(((start - current) / (start - goal)) * 100),
      0,
      100,
    );
  }

  return {
    current,
    start,
    goal,
    deltaFromStart,
    remainingToGoal,
    progressPct,
    history,
  };
}

export async function handleMeasurementRoutes(
  req: Request,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === "/measurements/summary" && req.method === "GET") {
    return jsonResponse(await getSummary(userId), 200);
  }

  if (path === "/measurements" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const weight = Number(body.weightKg);
    if (!weight || weight <= 0 || weight > 500) {
      throw new AppError("Peso inválido", 400);
    }

    const measuredAt = body.measuredAt ?? dateKey();
    if (!isValidIsoDate(measuredAt) || measuredAt > dateKey()) {
      throw new AppError(
        "Data de medição inválida (use YYYY-MM-DD até hoje)",
        400,
      );
    }

    const measurement = await db.transaction(async (tx) => {
      const result = await tx.query<{
        id: number;
        weight_kg: string | number;
        measured_at: string;
      }>(
        `INSERT INTO body_measurements (user_id, weight_kg, measured_at)
         VALUES ($1, $2, $3::date)
         RETURNING id, weight_kg, to_char(measured_at, 'YYYY-MM-DD') AS measured_at`,
        [userId, weight, measuredAt],
      );

      const latestRes = await tx.query<{ weight_kg: string | number }>(
        `SELECT weight_kg FROM body_measurements
         WHERE user_id = $1
         ORDER BY measured_at DESC, id DESC
         LIMIT 1`,
        [userId],
      );
      const latestWeight = latestRes.rows[0]?.weight_kg != null
        ? Number(latestRes.rows[0].weight_kg)
        : weight;

      await tx.query(
        "UPDATE user_profiles SET weight_kg = $1, updated_at = NOW() WHERE user_id = $2",
        [latestWeight, userId],
      );
      await tx.query("UPDATE users SET weight_kg = $1 WHERE id = $2", [
        latestWeight,
        userId,
      ]);

      const row = result.rows[0];
      return {
        id: Number(row.id),
        weightKg: Number(row.weight_kg),
        measuredAt: row.measured_at,
      };
    });

    return jsonResponse({ measurement }, 201);
  }

  if (path === "/measurements/goal" && req.method === "PUT") {
    const body = await parseJsonBody(req);
    const desiredWeightKg = body.desiredWeightKg;
    if (typeof desiredWeightKg !== "number") {
      return jsonResponse(
        { error: "desiredWeightKg deve ser um número" },
        400,
      );
    }

    const goal = Number(desiredWeightKg);
    if (!goal || goal <= 0 || goal > 500) {
      return jsonResponse({ error: "Meta de peso inválida" }, 400);
    }

    const res = await db.query(
      "UPDATE user_profiles SET desired_weight_kg = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id",
      [goal, userId],
    );
    if (res.rows.length === 0) {
      throw new AppError("Perfil não encontrado", 404);
    }
    await db.query("UPDATE users SET desired_weight_kg = $1 WHERE id = $2", [
      goal,
      userId,
    ]);

    return jsonResponse(await getSummary(userId), 200);
  }

  return null;
}
