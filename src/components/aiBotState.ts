export type AiBotState = "idle" | "thinking" | "happy";

export interface PreparingStage {
  state: AiBotState;
  message: string;
  sub: string;
}

export const GAZE_STEPS = [-3.5, 0, 3.5, 0] as const;

export function getPreparingStage(progressRatio: number): PreparingStage {
  if (progressRatio < 0.38) {
    return {
      state: "thinking",
      message: "Analisando seu perfil e objetivo...",
      sub: "O BodySync AI está calibrando volume e intensidade",
    };
  }
  if (progressRatio < 0.78) {
    return {
      state: "thinking",
      message: "Selecionando os melhores exercícios...",
      sub: "Combinando grupos musculares para sua rotina",
    };
  }
  return {
    state: "happy",
    message: "Ajustando séries e finalizando seu treino!",
    sub: "Tudo pronto para você começar",
  };
}
