// Cardio HIIT — pool curado de exercícios (sem/quase sem equipamento)
// e o construtor do roteiro de treino.

import { Ionicons } from "@expo/vector-icons";

export interface HiitExercise {
  name: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  match: string; // termo (em inglês) para buscar a imagem no catálogo
  imageUrl?: string | null; // preenchido em runtime por resolveHiitImages
}

export interface HiitSegment {
  type: "work" | "rest";
  durationSec: number;
  exercise?: HiitExercise; // presente apenas em "work"
}

// Exercícios simples, realizáveis em casa sem equipamento
export const HIIT_POOL: HiitExercise[] = [
  { name: "Polichinelos", instruction: "Salte abrindo pernas e braços", icon: "body", match: "jumping jack" },
  { name: "Joelhos altos", instruction: "Corra no lugar elevando os joelhos", icon: "walk", match: "high knee" },
  { name: "Agachamentos", instruction: "Desça até 90° e volte", icon: "fitness", match: "squat" },
  { name: "Flexões", instruction: "Apoie os joelhos se precisar", icon: "barbell", match: "push-up" },
  { name: "Prancha", instruction: "Mantenha o corpo reto e firme", icon: "remove", match: "plank" },
  { name: "Afundos alternados", instruction: "Passo à frente, joelho quase ao chão", icon: "walk", match: "lunge" },
  { name: "Escalador", instruction: "Prancha trazendo os joelhos ao peito", icon: "speedometer", match: "mountain climber" },
  { name: "Burpees", instruction: "Agache, prancha, salte para cima", icon: "flame", match: "burpee" },
  { name: "Elevação de panturrilha", instruction: "Suba na ponta dos pés", icon: "chevron-up", match: "calf raise" },
  { name: "Corrida estacionária", instruction: "Corra sem sair do lugar", icon: "walk", match: "jogging" },
  { name: "Abdominais", instruction: "Contraia o abdômen ao subir", icon: "body", match: "crunch" },
  { name: "Ponte de glúteo", instruction: "Eleve o quadril deitado", icon: "chevron-up", match: "hip thrust" },
  { name: "Elevação de joelhos", instruction: "Puxe os joelhos ao peito no lugar", icon: "walk", match: "knee raise" },
  { name: "Agachamento com salto", instruction: "Agache e exploda num salto", icon: "flame", match: "box squat" },
];

export const WORK_SEC = 60; // 1 minuto de exercício
export const REST_SEC = 60; // 1 minuto de descanso
export const WORK_BLOCK = 5; // descanso a cada 5 minutos de trabalho

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Constrói o roteiro: blocos de 1 min de exercício, com 1 min de descanso
// a cada 5 minutos de trabalho, até completar a duração escolhida.
export function buildHiitScript(durationMin: number): HiitSegment[] {
  const totalTargetSec = durationMin * 60;
  const pool = shuffle(HIIT_POOL);
  const segments: HiitSegment[] = [];
  let elapsed = 0;
  let workStreak = 0;
  let poolIdx = 0;

  while (elapsed < totalTargetSec) {
    if (workStreak === WORK_BLOCK) {
      segments.push({ type: "rest", durationSec: REST_SEC });
      workStreak = 0;
      elapsed += REST_SEC;
    } else {
      const exercise = pool[poolIdx % pool.length];
      poolIdx++;
      segments.push({ type: "work", durationSec: WORK_SEC, exercise });
      workStreak++;
      elapsed += WORK_SEC;
    }
  }

  // Não termina em descanso
  if (segments.length && segments[segments.length - 1].type === "rest") {
    segments.pop();
  }

  return segments;
}

export function totalWorkMinutes(script: HiitSegment[]): number {
  return script.filter((s) => s.type === "work").length;
}

type RequestFn = (path: string, options?: RequestInit) => Promise<Response>;

// Busca no catálogo uma imagem para cada exercício do roteiro (em paralelo)
// e devolve um novo roteiro com imageUrl preenchido. Falhas caem no ícone.
export async function resolveHiitImages(
  script: HiitSegment[],
  request: RequestFn,
): Promise<HiitSegment[]> {
  // Exercícios únicos presentes no roteiro
  const unique = new Map<string, HiitExercise>();
  for (const s of script) {
    if (s.type === "work" && s.exercise) unique.set(s.exercise.name, s.exercise);
  }

  const results = await Promise.all(
    [...unique.values()].map(async (ex) => {
      try {
        const res = await request(
          `/exercises?search=${encodeURIComponent(ex.match)}&limit=8`,
        );
        if (!res.ok) return [ex.name, null] as const;
        const data = await res.json();
        const withImg = (data.exercises ?? []).find((e: any) => e.imageUrl);
        return [ex.name, withImg?.imageUrl ?? null] as const;
      } catch {
        return [ex.name, null] as const;
      }
    }),
  );

  const imgByName = new Map<string, string | null>(results);

  return script.map((s) =>
    s.type === "work" && s.exercise
      ? {
          ...s,
          exercise: {
            ...s.exercise,
            imageUrl: imgByName.get(s.exercise.name) ?? null,
          },
        }
      : s,
  );
}
