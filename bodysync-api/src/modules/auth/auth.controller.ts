import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'

export const authController = {
  // 1. Registro
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        name,
        heightCm,
        birthDate,
        weightKg,
        gender,
        fitnessGoal,
        experienceLevel,
        activityLevel,
      } = req.body

      // Validações de campos obrigatórios
      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ error: 'Email, senha e nome são obrigatórios' })
      }

      if (!heightCm || !birthDate || !weightKg || !gender || !fitnessGoal) {
        return res.status(400).json({
          error:
            'Altura, data de nascimento, peso, gênero e objetivo são obrigatórios',
        })
      }

      // Converte explicitamente os tipos
      const data = {
        email,
        password,
        name,
        heightCm: Number(heightCm),
        birthDate: String(birthDate),
        weightKg: Number(weightKg),
        gender,
        fitnessGoal,
        experienceLevel,
        activityLevel,
      }

      // Valida conversões
      if (isNaN(data.heightCm) || isNaN(data.weightKg)) {
        return res
          .status(400)
          .json({ error: 'Altura e peso devem ser números válidos' })
      }

      const result = await authService.register(data)
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  // 2. Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body

      const result = await authService.login({ email, password })

      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // 3. Refresh Token
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body

      const tokens = await authService.refresh(refreshToken)

      res.status(200).json(tokens)
    } catch (error) {
      next(error)
    }
  },

  // 4. Logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body

      await authService.logout(refreshToken)

      // 204 No Content: sucesso, mas sem corpo na resposta
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}
