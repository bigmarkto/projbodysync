// src/screens/Trainer/trainerTypes.ts

export interface StudentWorkoutPlan {
  id: number;
  name: string;
  category: string;
  exerciseCount: number;
  estimatedMinutes: number;
  assignedAt: string;
  exercises: {
    name: string;
    category: string;
    sets: number;
    reps: number;
    restSeconds: number;
  }[];
}

export interface StudentHistorySession {
  id: number;
  planName: string;
  finishedAt: string;
  durationMinutes: number;
}

export interface StudentWeightLog {
  date: string;
  weightKg: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  startWeightKg: number;
  targetWeightKg: number | null;
  fitnessGoal: string;
  experienceLevel: string;
  lastWorkoutDate: string;
  lastWorkoutStatus: "today" | "yesterday" | "warning" | "recent";
  weeklyConsistency: {
    attended: number;
    target: number;
  };
  hydrationTodayMl: number;
  hydrationGoalMl: number;
  plans: StudentWorkoutPlan[];
  recentSessions: StudentHistorySession[];
  weightHistory: StudentWeightLog[];
}

export interface TrainerAnalyticsData {
  activeStudentsCount: number;
  weeklyAttendanceRate: number;
  trainedTodayCount: number;
  totalPrescriptions: number;
  weeklyWorkoutsCount: number;
  avgWorkoutDurationMinutes: number;
  waterComplianceRate: number;
  attentionStudents: {
    studentId: string;
    name: string;
    daysInactive: number;
  }[];
  ranking: {
    studentId: string;
    name: string;
    attended: number;
    target: number;
    percentage: number;
  }[];
}

export interface TrainerProfileData {
  trainerId: string;
  name: string;
  email: string;
  inviteCode: string;
  activeStudentsCount: number;
  totalPrescriptions: number;
}

export interface TrainerLookupData {
  trainerId: string;
  name: string;
  inviteCode: string;
}

export interface MyTrainerData {
  connected: boolean;
  trainer: {
    trainerId: string;
    name: string;
    email: string;
    inviteCode: string | null;
    connectedAt: string;
  } | null;
}

export const getInitials = (name?: string | null, fallback = "PT"): string => {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
