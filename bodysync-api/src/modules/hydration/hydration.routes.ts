import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { hydrationController } from './hydration.controller'

const router = Router()

// Todas as rotas exigem autenticação
router.use(authMiddleware)

router.get('/', hydrationController.getStatus)
router.post('/', hydrationController.addIntake)
router.put('/goal', hydrationController.setGoal)

export { router as hydrationRoutes }
