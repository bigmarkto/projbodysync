import app from './app'
import { env } from './config/env'

app.listen(Number(env.PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.PORT}`)
  console.log(`Acesse pelo celular: http://192.168.1.81:${env.PORT}`)
})
