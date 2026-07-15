import app from './app'
import { env } from './config/env'
import os from 'os'

// Função para obter o IP local da máquina automaticamente
const getLocalIpAddress = (): string => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (iface) {
      for (const details of iface) {
        // Procura por IPv4 que não seja localhost (127.0.0.1)
        if (details.family === 'IPv4' && !details.internal) {
          return details.address
        }
      }
    }
  }
  return 'localhost' // Fallback caso não encontre
}

const PORT = Number(env.PORT)
const LOCAL_IP = getLocalIpAddress()

app.listen(PORT, '0.0.0.0', () => {
  console.log('=========================================')
  console.log(`O servidor está rodando na porta http://192.168.68.100:${PORT}`)
  console.log(`O LocalHost é http://localhost:${PORT}`)
  console.log(`Pra ver no celular sem Expo go é http://${LOCAL_IP}:${PORT}`)
  console.log('=========================================')
  console.log(
    `Lembre-se: Atualize o IP no arquivo src/config/api.ts do frontend se ele mudar!`
  )
  console.log('=========================================')
})
