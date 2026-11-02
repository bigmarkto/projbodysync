import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { db } from '../config/database'

async function run() {
  const migrationPath = path.resolve(__dirname, '../../migrations/002_security_and_performance_tuning.sql')
  console.log(`Lendo arquivo de migração: ${migrationPath}`)
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Conectando ao banco de dados Supabase via pg.Pool...')
  const client = await db.connect()
  try {
    console.log('Iniciando transação de migração...')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('Migração 002 aplicada com sucesso no Supabase!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erro ao aplicar migração:', err)
    process.exit(1)
  } finally {
    client.release()
    await db.end()
  }
}

run()

