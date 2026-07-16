import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { measurementController } from './measurement.controller'

const router = Router()

router.use(authMiddleware)

router.get('/summary', measurementController.summary)
router.post('/', measurementController.create)
router.put('/goal', measurementController.setGoal)

export { router as measurementRoutes }
