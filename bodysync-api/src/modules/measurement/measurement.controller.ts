// src/modules/measurement/measurement.controller.ts
import { Request, Response, NextFunction } from 'express'
import { measurementService } from './measurement.service'

export const measurementController = {
  // POST /measurements — registra peso
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' })

      const measurement = await measurementService.create(userId, req.body)
      res.status(201).json({ measurement })
    } catch (error) {
      if (error instanceof Error && error.message === 'Peso inválido') {
        return res.status(400).json({ error: error.message })
      }
      next(error)
    }
  },

  // GET /measurements/summary — resumo de progresso + histórico
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' })

      const summary = await measurementService.getSummary(userId)
      res.status(200).json(summary)
    } catch (error) {
      next(error)
    }
  },

  // PUT /measurements/goal — define a meta de peso
  async setGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' })

      const { desiredWeightKg } = req.body
      if (typeof desiredWeightKg !== 'number') {
        return res.status(400).json({ error: 'desiredWeightKg deve ser um número' })
      }

      await measurementService.setGoal(userId, desiredWeightKg)
      const summary = await measurementService.getSummary(userId)
      res.status(200).json(summary)
    } catch (error) {
      if (error instanceof Error && error.message === 'Meta de peso inválida') {
        return res.status(400).json({ error: error.message })
      }
      next(error)
    }
  },
}
