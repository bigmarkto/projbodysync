import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let client: SupabaseClient | null = null

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!client) {
      if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
        throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios para usar o Supabase Storage')
      }
      client = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)
    }
    return (client as any)[prop]
  },
})
