import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const API_STORAGE_KEY = '@bodysync:customApiUrl'
export const SUPABASE_CLOUD_API_URL =
  'https://fhbcihntnojnrdxhtjor.supabase.co/functions/v1/api'

const DEFAULT_REQUEST_TIMEOUT_MS = 10000
const DEFAULT_PROBE_TIMEOUT_MS = 1500

const FALLBACK_API_URLS = [SUPABASE_CLOUD_API_URL]

export interface ApiCandidateOptions {
  platformOs?: string
  hostname?: string
  envUrl?: string
  customUrl?: string | null
}

let customApiUrl: string | null = null

const extractHostname = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''
  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `http://${trimmed}`
  try {
    return new URL(withScheme).hostname.toLowerCase()
  } catch {
    const withoutScheme = withScheme.replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, '')
    const hostPort = withoutScheme.split('/')[0] ?? ''
    if (hostPort.startsWith('[')) {
      const endBracket = hostPort.indexOf(']')
      return endBracket > 0
        ? hostPort.slice(1, endBracket).toLowerCase()
        : hostPort.toLowerCase()
    }
    return (hostPort.split(':')[0] ?? '').toLowerCase()
  }
}

/**
 * Identifica URLs locais ou de rede privada legadas de desenvolvimento.
 */
export const isLegacyLocalApiUrl = (rawUrl: string): boolean => {
  const host = extractHostname(rawUrl).replace(/^\[|\]$/g, '')
  if (!host) return false
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '10.0.2.2'
  ) {
    return true
  }
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true
  const match172 = /^172\.(\d{1,3})(?:\.\d{1,3}){2}$/.exec(host)
  if (match172) {
    const secondOctet = Number(match172[1])
    if (secondOctet >= 16 && secondOctet <= 31) return true
  }
  return false
}

/**
 * Normaliza uma URL base da API garantindo ausência de barras finais e sufixo `/api`.
 */
export const normalizeApiUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

/**
 * Retorna a lista ordenada e deduplicada de URLs candidatas da API.
 */
export const getApiCandidates = (options?: ApiCandidateOptions): string[] => {
  const platformOs = options?.platformOs ?? Platform.OS
  const hostname =
    options?.hostname !== undefined
      ? options.hostname
      : typeof window !== 'undefined'
        ? window.location?.hostname
        : undefined
  const envUrl =
    options?.envUrl !== undefined ? options.envUrl : process.env.EXPO_PUBLIC_API_URL
  const customUrl =
    options?.customUrl !== undefined ? options.customUrl : customApiUrl

  const rawCandidates: Array<string | null | undefined> = [
    customUrl,
    envUrl,
    platformOs === 'web' && hostname ? `http://${hostname}:3000/api` : undefined,
    ...FALLBACK_API_URLS,
  ]

  const seen = new Set<string>()
  const result: string[] = []

  for (const candidate of rawCandidates) {
    if (!candidate) continue
    const normalized = normalizeApiUrl(candidate)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

/**
 * Retorna o candidato primário para a URL da API.
 */
export const resolveApiUrl = (options?: ApiCandidateOptions): string => {
  const candidates = getApiCandidates(options)
  return candidates[0] ?? FALLBACK_API_URLS[0]
}

let activeApiUrl: string = resolveApiUrl()

/**
 * Mantido para compatibilidade retroativa com importações existentes.
 */
export const API_URL = activeApiUrl

/**
 * Retorna a URL da API ativa no momento.
 */
export const getApiUrl = (): string => activeApiUrl

/**
 * Persiste ou remove uma URL customizada no AsyncStorage e atualiza a URL ativa.
 * URLs locais/privadas legadas são descartadas para manter a API em nuvem ativa.
 */
export const setCustomApiUrl = async (url: string | null): Promise<string> => {
  const normalized = url ? normalizeApiUrl(url) : ''
  if (!normalized || isLegacyLocalApiUrl(normalized)) {
    customApiUrl = null
    await AsyncStorage.removeItem(API_STORAGE_KEY)
  } else {
    customApiUrl = normalized
    await AsyncStorage.setItem(API_STORAGE_KEY, normalized)
  }
  activeApiUrl = resolveApiUrl()
  return activeApiUrl
}

/**
 * Carrega a URL customizada salva no AsyncStorage durante a inicialização do app.
 * Remove automaticamente URLs locais/privadas legadas salvas em testes anteriores.
 */
export const loadCustomApiUrl = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(API_STORAGE_KEY)
    const normalized = stored ? normalizeApiUrl(stored) : ''
    if (!normalized || isLegacyLocalApiUrl(normalized)) {
      customApiUrl = null
      if (stored !== null) {
        await AsyncStorage.removeItem(API_STORAGE_KEY)
      }
    } else {
      customApiUrl = normalized
    }
  } catch {
    customApiUrl = null
  }
  activeApiUrl = resolveApiUrl()
  return activeApiUrl
}

const isAbortError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'name' in err &&
  (err as { name?: string }).name === 'AbortError'

const createAbortError = (): Error => {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  return err
}

const fetchWithTimeout = async (
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<Response> => {
  if (init?.signal?.aborted) {
    throw createAbortError()
  }

  const controller = new AbortController()
  let timedOut = false
  let onExternalAbort: (() => void) | undefined

  if (init?.signal) {
    onExternalAbort = () => controller.abort()
    init.signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true
        controller.abort()
        reject(createAbortError())
      }, timeoutMs)
    })

    const fetchPromise = fetchImpl(url, {
      ...init,
      signal: controller.signal,
    })
    // Evita UnhandledRejection caso o timeout vença e o fetch rejeite depois.
    fetchPromise.catch(() => {})

    return await Promise.race([fetchPromise, timeoutPromise])
  } catch (err) {
    if (timedOut && !isAbortError(err)) {
      throw createAbortError()
    }
    throw err
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    if (init?.signal && onExternalAbort) {
      init.signal.removeEventListener('abort', onExternalAbort)
    }
  }
}

/**
 * Verifica se um endpoint `/health` específico responde com status 2xx.
 */
export const checkApiHealth = async (
  baseUrl: string = getApiUrl(),
  fetchImpl?: typeof fetch,
  timeoutMs: number = DEFAULT_PROBE_TIMEOUT_MS
): Promise<boolean> => {
  const effectiveFetch = fetchImpl ?? globalThis.fetch
  const normalized = normalizeApiUrl(baseUrl)
  if (!normalized) return false
  try {
    const res = await fetchWithTimeout(
      `${normalized}/health`,
      { method: 'GET' },
      timeoutMs,
      effectiveFetch
    )
    return Boolean(res && res.ok)
  } catch {
    return false
  }
}

const probeLiveApiUrl = async (
  fetchImpl: typeof fetch,
  timeoutMs: number,
  excludeUrls: string[] = []
): Promise<string | null> => {
  const excluded = new Set(excludeUrls)
  const candidates = getApiCandidates().filter((candidate) => !excluded.has(candidate))

  for (const candidate of candidates) {
    const ok = await checkApiHealth(candidate, fetchImpl, timeoutMs)
    if (ok) {
      activeApiUrl = candidate
      return candidate
    }
  }

  return null
}

/**
 * Testa as URLs candidatas em `/health`, armazena em cache a primeira alcançável e a retorna.
 */
export const probeAndResolveApiUrl = async (
  fetchImpl?: typeof fetch,
  timeoutMs: number = DEFAULT_PROBE_TIMEOUT_MS
): Promise<string> => {
  const effectiveFetch = fetchImpl ?? globalThis.fetch
  const liveUrl = await probeLiveApiUrl(effectiveFetch, timeoutMs)
  return liveUrl ?? activeApiUrl
}

/**
 * Executa fetch com timeout e fallback automático para outra URL candidata saudável em caso de erro de rede.
 */
export const fetchWithApiFallback = async (
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl?: typeof fetch
): Promise<Response> => {
  const effectiveFetch = fetchImpl ?? globalThis.fetch
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const currentUrl = getApiUrl()

  try {
    return await fetchWithTimeout(
      `${currentUrl}${normalizedPath}`,
      init,
      timeoutMs,
      effectiveFetch
    )
  } catch (err) {
    const callerAborted = Boolean(init?.signal?.aborted)
    const isAbort = isAbortError(err)

    if (callerAborted || (isAbort && Platform.OS === 'web')) {
      throw err
    }

    const liveUrl = await probeLiveApiUrl(
      effectiveFetch,
      DEFAULT_PROBE_TIMEOUT_MS,
      [currentUrl]
    )

    if (!liveUrl || liveUrl === currentUrl) {
      throw err
    }

    return await fetchWithTimeout(
      `${liveUrl}${normalizedPath}`,
      init,
      timeoutMs,
      effectiveFetch
    )
  }
}
