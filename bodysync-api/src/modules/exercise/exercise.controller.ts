// src/modules/exercise/exercise.controller.ts
import { Request, Response, NextFunction } from 'express'
import { exerciseService } from './exercise.service'

export const exerciseController = {
  // GET /exercises — catálogo com filtros e paginação
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, muscleId, limit, offset } = req.query

      const result = await exerciseService.list({
        search: typeof search === 'string' ? search : undefined,
        category: typeof category === 'string' ? category : undefined,
        muscleId: muscleId ? Number(muscleId) : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // GET /exercises/categories — lista de categorias (para filtro)
  async categories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await exerciseService.listCategories()
      res.status(200).json({ categories })
    } catch (error) {
      next(error)
    }
  },

  // GET /exercises/muscles — grupos musculares (para filtro)
  async muscles(_req: Request, res: Response, next: NextFunction) {
    try {
      const muscles = await exerciseService.listMuscles()
      res.status(200).json({ muscles })
    } catch (error) {
      next(error)
    }
  },

  // GET /exercises/:id — detalhe
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' })
      }

      const exercise = await exerciseService.getById(id)
      res.status(200).json({ exercise })
    } catch (error) {
      if (error instanceof Error && error.message === 'Exercício não encontrado') {
        return res.status(404).json({ error: error.message })
      }
      next(error)
    }
  },
}
