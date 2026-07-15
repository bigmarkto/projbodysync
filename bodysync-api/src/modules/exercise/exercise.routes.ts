import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { exerciseController } from './exercise.controller'

const router = Router()

// Todas as rotas exigem autenticação
router.use(authMiddleware)

// Rotas estáticas ANTES da rota dinâmica /:id
router.get('/categories', exerciseController.categories)
router.get('/muscles', exerciseController.muscles)
router.get('/', exerciseController.list)
router.get('/:id', exerciseController.getById)

export { router as exerciseRoutes }
