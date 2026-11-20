import { db } from "./db.ts";
import { jsonResponse, parseJsonColumn } from "./security.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface ExerciseMuscle {
  id: number;
  name: string;
  isPrimary: boolean;
}

export interface Exercise {
  id: number;
  wgerId: number | null;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  muscles: ExerciseMuscle[];
}

const EXERCISE_SELECT = `
  SELECT
    e.id,
    e.wger_id AS "wgerId",
    COALESCE(NULLIF(e.name_pt, ''), e.name) AS name,
    COALESCE(NULLIF(e.description_pt, ''), e.description) AS description,
    e.category,
    e.image_url AS "imageUrl",
    COALESCE(
      json_agg(
        json_build_object('id', m.id, 'name', m.name, 'isPrimary', em.is_primary)
        ORDER BY em.is_primary DESC, m.name
      ) FILTER (WHERE m.id IS NOT NULL),
      '[]'
    ) AS muscles
  FROM exercises e
  LEFT JOIN exercise_muscles em ON em.exercise_id = e.id
  LEFT JOIN muscle_groups m ON m.id = em.muscle_id
`;

// deno-lint-ignore no-explicit-any
function mapExerciseRow(row: any): Exercise {
  return {
    id: Number(row.id),
    wgerId: row.wgerId != null ? Number(row.wgerId) : null,
    name: String(row.name ?? ""),
    description: row.description ?? null,
    category: row.category ?? null,
    imageUrl: row.imageUrl ?? null,
    muscles: parseJsonColumn<ExerciseMuscle[]>(row.muscles) ?? [],
  };
}

export async function listExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const result = await db.query(
    `${EXERCISE_SELECT} WHERE e.id = ANY($1::int[]) GROUP BY e.id`,
    [ids],
  );
  const byId = new Map<number, Exercise>(
    result.rows.map((r) => {
      const ex = mapExerciseRow(r);
      return [ex.id, ex];
    }),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((e): e is Exercise => e !== undefined);
}

export async function handleExerciseRoutes(
  req: Request,
  path: string,
  url: URL,
): Promise<Response | null> {
  if (req.method !== "GET") return null;

  if (path === "/exercises/categories") {
    const result = await db.query<{ category: string }>(
      `SELECT DISTINCT category FROM exercises
       WHERE category IS NOT NULL AND category <> ''
       ORDER BY category`,
    );
    return jsonResponse(
      { categories: result.rows.map((r) => r.category) },
      200,
    );
  }

  if (path === "/exercises/muscles") {
    const result = await db.query(
      `SELECT id, name, wger_id AS "wgerId" FROM muscle_groups ORDER BY name`,
    );
    return jsonResponse({ muscles: result.rows }, 200);
  }

  if (path === "/exercises") {
    const search = url.searchParams.get("search") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const muscleIdRaw = url.searchParams.get("muscleId");
    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");

    const muscleId = muscleIdRaw ? Number(muscleIdRaw) : undefined;
    const parsedLimit = limitRaw ? Number(limitRaw) : DEFAULT_LIMIT;
    const limit = Math.max(
      1,
      Math.min(
        Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.floor(parsedLimit)
          : DEFAULT_LIMIT,
        MAX_LIMIT,
      ),
    );
    const parsedOffset = offsetRaw ? Number(offsetRaw) : 0;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
      ? Math.floor(parsedOffset)
      : 0;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(COALESCE(e.name_pt, e.name) ILIKE $${idx} OR e.name ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (category) {
      conditions.push(`e.category = $${idx}`);
      params.push(category);
      idx++;
    }

    if (muscleId && Number.isInteger(muscleId)) {
      conditions.push(
        `EXISTS (SELECT 1 FROM exercise_muscles em2 WHERE em2.exercise_id = e.id AND em2.muscle_id = $${idx})`,
      );
      params.push(muscleId);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await db.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM exercises e ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listResult = await db.query(
      `${EXERCISE_SELECT}
       ${where}
       GROUP BY e.id
       ORDER BY name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return jsonResponse(
      {
        exercises: listResult.rows.map(mapExerciseRow),
        pagination: { total, limit, offset },
      },
      200,
    );
  }

  const idMatch = path.match(/^\/exercises\/([^/]+)$/);
  if (idMatch) {
    const id = Number(decodeURIComponent(idMatch[1]));
    if (!Number.isInteger(id)) {
      return jsonResponse({ error: "ID inválido" }, 400);
    }

    const result = await db.query(
      `${EXERCISE_SELECT}
       WHERE e.id = $1
       GROUP BY e.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return jsonResponse({ error: "Exercício não encontrado" }, 404);
    }

    return jsonResponse({ exercise: mapExerciseRow(result.rows[0]) }, 200);
  }

  return null;
}
