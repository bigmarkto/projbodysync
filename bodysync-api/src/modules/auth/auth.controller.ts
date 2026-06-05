import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'

export const authController = {
  // 1. Registro
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body

      // Chama o service. Se der erro (ex: email duplicado), o service lança a exceção.
      const result = await authService.register({ email, password, name })

      // Retorna 201 (Created) com os dados
      res.status(201).json(result)
    } catch (error) {
      // Se der erro, passamos para o middleware global de erros (error.middleware.ts)
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
