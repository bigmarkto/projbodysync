// src/modules/user-profile/user-profile.controller.ts
import { Request, Response, NextFunction } from 'express'
import { userProfileService } from './user-profile.service'
import {
  CreateProfileRequest,
  UpdateProfileRequest,
} from './user-profile.types'

export const userProfileController = {
  // Criar ou atualizar perfil
  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const data: CreateProfileRequest = req.body
      const result = await userProfileService.upsert(userId, data)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // Buscar perfil
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const result = await userProfileService.getByUserId(userId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // Atualizar parcialmente
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const data: UpdateProfileRequest = req.body
      const result = await userProfileService.update(userId, data)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
}
