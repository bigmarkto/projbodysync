// src/modules/session/session.controller.ts
import { Request, Response, NextFunction } from 'express'
import { sessionService } from './session.service'
import { CreateSessionRequest } from './session.types'

export const sessionController = {
  // POST /sessions — registra sessão concluída
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const data: CreateSessionRequest = req.body
      if (!data?.startedAt) {
        return res.status(400).json({ error: 'startedAt é obrigatório' })
      }

      const result = await sessionService.create(userId, data)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  // GET /sessions/stats — estatísticas de treino
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const stats = await sessionService.getStats(userId)
      res.status(200).json(stats)
    } catch (error) {
      next(error)
    }
  },
}
