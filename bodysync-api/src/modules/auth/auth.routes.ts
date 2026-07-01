import { Router } from 'express'
import { authController } from './auth.controller'

const router = Router()

// Rotas públicas (qualquer um pode acessar)
router.post('/register', authController.register)
router.post('/login', authController.login)

// Rotas de gerenciamento de sessão
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)

// Novas rotas de recuperação de senha
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)

export { router as authRoutes }
