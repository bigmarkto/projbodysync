// src/screens/Trainer/trainerService.ts
import {
  Student,
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

export type {
  Student,
  TrainerAnalyticsData,
  TrainerProfileData,
  TrainerLookupData,
  MyTrainerData,
};

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
      category: "Prescrito",
      exerciseCount: p.exerciseCount ?? p.exercises?.length ?? 0,
      estimatedMinutes: Math.max(20, (p.exerciseCount ?? p.exercises?.length ?? 0) * 8),
      assignedAt: p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("pt-BR")
        : "Hoje",
      exercises: (p.exercises || []).map((e: any) => ({
        name: e.name,
        category: "Exercício",
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds || 60,
      })),
    })),
    recentSessions: (apiStudent.recentSessions || []).map((s: any) => ({
      id: s.id,
      planName: s.planName || "Treino Concluído",
      finishedAt: formatDateLabel(s.finishedAt),
      durationMinutes: Number(s.durationMinutes) || 0,
    })),
    weightHistory: (apiStudent.weightHistory || []).map((w: any) => ({
      date: new Date(w.measuredAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      weightKg: Number(w.weightKg),
    })),
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

  async getExercises() {
    const res = await request("/exercises");
    const data = await parseJsonOrThrow<any>(
      res,
      "Não foi possível carregar o catálogo de exercícios."
    );
    return Array.isArray(data) ? data : data.exercises || [];
  },
});
