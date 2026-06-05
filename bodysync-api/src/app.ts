import 'dotenv/config'
import express from 'express'
import { errorMiddleware } from './middleware/error.middleware'
import { authRoutes } from './modules/auth/auth.routes'
import { userProfileRoutes } from './modules/user-profile/user-profile.routes'
// import { exerciseRoutes } from './modules/exercise/exercise.routes' // <-- Descomente quando criar o módulo exercise

const app = express()

app.use(express.json())

// Rotas de Autenticação
app.use('/api/auth', authRoutes)

// Rota de Perfil
app.use('/api/profile', userProfileRoutes)

// Rotas de Exercícios (descomente quando criar o módulo)
// app.use('/api/exercises', exerciseRoutes)

// Handler global de erros — sempre o último middleware
app.use(errorMiddleware)

export default app