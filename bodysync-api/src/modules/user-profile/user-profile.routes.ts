import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { userProfileController } from './user-profile.controller'

const router = Router()

// Todas as rotas são protegidas (exigem autenticação)
router.use(authMiddleware)

router.get('/', userProfileController.getProfile)
router.post('/', userProfileController.upsert)
router.put('/', userProfileController.update)

export { router as userProfileRoutes }
