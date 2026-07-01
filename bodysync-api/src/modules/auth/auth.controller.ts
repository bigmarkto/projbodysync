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
        confirmPassword,
        name,
        birthYear,
        birthDate,
        heightCm,
        weightKg,
        desiredWeightKg,
        gender,
        fitnessGoal,
        experienceLevel,
        activityLevel,
        role,
        subscriptionType,
        hydrationReminder,
        hydrationTime,
        desiredModality,
        modalities,
        workoutSchedule,
        workoutDays,
        workoutTime,
      } = req.body

      // 1. Validações básicas
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Formato de email inválido. Exemplo: usuario@email.com',
        })
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Senha é obrigatória' })
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'A senha deve ter no mínimo 8 caracteres',
        })
      }

      // Validação de confirmPassword (opcional - só se enviado)
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ error: 'As senhas não coincidem' })
      }

      if (!name || name.trim().length < 3) {
        return res.status(400).json({
          error: 'Nome deve ter pelo menos 3 caracteres',
        })
      }

      // Converter birthYear/birthDate para birthDate (YYYY-MM-DD)
      let finalBirthDate: string
      const dateValue = birthYear || birthDate

      console.log('🔍 DEBUG - Data de nascimento:', {
        birthYear,
        birthDate,
        dateValue,
        type: typeof dateValue,
      })

      if (!dateValue || dateValue === null || dateValue === undefined) {
        return res.status(400).json({
          error:
            'Data de nascimento é obrigatória. Envie birthYear ou birthDate.',
        })
      }

      try {
        const dateStr = dateValue.toString()
        finalBirthDate = dateStr.includes('-') ? dateStr : `${dateStr}-01-01`
      } catch (error) {
        console.error('Erro ao processar data:', error)
        return res.status(400).json({ error: 'Data de nascimento inválida' })
      }

      if (!heightCm || isNaN(Number(heightCm)) || Number(heightCm) <= 0) {
        return res.status(400).json({
          error: 'Altura deve ser um número válido em centímetros',
        })
      }

      if (!weightKg || isNaN(Number(weightKg)) || Number(weightKg) <= 0) {
        return res.status(400).json({
          error: 'Peso deve ser um número válido em quilogramas',
        })
      }

      if (
        !gender ||
        !['masculino', 'feminino', 'outro', 'nao_binario'].includes(gender)
      ) {
        return res.status(400).json({
          error:
            'Gênero inválido. Use: masculino | feminino | outro | nao_binario',
        })
      }

      // Resolver fitnessGoal e experienceLevel
      const validFitnessGoals = [
        'emagrecimento',
        'ganho_peso',
        'ganho_massa_muscular',
        'condicionamento_fisico',
        'saude_bem_estar',
      ]
      const validExperienceLevels = ['iniciante', 'intermediario', 'avancado']

      let finalFitnessGoal = fitnessGoal
      let finalExperienceLevel = experienceLevel

      if (fitnessGoal && validExperienceLevels.includes(fitnessGoal)) {
        finalExperienceLevel = fitnessGoal
        finalFitnessGoal = 'condicionamento_fisico'
      }

      if (!finalFitnessGoal || !validFitnessGoals.includes(finalFitnessGoal)) {
        finalFitnessGoal = 'condicionamento_fisico'
      }

      // activityLevel é opcional agora
      const finalActivityLevel = activityLevel || 'moderado'

      // role é opcional (padrão: comum)
      const finalRole = role || 'comum'

      if (!['comum', 'admin', 'professor'].includes(finalRole)) {
        return res.status(400).json({
          error: 'Tipo de usuário inválido. Use: comum | admin | professor',
        })
      }

      // subscriptionType (padrão: free)
      const finalSubscriptionType = subscriptionType || 'free'

      if (!['free', 'basic', 'premium'].includes(finalSubscriptionType)) {
        return res.status(400).json({
          error: 'Tipo de assinatura inválido. Use: free | basic | premium',
        })
      }

      // desiredWeightKg (opcional)
      const finalDesiredWeightKg = desiredWeightKg
        ? Number(desiredWeightKg)
        : null

      // hydrationReminder (padrão: false)
      const finalHydrationReminder = hydrationReminder ?? false

      // desiredModality (aceita string ou array)
      let finalDesiredModality = desiredModality || null
      if (modalities && Array.isArray(modalities)) {
        finalDesiredModality = modalities.length > 0 ? modalities[0] : null
      }

      // workoutSchedule (aceita objeto ou workoutDays + workoutTime)
      let finalWorkoutSchedule = null
      if (workoutSchedule && typeof workoutSchedule === 'object') {
        finalWorkoutSchedule = workoutSchedule
      } else if (workoutDays || workoutTime) {
        if (!Array.isArray(workoutDays)) {
          return res.status(400).json({
            error: 'workoutDays deve ser um array de números (0-6)',
          })
        }
        const daysArray = new Array(7).fill(false)
        workoutDays.forEach((dayIndex: number) => {
          if (dayIndex >= 0 && dayIndex <= 6) {
            daysArray[dayIndex] = true
          }
        })
        finalWorkoutSchedule = {
          days: daysArray,
          time: workoutTime || null,
        }
      }

      // Chama o service
      const result = await authService.register({
        email,
        password,
        name: name.trim(),
        heightCm: Number(heightCm),
        birthDate: finalBirthDate,
        weightKg: Number(weightKg),
        gender,
        fitnessGoal: finalFitnessGoal,
        role: finalRole,
        experienceLevel: finalExperienceLevel || null,
        activityLevel: finalActivityLevel,
        workoutFrequency: finalWorkoutSchedule
          ? finalWorkoutSchedule.days.filter(Boolean).length
          : null,
        lastWorkoutDate: undefined,
        subscriptionType: finalSubscriptionType,
        desiredWeightKg: finalDesiredWeightKg,
        hydrationReminder: finalHydrationReminder,
        desiredModality: finalDesiredModality,
        workoutSchedule: finalWorkoutSchedule || undefined,
      })

      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso!',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error: any) {
      console.error('Erro no registro:', error)

      if (error.message === 'Email já cadastrado') {
        return res.status(409).json({ error: 'Este email já está cadastrado' })
      }

      return res.status(500).json({
        error: 'Erro interno ao cadastrar usuário. Tente novamente.',
      })
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' })
      }

      const result = await authService.login({ email, password })

      return res.status(200).json({
        message: 'Login realizado com sucesso!',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
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
      return res.status(200).json(tokens)
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
      return res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}
