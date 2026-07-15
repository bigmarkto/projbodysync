// src/modules/workout/plan-generator.ts
//
// "IA super simples": mecanismo de recomendação baseado em regras.
// Analisa o perfil do usuário + catálogo de exercícios e monta um rascunho
// de plano equilibrado entre grupos musculares. Sem chamadas externas.

// Esquema de séries × repetições por objetivo
const REP_SCHEMES: Record<string, { sets: number; reps: number }> = {
  emagrecimento: { sets: 3, reps: 15 },
  condicionamento_fisico: { sets: 3, reps: 15 },
  ganho_massa_muscular: { sets: 4, reps: 10 },
  ganho_peso: { sets: 4, reps: 8 },
  saude_bem_estar: { sets: 3, reps: 12 },
}
const DEFAULT_SCHEME = { sets: 3, reps: 12 }

// Rótulos amigáveis para nomear o plano
const GOAL_LABELS: Record<string, string> = {
  emagrecimento: 'Emagrecimento',
  ganho_peso: 'Ganho de peso',
  ganho_massa_muscular: 'Ganho de massa muscular',
  condicionamento_fisico: 'Condicionamento físico',
  saude_bem_estar: 'Saúde e bem-estar',
}

export interface GeneratorProfile {
  fitnessGoal: string | null
  experienceLevel: string | null
  activityLevel: string | null
  workoutFrequency: number | null
}

export const planGenerator = {
  schemeFor(goal: string | null): { sets: number; reps: number } {
    return (goal && REP_SCHEMES[goal]) || DEFAULT_SCHEME
  },

  // Quantidade-alvo de exercícios conforme condição atual
  exerciseCount(profile: GeneratorProfile): number {
    const { experienceLevel, activityLevel } = profile
    if (
      experienceLevel === 'avancado' ||
      activityLevel === 'ativo' ||
      activityLevel === 'muito_ativo'
    ) {
      return 8
    }
    if (experienceLevel === 'iniciante' || activityLevel === 'sedentario') {
      return 5
    }
    return 6
  },

  // Ordem de prioridade de categorias — objetivos de perda de peso puxam cardio
  categoryOrder(goal: string | null): string[] {
    if (goal === 'emagrecimento' || goal === 'condicionamento_fisico') {
      return ['Cardio', 'Legs', 'Chest', 'Back', 'Abs', 'Shoulders', 'Arms', 'Calves']
    }
    return ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Abs', 'Calves', 'Cardio']
  },

  planName(goal: string | null): string {
    const label = (goal && GOAL_LABELS[goal]) || 'Treino personalizado'
    return `Plano IA · ${label}`
  },

  // Seleciona ids equilibrando as categorias (round-robin na ordem de prioridade)
  pickBalanced(
    candidates: { id: number; category: string | null }[],
    order: string[],
    count: number
  ): number[] {
    const byCat = new Map<string, number[]>()
    for (const c of candidates) {
      const cat = c.category ?? 'Outros'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(c.id)
    }

    // Categorias na ordem de prioridade + as demais no fim
    const cats = [
      ...order.filter(c => byCat.has(c)),
      ...[...byCat.keys()].filter(c => !order.includes(c)),
    ]

    const picked: number[] = []
    let progressed = true
    while (picked.length < count && progressed) {
      progressed = false
      for (const cat of cats) {
        const list = byCat.get(cat)!
        if (list.length > 0) {
          picked.push(list.shift()!)
          progressed = true
          if (picked.length >= count) break
        }
      }
    }
    return picked
  },
}
