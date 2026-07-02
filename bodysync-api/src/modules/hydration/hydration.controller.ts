// src/modules/hydration/hydration.controller.ts
import { Request, Response, NextFunction } from 'express'
import { hydrationService } from './hydration.service'
import { AddIntakeRequest, SetGoalRequest } from './hydration.types'

export const hydrationController = {
  // GET /hydration — status do dia
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const status = await hydrationService.getStatus(userId)
      res.status(200).json(status)
    } catch (error) {
      next(error)
    }
  },

  // POST /hydration — registra consumo (padrão: 1 copo)
  async addIntake(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const { amountMl }: AddIntakeRequest = req.body
      if (amountMl !== undefined && typeof amountMl !== 'number') {
        return res.status(400).json({ error: 'amountMl deve ser um número' })
      }

      const status = await hydrationService.addIntake(userId, amountMl)
      res.status(200).json(status)
    } catch (error) {
      next(error)
    }
  },

  // PUT /hydration/goal — define ou zera (null) a meta personalizada
  async setGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const { goalMl }: SetGoalRequest = req.body
      if (
        goalMl !== null &&
        goalMl !== undefined &&
        typeof goalMl !== 'number'
      ) {
        return res
          .status(400)
          .json({ error: 'goalMl deve ser um número ou null' })
      }

      const status = await hydrationService.setCustomGoal(
        userId,
        goalMl ?? null
      )
      res.status(200).json(status)
    } catch (error) {
      next(error)
    }
  },
}
