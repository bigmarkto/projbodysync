import 'dotenv/config'

function required(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
  }
  return value
}

export const env = {
  PORT: process.env.PORT ?? '3000',
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_KEY: required('SUPABASE_KEY'),
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET ?? 'exercise-images',
}
