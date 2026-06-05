import 'dotenv/config'
import { db } from '../config/database'
import { supabase } from '../config/supabase'
import { env } from '../config/env'

const WGER_BASE = 'https://wger.de/api/v2'
const LANGUAGE_EN = 2 // 2 = inglês, 20 = português (poucos exercícios traduzidos)

interface WgerImage {
  image: string
  is_main: boolean
}

interface WgerTranslation {
  id: number
  name: string
  description: string
  language: number
}

interface WgerExerciseInfo {
  id: number
  category: { id: number; name: string }
  muscles: { id: number; name: string }[]
  muscles_secondary: { id: number; name: string }[]
  images: WgerImage[]
  translations: WgerTranslation[]
}

async function downloadAndUploadImage(
  imageUrl: string,
  exerciseId: number
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    // converte para buffer binário
    const buffer = Buffer.from(await response.arrayBuffer())
    const extension = imageUrl.split('.').pop() ?? 'png'
    const path = `exercises/${exerciseId}.${extension}`

    const { error } = await supabase.storage
      .from(env.SUPABASE_BUCKET)
      .upload(path, buffer, {
        contentType: `image/${extension}`,
        upsert: true, // sobrescreve se já existir (útil ao re-rodar o seed)
      })

    if (error) {
      console.error(`Erro no upload do exercício ${exerciseId}:`, error.message)
      return null
    }

    // retorna a URL pública permanente do Supabase
    const { data } = supabase.storage
      .from(env.SUPABASE_BUCKET)
      .getPublicUrl(path)

    return data.publicUrl
  } catch (err) {
    console.error(`Falha ao processar imagem do exercício ${exerciseId}:`, err)
    return null
  }
}

async function fetchPage(offset: number): Promise<{
  results: WgerExerciseInfo[]
  hasNext: boolean
}> {
  const url = `${WGER_BASE}/exerciseinfo/?language=${LANGUAGE_EN}&limit=100&offset=${offset}&format=json`
  const res = await fetch(url)
  const data = await res.json()
  return {
    results: data.results,
    hasNext: data.next !== null,
  }
}

async function seed() {
  console.log('🚀 Iniciando seed de exercícios do Wger...')
  let offset = 0
  let total = 0
  let skipped = 0
  let withImages = 0

  while (true) {
    console.log(`\n📄 Buscando página (offset ${offset})...`)
    const { results, hasNext } = await fetchPage(offset)
    console.log(`   Encontrados ${results.length} exercícios nesta página`)

    for (const exercise of results) {
      // Pega a tradução em inglês (language = 2)
      const translation =
        exercise.translations?.find(t => t.language === 2) ||
        exercise.translations?.[0]

      // PULA exercícios sem nome (dados inválidos do Wger)
      if (!translation?.name || translation.name.trim() === '') {
        console.warn(`   ⚠️  Pulando exercício ${exercise.id}: sem nome`)
        skipped++
        continue
      }

      // pega só a imagem principal
      const mainImage = exercise.images?.find(img => img.is_main)

      let imageUrl: string | null = null

      if (mainImage) {
        console.log(
          `   📥 Baixando imagem do exercício ${exercise.id}: "${translation.name}"...`
        )
        imageUrl = await downloadAndUploadImage(mainImage.image, exercise.id)
        if (imageUrl) {
          console.log(`   ✅ Upload concluído`)
          withImages++
        } else {
          console.log(`   ❌ Falha no upload da imagem`)
        }
      } else {
        console.log(`   ℹ️  Exercício ${exercise.id} não tem imagem`)
      }

      // insere no banco — ON CONFLICT atualiza se já existir (idempotente)
      console.log(`   💾 Salvando no banco: "${translation.name}"...`)
      await db.query(
        `INSERT INTO exercises (wger_id, name, description, category, image_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (wger_id) DO UPDATE
           SET name = EXCLUDED.name,
               description = EXCLUDED.description,
               category = EXCLUDED.category,
               image_url = EXCLUDED.image_url`,
        [
          exercise.id,
          translation.name,
          translation.description,
          exercise.category?.name,
          imageUrl,
        ]
      )
      console.log(`   ✅ Exercício salvo com sucesso`)

      total++
    }

    console.log(
      `\n📊 Progresso: ${total} exercícios processados, ${skipped} pulados, ${withImages} com imagens`
    )

    if (!hasNext) {
      console.log(`\n🏁 Fim da paginação`)
      break
    }

    offset += 100
    console.log(`\n⏳ Aguardando 1 segundo antes da próxima página...`)
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\n🎉 Seed concluído!`)
  console.log(`   Total inseridos: ${total}`)
  console.log(`   Total pulados: ${skipped}`)
  console.log(`   Com imagens: ${withImages}`)

  await db.end()
}

seed().catch(err => {
  console.error('Seed falhou:', err)
  process.exit(1)
})
