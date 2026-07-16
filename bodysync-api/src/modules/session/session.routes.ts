import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { sessionController } from './session.controller'

const router = Router()

router.use(authMiddleware)

router.post('/', sessionController.create)
router.get('/stats', sessionController.stats)

export { router as sessionRoutes }
