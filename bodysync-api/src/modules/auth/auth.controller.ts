import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'

// Regex simples para validação de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authController = {
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
        subscriptionType,
        desiredWeightKg,
        hydrationReminder,
        desiredModality,
        workoutSchedule,
      } = req.body

      // 1. Validações de formato
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido' })
      }

      if (!password || password.length < 8) {
        return res
          .status(400)
          .json({ error: 'A senha deve ter no mínimo 8 caracteres' })
      }

      if (
        !name ||
        !heightCm ||
        !birthDate ||
        !weightKg ||
        !gender ||
        !fitnessGoal
      ) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando' })
      }

      // 2. Validação de campos novos
      if (
        !subscriptionType ||
        !['free', 'basic', 'premium'].includes(subscriptionType)
      ) {
        return res.status(400).json({ error: 'Tipo de assinatura inválido' })
      }

      if (typeof desiredWeightKg !== 'number') {
        return res
          .status(400)
          .json({ error: 'Peso desejado deve ser um número' })
      }

      if (typeof hydrationReminder !== 'boolean') {
        return res
          .status(400)
          .json({ error: 'Lembrete de hidratação deve ser true ou false' })
      }

      // 3. Chama o service
      const result = await authService.register({
        email,
        password,
        name,
        heightCm: Number(heightCm),
        birthDate,
        weightKg: Number(weightKg),
        gender,
        fitnessGoal,
        subscriptionType,
        desiredWeightKg,
        hydrationReminder,
        desiredModality,
        workoutSchedule,
      })

      res.status(201).json(result)
    } catch (error: any) {
      // Tratamento específico para erros do service
      if (error.message === 'Email já cadastrado') {
        return res.status(409).json({ error: 'Email já cadastrado' })
      }
      next(error)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' })
      }

      const result = await authService.login({ email, password })
      res.status(200).json(result)
    } catch (error: any) {
      if (error.message === 'Credenciais inválidas') {
        return res.status(401).json({ error: 'Email ou senha inválidos' })
      }
      next(error)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token é obrigatório' })
      }
      const tokens = await authService.refresh(refreshToken)
      res.status(200).json(tokens)
    } catch (error) {
      next(error)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token é obrigatório' })
      }
      await authService.logout(refreshToken)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}
