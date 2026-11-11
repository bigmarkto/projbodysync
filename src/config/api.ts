import { Platform } from 'react-native'

/**
 * CONFIGURAÇÃO DA API
 *
 * - Na Web (navegador), usa automaticamente o mesmo host (ex: http://localhost:3000/api).
 * - No celular (Expo Go / nativo), usa `EXPO_PUBLIC_API_URL` do `.env` ou o IP da máquina na rede Wi-Fi.
 */
const resolveApiUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000/api`
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.200.36:3000/api'
}

export const API_URL = resolveApiUrl()
