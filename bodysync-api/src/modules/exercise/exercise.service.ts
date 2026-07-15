// src/modules/exercise/exercise.service.ts
import { db } from '../../config/database'
import {
  Exercise,
  ListExercisesQuery,
  ListExercisesResult,
  MuscleGroup,
} from './exercise.types'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// SELECT que resolve nome/descrição em PT (com fallback) e agrega os músculos
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
`

export const exerciseService = {
  // Lista o catálogo com filtros e paginação
  async list(query: ListExercisesQuery): Promise<ListExercisesResult> {
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT)
    const offset = query.offset || 0

    // Monta os filtros dinamicamente
    const conditions: string[] = []
    const params: any[] = []
    let idx = 1

    if (query.search) {
      conditions.push(
        `(COALESCE(e.name_pt, e.name) ILIKE $${idx} OR e.name ILIKE $${idx})`
      )
      params.push(`%${query.search}%`)
      idx++
    }

    if (query.category) {
      conditions.push(`e.category = $${idx}`)
      params.push(query.category)
      idx++
    }

    if (query.muscleId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM exercise_muscles em2 WHERE em2.exercise_id = e.id AND em2.muscle_id = $${idx})`
      )
      params.push(query.muscleId)
      idx++
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // Total (sem os joins de músculo, para contar exercícios distintos)
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM exercises e ${where}`,
      params
    )
    const total = countResult.rows[0].total

    // Página de resultados
    const listResult = await db.query(
      `${EXERCISE_SELECT}
       ${where}
       GROUP BY e.id
       ORDER BY name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    )

    return {
      exercises: listResult.rows as Exercise[],
      pagination: { total, limit, offset },
    }
  },

  // Busca vários exercícios por id, preservando a ordem dos ids recebidos
  async listByIds(ids: number[]): Promise<Exercise[]> {
    if (ids.length === 0) return []
    const result = await db.query(
      `${EXERCISE_SELECT} WHERE e.id = ANY($1) GROUP BY e.id`,
      [ids]
    )
    const byId = new Map<number, Exercise>(
      result.rows.map((r: Exercise) => [r.id, r])
    )
    return ids
      .map(id => byId.get(id))
      .filter((e): e is Exercise => e !== undefined)
  },

  // Detalhe de um exercício
  async getById(id: number): Promise<Exercise> {
    const result = await db.query(
      `${EXERCISE_SELECT}
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new Error('Exercício não encontrado')
    }

    return result.rows[0] as Exercise
  },

  // Lista as categorias distintas (para filtros)
  async listCategories(): Promise<string[]> {
    const result = await db.query(
      `SELECT DISTINCT category FROM exercises
       WHERE category IS NOT NULL AND category <> ''
       ORDER BY category`
    )
    return result.rows.map(r => r.category)
  },

  // Lista os grupos musculares (para filtros)
  async listMuscles(): Promise<MuscleGroup[]> {
    const result = await db.query(
      `SELECT id, name, wger_id AS "wgerId" FROM muscle_groups ORDER BY name`
    )
    return result.rows as MuscleGroup[]
  },
}
