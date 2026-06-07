import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "comum" | "personal";
export type SubscriptionType = "free" | "premium" | "basic" | "pro" | "custom";
export type Gender = "masculino" | "feminino" | "outro" | "nao_binario";
export type ExperienceLevel = "iniciante" | "intermediario" | "avancado";
export type Modality = "musculacao" | "calistenia";
// Para adicionar nova modalidade: inclua aqui e em MODALITIES_CONFIG em Step5Modalities

export interface RegisterData {
  // Etapa 1 — Dados pessoais
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthYear: string;
  gender: Gender | "";
  role: UserRole;

  // Etapa 2 — Plano
  subscriptionType: SubscriptionType | "";

  // Etapa 3 — Dados físicos (comum)
  weightKg: string;
  heightCm: string;
  desiredWeightKg: string;

  // Etapa 4 — Agenda e hidratação (comum)
  workoutDays: number[]; // 0=Dom … 6=Sáb
  workoutTime: string;
  hydrationReminder: boolean;
  hydrationTime: string;

  // Etapa 5 — Modalidades (comum)
  modalities: Modality[];

  // Etapa 6 — Frequência (comum)
  experienceLevel: ExperienceLevel | "";
}

const INITIAL: RegisterData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  birthYear: "",
  gender: "",
  role: "comum",
  subscriptionType: "",
  weightKg: "",
  heightCm: "",
  desiredWeightKg: "",
  workoutDays: [],
  workoutTime: "",
  hydrationReminder: false,
  hydrationTime: "",
  modalities: [],
  experienceLevel: "",
};

interface RegisterContextType {
  data: RegisterData;
  setField: <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => void;
  reset: () => void;
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

export const RegisterProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<RegisterData>(INITIAL);

  const setField = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setData(INITIAL);

  return (
    <RegisterContext.Provider value={{ data, setField, reset }}>
      {children}
    </RegisterContext.Provider>
  );
};

export const useRegister = () => {
  const ctx = useContext(RegisterContext);
  if (!ctx) throw new Error("useRegister must be used within RegisterProvider");
  return ctx;
};
