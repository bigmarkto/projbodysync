import 'dotenv/config'
import express from 'express'
import { errorMiddleware } from './middleware/error.middleware'
import { authRoutes } from './modules/auth/auth.routes'
import { userProfileRoutes } from './modules/user-profile/user-profile.routes'
import { hydrationRoutes } from './modules/hydration/hydration.routes'
import { exerciseRoutes } from './modules/exercise/exercise.routes'
import { workoutRoutes } from './modules/workout/workout.routes'
import { paymentRoutes } from './modules/payment/payment.routes'

const app = express()

app.use(express.json())

// Rotas de Autenticação
app.use('/api/auth', authRoutes)

// Rota de Perfil
app.use('/api/profile', userProfileRoutes)

// Rota de Hidratação
app.use('/api/hydration', hydrationRoutes)

// Rotas de Exercícios (catálogo)
app.use('/api/exercises', exerciseRoutes)

// Rotas de Planos de Treino
app.use('/api/workouts', workoutRoutes)

// Rota de Pagamento
app.use('/api/payment', paymentRoutes)

// Handler global de erros — sempre o último middleware
app.use(errorMiddleware)

export default app