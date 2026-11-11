// bodysync-api/src/modules/trainer/trainer.routes.ts
import { Router } from 'express'
import { authMiddleware, requireProfessor } from '../../middleware/auth.middleware'
import { trainerController } from './trainer.controller'

const router = Router()

// Todas as rotas exigem autenticação JWT
router.use(authMiddleware)

// Rotas acessíveis por alunos (vínculo e consulta do seu personal)
router.get('/lookup/:code', trainerController.lookupCode)
router.get('/my-trainer', trainerController.getMyTrainer)
router.post('/connect', trainerController.connect)
router.delete('/students/:studentId', trainerController.disconnect)

// Rotas restritas exclusivamente a contas de Personal Trainer (role = 'professor')
router.get('/profile', requireProfessor, trainerController.getProfile)
router.get('/students', requireProfessor, trainerController.listStudents)
router.get('/students/:studentId', requireProfessor, trainerController.getStudentDetail)
router.post('/prescribe', requireProfessor, trainerController.prescribeWorkout)
router.get('/analytics', requireProfessor, trainerController.getAnalytics)

export { router as trainerRoutes }
