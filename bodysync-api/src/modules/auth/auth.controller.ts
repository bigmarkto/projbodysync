// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'

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
        role,
        experienceLevel,
        activityLevel,
        workoutFrequency,
        lastWorkoutDate,
        subscriptionType,
        desiredWeightKg,
        hydrationReminder,
        desiredModality,
        workoutSchedule,
      } = req.body

      // 1. Validações básicas
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

      // 2. Validação de role (OBRIGATÓRIO)
      if (!role || !['comum', 'admin', 'professor'].includes(role)) {
        return res.status(400).json({
          error: 'Role inválido. Use: comum | admin | professor',
        })
      }

      // 3. Validação de subscriptionType por role
      if (!subscriptionType) {
        return res
          .status(400)
          .json({ error: 'Tipo de assinatura é obrigatório' })
      }

      // Admin e professor podem ter qualquer tipo, comum só pode free ou basic
      if (role === 'comum' && !['free', 'basic'].includes(subscriptionType)) {
        return res.status(400).json({
          error: 'Usuários comuns só podem ter assinatura free ou basic',
        })
      }

      if (!['free', 'basic', 'premium'].includes(subscriptionType)) {
        return res.status(400).json({ error: 'Tipo de assinatura inválido' })
      }

      // 4. Validações opcionais
      if (
        experienceLevel &&
        !['iniciante', 'intermediario', 'avancado'].includes(experienceLevel)
      ) {
        return res.status(400).json({
          error:
            'experienceLevel deve ser: iniciante | intermediario | avancado',
        })
      }

      if (
        activityLevel &&
        !['sedentario', 'leve', 'moderado', 'ativo', 'muito_ativo'].includes(
          activityLevel
        )
      ) {
        return res.status(400).json({
          error:
            'activityLevel deve ser: sedentario | leve | moderado | ativo | muito_ativo',
        })
      }

      if (
        workoutFrequency !== undefined &&
        (typeof workoutFrequency !== 'number' ||
          workoutFrequency < 0 ||
          workoutFrequency > 7)
      ) {
        return res.status(400).json({
          error: 'workoutFrequency deve ser um número entre 0 e 7',
        })
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

      // 5. Validação de workoutSchedule
      if (workoutSchedule !== undefined) {
        if (typeof workoutSchedule !== 'object' || workoutSchedule === null) {
          return res
            .status(400)
            .json({ error: 'workoutSchedule deve ser um objeto' })
        }

        const { days, time } = workoutSchedule

        if (
          !Array.isArray(days) ||
          days.length !== 7 ||
          !days.every(d => typeof d === 'boolean')
        ) {
          return res.status(400).json({
            error:
              'days deve ser um array de exatamente 7 booleanos [domingo, segunda, terca, quarta, quinta, sexta, sabado]',
          })
        }

        if (
          time !== null &&
          (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))
        ) {
          return res.status(400).json({
            error:
              'time deve ser uma string no formato HH:MM (ex: "18:00") ou null',
          })
        }
      }

      // 6. Chama o service
      const result = await authService.register({
        email,
        password,
        name,
        heightCm: Number(heightCm),
        birthDate,
        weightKg: Number(weightKg),
        gender,
        fitnessGoal,
        role,
        experienceLevel: experienceLevel || null,
        activityLevel: activityLevel || null,
        workoutFrequency: workoutFrequency,
        lastWorkoutDate: lastWorkoutDate || null,
        subscriptionType,
        desiredWeightKg,
        hydrationReminder,
        desiredModality: desiredModality || null,
        workoutSchedule: workoutSchedule || null,
      })

      res.status(201).json(result)
    } catch (error: any) {
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
