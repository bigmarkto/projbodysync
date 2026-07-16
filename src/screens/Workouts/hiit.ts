// Cardio HIIT de calistenia — pool de exercícios com instruções detalhadas
// e um construtor de roteiro linear e equilibrado (sem equipamento, sem imagens).

import { Ionicons } from "@expo/vector-icons";

export type HiitGroup =
  | "aquecimento"
  | "cardio"
  | "inferior"
  | "superior"
  | "core"
  | "alongamento";

export interface HiitExercise {
  name: string;
  instruction: string; // passo a passo detalhado de execução
  icon: keyof typeof Ionicons.glyphMap;
  group: HiitGroup;
}

export interface HiitSegment {
  type: "work" | "rest";
  durationSec: number;
  exercise?: HiitExercise; // presente apenas em "work"
}

// Todos os exercícios são de calistenia (peso do corpo), sem equipamento.
export const HIIT_POOL: HiitExercise[] = [
  // ── Aquecimento ──────────────────────────────────────────────
  {
    name: "Marcha no lugar",
    group: "aquecimento",
    icon: "walk",
    instruction:
      "Em pé, marche sem sair do lugar elevando os joelhos até a altura do quadril, alternando as pernas. Balance os braços naturalmente. Comece devagar e aumente o ritmo aos poucos para aquecer o corpo.",
  },

  // ── Cardio ───────────────────────────────────────────────────
  {
    name: "Polichinelos",
    group: "cardio",
    icon: "flame",
    instruction:
      "Pés juntos e braços ao lado do corpo. Salte abrindo as pernas para os lados enquanto leva os braços acima da cabeça. Salte de novo voltando à posição inicial. Mantenha um ritmo constante e a respiração fluida.",
  },
  {
    name: "Joelhos altos",
    group: "cardio",
    icon: "speedometer",
    instruction:
      "Corra sem sair do lugar elevando os joelhos até a altura do quadril, o mais rápido que conseguir com controle. Mantenha o abdômen contraído, o tronco ereto e use os braços para acompanhar o movimento.",
  },
  {
    name: "Escalador",
    group: "cardio",
    icon: "speedometer",
    instruction:
      "Na posição de prancha alta, mãos sob os ombros. Traga um joelho em direção ao peito e volte, alternando as pernas rapidamente como se estivesse escalando. Mantenha o quadril baixo e o abdômen firme.",
  },
  {
    name: "Chute no bumbum",
    group: "cardio",
    icon: "walk",
    instruction:
      "Corra no lugar levando os calcanhares em direção aos glúteos, alternando as pernas. Mantenha o tronco ereto, os joelhos apontando para baixo e um ritmo ágil e constante.",
  },

  // ── Inferior (pernas/glúteos) ────────────────────────────────
  {
    name: "Agachamento livre",
    group: "inferior",
    icon: "fitness",
    instruction:
      "Pés na largura dos ombros, pontas levemente para fora. Desça empurrando o quadril para trás, como se fosse sentar, até as coxas ficarem paralelas ao chão. Mantenha o peito erguido e os joelhos alinhados aos pés. Suba contraindo os glúteos.",
  },
  {
    name: "Afundo alternado",
    group: "inferior",
    icon: "fitness",
    instruction:
      "Dê um passo à frente e dobre os dois joelhos até o de trás quase tocar o chão, formando 90°. O joelho da frente não deve passar da ponta do pé. Empurre de volta e alterne a perna a cada repetição.",
  },
  {
    name: "Ponte de glúteo",
    group: "inferior",
    icon: "body",
    instruction:
      "Deite de costas com os joelhos dobrados e os pés apoiados no chão. Eleve o quadril contraindo os glúteos até o corpo formar uma linha reta dos ombros aos joelhos. Segure um instante no topo e desça devagar.",
  },
  {
    name: "Agachamento sumô",
    group: "inferior",
    icon: "fitness",
    instruction:
      "Pés bem afastados e pontas viradas para fora. Desça o quadril mantendo o tronco ereto e os joelhos apontando na direção dos pés. Foque no interior das coxas e nos glúteos ao subir.",
  },

  // ── Superior (peito/braços) ──────────────────────────────────
  {
    name: "Flexão de braço",
    group: "superior",
    icon: "barbell",
    instruction:
      "Em prancha alta, mãos um pouco mais afastadas que os ombros. Desça o peito em direção ao chão dobrando os cotovelos a cerca de 45° do corpo. Empurre de volta mantendo o abdômen firme e o corpo alinhado.",
  },
  {
    name: "Flexão apoiada nos joelhos",
    group: "superior",
    icon: "barbell",
    instruction:
      "Versão mais leve da flexão: apoie os joelhos no chão mantendo o tronco reto dos joelhos à cabeça. Desça o peito controladamente e empurre de volta. Ótima para construir força no início.",
  },
  {
    name: "Mergulho de tríceps",
    group: "superior",
    icon: "barbell",
    instruction:
      "Sente na beira de uma cadeira ou banco e apoie as mãos na borda ao lado do quadril. Deslize o quadril para frente e desça dobrando os cotovelos para trás até cerca de 90°. Empurre de volta usando os tríceps.",
  },

  // ── Core (abdômen) ───────────────────────────────────────────
  {
    name: "Prancha",
    group: "core",
    icon: "body",
    instruction:
      "Apoie antebraços e pontas dos pés no chão, cotovelos sob os ombros. Mantenha o corpo numa linha reta da cabeça aos calcanhares, com abdômen e glúteos contraídos. Não deixe o quadril subir nem cair. Respire normalmente.",
  },
  {
    name: "Prancha lateral",
    group: "core",
    icon: "body",
    instruction:
      "Deite de lado apoiando um antebraço no chão, cotovelo sob o ombro. Eleve o quadril formando uma linha reta e sustente. Troque de lado na metade do tempo. Mantenha o abdômen firme o tempo todo.",
  },
  {
    name: "Abdominal",
    group: "core",
    icon: "body",
    instruction:
      "Deite de costas, joelhos dobrados e mãos atrás da cabeça sem puxar o pescoço. Contraia o abdômen elevando os ombros do chão em direção aos joelhos. Desça controladamente, sem relaxar totalmente embaixo.",
  },
  {
    name: "Elevação de pernas",
    group: "core",
    icon: "body",
    instruction:
      "Deite de costas com as pernas estendidas. Mantendo-as retas, eleve-as até formar 90° com o tronco e desça devagar sem tocar o chão. Mantenha a lombar apoiada e o abdômen contraído.",
  },

  // ── Alongamento (volta à calma) ──────────────────────────────
  {
    name: "Alongamento e respiração",
    group: "alongamento",
    icon: "leaf",
    instruction:
      "Reduza o ritmo. Alongue suavemente pernas, braços e costas, segurando cada posição por alguns segundos sem forçar. Respire fundo e devagar para o corpo se recuperar. Bom treino!",
  },
];

export const WORK_SEC = 60; // 1 minuto de exercício
export const REST_SEC = 60; // 1 minuto de descanso
export const WORK_BLOCK = 5; // descanso a cada 5 minutos de trabalho

// Ordem fixa de rotação dos grupos no bloco principal (linear e equilibrado):
// alterna cardio → inferior → superior → core para não fatigar o mesmo músculo.
const CYCLE: HiitGroup[] = ["cardio", "inferior", "superior", "core"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupExercises(): Record<HiitGroup, HiitExercise[]> {
  const map = {
    aquecimento: [],
    cardio: [],
    inferior: [],
    superior: [],
    core: [],
    alongamento: [],
  } as Record<HiitGroup, HiitExercise[]>;
  for (const ex of HIIT_POOL) map[ex.group].push(ex);
  // varia a ordem dentro de cada grupo, mas a ordem dos GRUPOS é fixa (linear)
  for (const g of Object.keys(map) as HiitGroup[]) map[g] = shuffle(map[g]);
  return map;
}

// Roteiro linear e exato: exatamente `durationMin` blocos de 1 minuto.
// [aquecimento] → rotação equilibrada (cardio/inferior/superior/core),
// com 1 min de descanso a cada 5 min de trabalho → [alongamento] no fim.
export function buildHiitScript(durationMin: number): HiitSegment[] {
  const byGroup = groupExercises();
  const pointers: Record<HiitGroup, number> = {
    aquecimento: 0,
    cardio: 0,
    inferior: 0,
    superior: 0,
    core: 0,
    alongamento: 0,
  };
  const nextFrom = (g: HiitGroup): HiitExercise => {
    const list = byGroup[g];
    const ex = list[pointers[g] % list.length];
    pointers[g]++;
    return ex;
  };

  const work = (ex: HiitExercise): HiitSegment => ({
    type: "work",
    durationSec: WORK_SEC,
    exercise: ex,
  });
  const rest = (): HiitSegment => ({ type: "rest", durationSec: REST_SEC });

  const total = durationMin; // nº de blocos de 1 minuto
  const segments: HiitSegment[] = [];
  let workStreak = 0;
  let cycleIdx = 0;

  for (let idx = 0; idx < total; idx++) {
    const isFirst = idx === 0;
    const isLast = idx === total - 1;

    if (isFirst) {
      segments.push(work(nextFrom("aquecimento")));
      workStreak = 1;
    } else if (isLast) {
      segments.push(work(nextFrom("alongamento")));
    } else if (workStreak === WORK_BLOCK) {
      segments.push(rest());
      workStreak = 0;
    } else {
      segments.push(work(nextFrom(CYCLE[cycleIdx % CYCLE.length])));
      cycleIdx++;
      workStreak++;
    }
  }

  return segments;
}

export function totalWorkMinutes(script: HiitSegment[]): number {
  return script.filter((s) => s.type === "work").length;
}
