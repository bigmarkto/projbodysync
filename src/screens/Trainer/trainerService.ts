// src/screens/Trainer/trainerService.ts
import { Linking, Platform, Share } from "react-native";
import { formatDateBR } from "../../components/DateTimePickerField";
import {
  Student,
  StudentEvaluation,
  TrainerAnalyticsData,
  TrainerProfileData,
  TrainerLookupData,
  MyTrainerData,
} from "./trainerTypes";

export interface PrescribePayload {
  studentId: string;
  name: string;
  exercises: {
    exerciseId: number;
    sets: number;
    reps: number;
    restSeconds?: number;
  }[];
}

export interface CreateEvaluationPayload {
  evaluatedAt?: string;
  rating: number;
  notes: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export type {
  Student,
  StudentEvaluation,
  TrainerAnalyticsData,
  TrainerProfileData,
  TrainerLookupData,
  MyTrainerData,
};

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildInviteShareMessage(inviteCode: string): string {
  return `Olá! Conecte-se comigo no BodySync usando meu código de Personal Trainer: ${inviteCode}. Acesse Ajustes > Meu Personal Trainer para vincular!`;
}

export async function shareTrainerInvite(
  inviteCode: string
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (!inviteCode || inviteCode === "---") return "failed";
  const message = buildInviteShareMessage(inviteCode);

  try {
    const canNativeShare =
      Platform.OS !== "web" ||
      (typeof navigator !== "undefined" && typeof navigator.share === "function");

    if (canNativeShare) {
      const res = await Share.share({ title: "Convite BodySync", message });
      if (Platform.OS !== "web" && res.action === Share.dismissedAction) {
        return "cancelled";
      }
      return "shared";
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return "cancelled";
  }

  const copied = await copyToClipboard(message);
  return copied ? "copied" : "failed";
}

export function openWhatsAppInvite(inviteCode: string) {
  if (!inviteCode || inviteCode === "---") return;
  const message = buildInviteShareMessage(inviteCode);
  Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {});
}

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  ganho_peso: "Ganho de Peso",
  ganho_massa_muscular: "Hipertrofia",
  condicionamento_fisico: "Condicionamento Físico",
  saude_bem_estar: "Saúde e Bem-estar",
};

const AVATAR_COLORS = ["#F97316", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

function formatDateLabel(iso: string | null): string {
  if (!iso) return "Sem treino registrado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recente";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapApiEvaluation(e: any): StudentEvaluation {
  const numOrNull = (v: unknown) => (v != null ? Number(v) : null);
  return {
    id: String(e.id),
    trainerId: String(e.trainerId),
    trainerName: e.trainerName || "Personal Trainer",
    studentId: String(e.studentId),
    evaluatedAt: String(e.evaluatedAt),
    rating: Number(e.rating) || 5,
    notes: String(e.notes || ""),
    weightKg: numOrNull(e.weightKg),
    bodyFatPct: numOrNull(e.bodyFatPct),
    chestCm: numOrNull(e.chestCm),
    waistCm: numOrNull(e.waistCm),
    armCm: numOrNull(e.armCm),
    thighCm: numOrNull(e.thighCm),
    createdAt: String(e.createdAt || ""),
  };
}

function mapApiStudentToAppStudent(apiStudent: any): Student {
  const name = apiStudent.name || "Aluno";
  const colorIndex =
    Math.abs(
      name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
    ) % AVATAR_COLORS.length;

  const weightKg = Number(apiStudent.weightKg) || 0;

  return {
    id: apiStudent.studentId || apiStudent.id,
    name,
    email: apiStudent.email || "",
    avatarColor: AVATAR_COLORS[colorIndex],
    age: Number(apiStudent.age) || 0,
    heightCm: Number(apiStudent.heightCm) || 0,
    currentWeightKg: weightKg,
    startWeightKg:
      apiStudent.startWeightKg != null ? Number(apiStudent.startWeightKg) : weightKg,
    targetWeightKg:
      apiStudent.targetWeightKg != null ? Number(apiStudent.targetWeightKg) : null,
    fitnessGoal: GOAL_LABELS[apiStudent.fitnessGoal] || apiStudent.fitnessGoal || "Geral",
    experienceLevel: "Ativo",
    lastWorkoutDate: formatDateLabel(apiStudent.lastWorkoutDate),
    lastWorkoutStatus: apiStudent.lastWorkoutStatus || "warning",
    weeklyConsistency: {
      attended: apiStudent.weeklyConsistency?.attended || 0,
      target: Math.max(1, apiStudent.weeklyConsistency?.target || 5),
    },
    hydrationTodayMl: Number(apiStudent.hydrationTodayMl) || 0,
    hydrationGoalMl: Number(apiStudent.hydrationGoalMl) || 2000,
    plans: (apiStudent.prescribedPlans || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.createdByTrainerId ? "Prescrito" : "Aluno",
      createdByTrainerId: p.createdByTrainerId ?? null,
      exerciseCount: p.exerciseCount ?? p.exercises?.length ?? 0,
      estimatedMinutes: Math.max(20, (p.exerciseCount ?? p.exercises?.length ?? 0) * 8),
      assignedAt: p.createdAt
        ? formatDateBR(p.createdAt) || new Date(p.createdAt).toLocaleDateString("pt-BR")
        : "Hoje",
      exercises: (p.exercises || []).map((e: any) => ({
        name: e.name,
        category: e.category || "Geral",
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds ?? 60,
      })),
    })),
    recentSessions: (apiStudent.recentSessions || []).map((s: any) => ({
      id: s.id,
      planName: s.planName || "Treino Concluído",
      finishedAt: formatDateLabel(s.finishedAt),
      durationMinutes: Number(s.durationMinutes) || 0,
    })),
    weightHistory: (apiStudent.weightHistory || []).map((w: any) => ({
      date: formatDateBR(w.measuredAt, true) || "Recente",
      weightKg: Number(w.weightKg),
    })),
    evaluations: (apiStudent.evaluations || []).map(mapApiEvaluation),
  };
}

async function parseJsonOrThrow<T>(res: Response, fallbackMsg: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || fallbackMsg);
  }
  return data as T;
}

export const createTrainerApi = (
  request: (path: string, options?: RequestInit) => Promise<Response>
) => ({
  async getProfile(): Promise<TrainerProfileData> {
    const res = await request("/trainer/profile");
    return parseJsonOrThrow<TrainerProfileData>(
      res,
      "Não foi possível carregar o perfil do treinador."
    );
  },

  async listStudents(): Promise<Student[]> {
    const res = await request("/trainer/students");
    const data = await parseJsonOrThrow<{ students?: any[] }>(
      res,
      "Não foi possível carregar a lista de alunos."
    );
    return (data.students || []).map(mapApiStudentToAppStudent);
  },

  async getStudentDetail(studentId: string): Promise<Student> {
    const res = await request(`/trainer/students/${studentId}`);
    const data = await parseJsonOrThrow<any>(
      res,
      "Não foi possível carregar os detalhes do aluno."
    );
    return mapApiStudentToAppStudent(data);
  },

  async prescribeWorkout(payload: PrescribePayload) {
    const res = await request("/trainer/prescribe", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseJsonOrThrow<any>(res, "Não foi possível prescrever o treino.");
  },

  async getAnalytics(): Promise<TrainerAnalyticsData> {
    const res = await request("/trainer/analytics");
    return parseJsonOrThrow<TrainerAnalyticsData>(
      res,
      "Não foi possível carregar as métricas da consultoria."
    );
  },

  async lookupTrainer(inviteCode: string): Promise<TrainerLookupData> {
    const res = await request(`/trainer/lookup/${encodeURIComponent(inviteCode.trim())}`);
    return parseJsonOrThrow<TrainerLookupData>(res, "Código de treinador inválido.");
  },

  async getMyTrainer(): Promise<MyTrainerData> {
    const res = await request("/trainer/my-trainer");
    return parseJsonOrThrow<MyTrainerData>(
      res,
      "Não foi possível verificar seu vínculo atual."
    );
  },

  async connectStudent(inviteCode: string) {
    const res = await request("/trainer/connect", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
    return parseJsonOrThrow<{
      success: boolean;
      trainerId: string;
      trainerName: string;
      message: string;
    }>(res, "Código de treinador inválido.");
  },

  async disconnect(targetId: string) {
    const res = await request(`/trainer/students/${targetId}`, {
      method: "DELETE",
    });
    return parseJsonOrThrow<{ success: boolean; message: string }>(
      res,
      "Não foi possível desvincular."
    );
  },

  async deletePrescribedPlan(planId: number) {
    const res = await request(`/trainer/plans/${planId}`, {
      method: "DELETE",
    });
    return parseJsonOrThrow<{ success: boolean; message: string }>(
      res,
      "Não foi possível excluir a ficha prescrita."
    );
  },

  async createEvaluation(
    studentId: string,
    payload: CreateEvaluationPayload
  ): Promise<StudentEvaluation> {
    const res = await request(`/trainer/students/${studentId}/evaluations`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await parseJsonOrThrow<{ evaluation: any }>(
      res,
      "Não foi possível registrar a avaliação."
    );
    return mapApiEvaluation(data.evaluation);
  },

  async deleteEvaluation(evaluationId: string) {
    const res = await request(`/trainer/evaluations/${evaluationId}`, {
      method: "DELETE",
    });
    return parseJsonOrThrow<{ success: boolean; message: string }>(
      res,
      "Não foi possível excluir a avaliação."
    );
  },

  async getMyEvaluations(): Promise<StudentEvaluation[]> {
    const res = await request("/trainer/my-evaluations");
    const data = await parseJsonOrThrow<{ evaluations?: any[] }>(
      res,
      "Não foi possível carregar suas avaliações."
    );
    return (data.evaluations || []).map(mapApiEvaluation);
  },

  async getExerciseCategories(): Promise<string[]> {
    const res = await request("/exercises/categories");
    const data = await parseJsonOrThrow<{ categories?: string[] }>(
      res,
      "Não foi possível carregar as categorias."
    );
    return data.categories || [];
  },

  async getExercises(params?: {
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ exercises: any[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    qs.set("limit", String(params?.limit ?? 50));
    if (params?.offset) qs.set("offset", String(params.offset));
    const query = qs.toString();

    const res = await request(`/exercises${query ? `?${query}` : ""}`);
    const data = await parseJsonOrThrow<any>(
      res,
      "Não foi possível carregar o catálogo de exercícios."
    );
    const exercises = Array.isArray(data) ? data : data.exercises || [];
    const total = Number(data?.pagination?.total ?? exercises.length);
    return { exercises, total };
  },
});
