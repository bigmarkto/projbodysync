import 'dotenv/config'
import express from 'express'
import { errorMiddleware } from './middleware/error.middleware'
//import { exerciseRoutes } from './modules/exercise/exercise.routes'

const app = express()

app.use(express.json())

// rotas
//app.use('/api/exercises', exerciseRoutes)

// handler global de erros — sempre o último middleware
app.use(errorMiddleware)

export default app
