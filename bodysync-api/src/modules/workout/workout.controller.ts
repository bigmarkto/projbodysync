// src/modules/workout/workout.controller.ts
import { Request, Response, NextFunction } from 'express'
import {
  workoutService,
  PlanNotFoundError,
  ValidationError,
  SubscriptionLimitError,
} from './workout.service'
import { CreatePlanRequest, UpdatePlanRequest } from './workout.types'

// Mapeia erros de domínio para respostas HTTP
function handle(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof PlanNotFoundError) {
    return res.status(404).json({ error: error.message })
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message })
  }
  if (error instanceof SubscriptionLimitError) {
    return res.status(403).json({ error: error.message })
  }
  next(error)
}

export const workoutController = {
  // GET /workouts — lista os planos do usuário + metadados de limite
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const result = await workoutService.listWithMeta(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // POST /workouts/generate — gera um rascunho com a "IA" (não persiste)
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const draft = await workoutService.generateDraft(userId)
      res.status(200).json({ draft })
    } catch (error) {
      handle(error, res, next)
    }
  },

  // GET /workouts/:id — detalhe do plano
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' })
      }

      const plan = await workoutService.getById(userId, id)
      res.status(200).json({ plan })
    } catch (error) {
      handle(error, res, next)
    }
  },

  // POST /workouts — cria um plano
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const data: CreatePlanRequest = req.body
      const plan = await workoutService.create(userId, data)
      res.status(201).json({ plan })
    } catch (error) {
      handle(error, res, next)
    }
  },

  // PUT /workouts/:id — atualiza nome e/ou exercícios
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' })
      }

      const data: UpdatePlanRequest = req.body
      const plan = await workoutService.update(userId, id, data)
      res.status(200).json({ plan })
    } catch (error) {
      handle(error, res, next)
    }
  },

  // DELETE /workouts/:id — remove o plano
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' })
      }

      await workoutService.remove(userId, id)
      res.status(204).send()
    } catch (error) {
      handle(error, res, next)
    }
  },
}
