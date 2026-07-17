import 'dotenv/config'
import express from 'express'
import { errorMiddleware } from './middleware/error.middleware'
import { authRoutes } from './modules/auth/auth.routes'
import { userProfileRoutes } from './modules/user-profile/user-profile.routes'
import { hydrationRoutes } from './modules/hydration/hydration.routes'
import { exerciseRoutes } from './modules/exercise/exercise.routes'
import { workoutRoutes } from './modules/workout/workout.routes'
import { sessionRoutes } from './modules/session/session.routes'
import { measurementRoutes } from './modules/measurement/measurement.routes'
import { paymentRoutes } from './modules/payment/payment.routes'

const app = express()

const allowedOrigins = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})

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

// Rotas de Sessões de Treino (registro + estatísticas)
app.use('/api/sessions', sessionRoutes)

// Rotas de Medições (ganhos + metas de peso)
app.use('/api/measurements', measurementRoutes)

// Rota de Pagamento
app.use('/api/payment', paymentRoutes)

// Handler global de erros — sempre o último middleware
app.use(errorMiddleware)

export default app