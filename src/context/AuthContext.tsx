import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../config/api' // ✅ IMPORTA A URL DE UM LUGAR SÓ

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@bodysync:accessToken',
  REFRESH_TOKEN: '@bodysync:refreshToken',
  USER: '@bodysync:user',
}

// ✅ INTERFACE ATUALIZADA PARA BATER COM O BACKEND
export interface User {
  id: string
  email: string
  name: string
  heightCm: number
  birthDate: string
  weightKg: number
  gender: string
  fitnessGoal: string
  role: 'comum' | 'admin' | 'professor' // ✅ NOVO
  experienceLevel: string | null
  activityLevel: string | null
  workoutFrequency: number | null
  lastWorkoutDate: string | null
  subscriptionType: 'free' | 'basic' | 'premium' // ✅ NOVO
  desiredWeightKg: number | null
  hydrationReminder: boolean
  desiredModality: string | null
  workoutSchedule: {
    days: boolean[]
    time: string | null
  } | null // ✅ NOVO
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = (delayMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(async () => {
      await refreshSession()
    }, delayMs)
  }

  const parseTokenExpiry = (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000
    } catch {
      return Date.now() + 14 * 60 * 1000
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    try {
      const storedRefresh = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      )
      if (!storedRefresh) return false

      const response = await fetch(`${API_URL}/auth/refresh`, {
        // ✅ USA A URL IMPORTADA
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      })

      if (!response.ok) {
        await clearSession()
        return false
      }

      const { accessToken, refreshToken } = await response.json()

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ])

      setState(prev => ({ ...prev, accessToken }))

      const expiry = parseTokenExpiry(accessToken)
      const refreshIn = expiry - Date.now() - 60_000
      if (refreshIn > 0) scheduleRefresh(refreshIn)

      return true
    } catch {
      await clearSession()
      return false
    }
  }

  const clearSession = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ])
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [accessToken, refreshToken, userJson] =
          await AsyncStorage.multiGet([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.USER,
          ])

        const token = accessToken[1]
        const refresh = refreshToken[1]
        const user = userJson[1] ? (JSON.parse(userJson[1]) as User) : null

        if (!token || !refresh || !user) {
          setState(prev => ({ ...prev, isLoading: false }))
          return
        }

        const expiry = parseTokenExpiry(token)
        const isExpired = expiry <= Date.now()

        if (isExpired) {
          const renewed = await (async () => {
            try {
              const response = await fetch(`${API_URL}/auth/refresh`, {
                // ✅ USA A URL IMPORTADA
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: refresh }),
              })
              if (!response.ok) return false
              const data = await response.json()
              await AsyncStorage.multiSet([
                [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
                [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
              ])
              setState({
                user,
                accessToken: data.accessToken,
                isAuthenticated: true,
                isLoading: false,
              })
              const newExpiry = parseTokenExpiry(data.accessToken)
              const refreshIn = newExpiry - Date.now() - 60_000
              if (refreshIn > 0) scheduleRefresh(refreshIn)
              return true
            } catch {
              return false
            }
          })()

          if (!renewed) await clearSession()
          return
        }

        setState({
          user,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        })

        const refreshIn = expiry - Date.now() - 60_000
        if (refreshIn > 0) scheduleRefresh(refreshIn)
      } catch {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    restoreSession()

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      // ✅ USA A URL IMPORTADA
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Credenciais inválidas')
    }

    const { user, accessToken, refreshToken } = data

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
    ])

    setState({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    })

    const expiry = parseTokenExpiry(accessToken)
    const refreshIn = expiry - Date.now() - 60_000
    if (refreshIn > 0) scheduleRefresh(refreshIn)
  }

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      )
      if (refreshToken) {
        await fetch(`${API_URL}/auth/logout`, {
          // ✅ USA A URL IMPORTADA
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {}
    await clearSession()
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}
