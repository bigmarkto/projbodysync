import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { workoutController } from './workout.controller'

const router = Router()

// Todas as rotas exigem autenticação
router.use(authMiddleware)

router.get('/', workoutController.list)
router.post('/', workoutController.create)
router.post('/generate', workoutController.generate)
router.get('/:id', workoutController.getById)
router.put('/:id', workoutController.update)
router.delete('/:id', workoutController.remove)

export { router as workoutRoutes }
