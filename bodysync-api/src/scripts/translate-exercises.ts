import 'dotenv/config'
import { db } from '../config/database'

const MYMEMORY_API = 'https://api.mymemory.translated.net/get'
const DELAY_MS = 1500 // 1.5 segundos entre requisições (respeita rate limit)

interface Exercise {
  id: number
  name: string
  description: string | null
}

async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') return text

  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|pt-BR`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText
    }

    console.warn(`Tradução falhou para: "${text}". Usando original.`)
    return text
  } catch (err) {
    console.error(`Erro ao traduzir "${text}":`, err)
    return text // fallback: retorna o original
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function translateExercises() {
  console.log('Buscando exercícios sem tradução...')

  const { rows } = await db.query<Exercise>(
    `SELECT id, name, description FROM exercises 
     WHERE name_pt IS NULL 
     ORDER BY id`
  )

  if (rows.length === 0) {
    console.log('Todos os exercícios já estão traduzidos!')
    await db.end()
    return
  }

  console.log(`${rows.length} exercícios para traduzir.\n`)

  let translated = 0
  const total = rows.length

  for (const exercise of rows) {
    translated++
    console.log(`[${translated}/${total}] Traduzindo: "${exercise.name}"`)

    // Traduz nome
    const namePt = await translateText(exercise.name)

    // Traduz descrição (se existir)
    let descriptionPt: string | null = null
    if (exercise.description) {
      // Descrições podem ser longas - MyMemory tem limite de 500 chars por requisição
      // Vamos truncar para não estourar o limite
      const truncatedDesc = exercise.description.substring(0, 450)
      descriptionPt = await translateText(truncatedDesc)
    }

    // Salva no banco
    await db.query(
      `UPDATE exercises 
       SET name_pt = $1, description_pt = $2 
       WHERE id = $3`,
      [namePt, descriptionPt, exercise.id]
    )

    console.log(`  ✓ PT: "${namePt}"`)

    // Delay para respeitar rate limit
    if (translated < total) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nTradução concluída! ${translated} exercícios traduzidos.`)
  await db.end()
}

translateExercises().catch(err => {
  console.error('Falha na tradução:', err)
  process.exit(1)
})
