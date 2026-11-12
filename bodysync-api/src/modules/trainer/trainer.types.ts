// bodysync-api/src/modules/trainer/trainer.types.ts

export interface TrainerStudentSummary {
  id: string
  studentId: string
  name: string
  email: string
  fitnessGoal: string
  weightKg: number
  heightCm: number
  gender: string
  lastWorkoutDate: string | null
  lastWorkoutStatus: 'today' | 'yesterday' | 'warning' | 'recent'
  weeklyConsistency: {
    attended: number
    target: number
  }
  joinedAt: string
}

export interface WeightLogEntry {
  id: string
  weightKg: number
  measuredAt: string
}

export interface SessionHistoryEntry {
  id: number
  planName: string
  finishedAt: string
  durationMinutes: number
}

export interface PrescribedPlanEntry {
  id: number
  name: string
  createdAt: string
  createdByTrainerId?: string | null
  exerciseCount: number
  exercises: {
    id: number
    exerciseId: number
    name: string
    category: string
    sets: number
    reps: number
    orderIndex: number
    restSeconds: number
  }[]
}

export interface StudentEvaluationEntry {
  id: string
  trainerId: string
  trainerName: string
  studentId: string
  evaluatedAt: string
  rating: number
  notes: string
  weightKg: number | null
  bodyFatPct: number | null
  chestCm: number | null
  waistCm: number | null
  armCm: number | null
  thighCm: number | null
  createdAt: string
}

export interface CreateEvaluationInput {
  studentId: string
  evaluatedAt?: string
  rating: number
  notes: string
  weightKg?: number | null
  bodyFatPct?: number | null
  chestCm?: number | null
  waistCm?: number | null
  armCm?: number | null
  thighCm?: number | null
}

export interface TrainerStudentDetail extends TrainerStudentSummary {
  age: number
  startWeightKg: number
  targetWeightKg: number | null
  deltaWeightKg: number
  hydrationTodayMl: number
  hydrationGoalMl: number
  weightHistory: WeightLogEntry[]
  recentSessions: SessionHistoryEntry[]
  prescribedPlans: PrescribedPlanEntry[]
  evaluations: StudentEvaluationEntry[]
}

export interface PrescribeExerciseInput {
  exerciseId: number
  sets: number
  reps: number
  restSeconds?: number
}

export interface PrescribeWorkoutInput {
  studentId: string
  name: string
  exercises: PrescribeExerciseInput[]
}

export interface AttentionStudent {
  studentId: string
  name: string
  daysInactive: number
  neverTrained?: boolean
}

export interface StudentRankItem {
  studentId: string
  name: string
  attended: number
  target: number
  percentage: number
}

export interface TrainerAnalytics {
  activeStudentsCount: number
  weeklyAttendanceRate: number
  trainedTodayCount: number
  totalPrescriptions: number
  weeklyWorkoutsCount: number
  avgWorkoutDurationMinutes: number
  waterComplianceRate: number
  attentionStudents: AttentionStudent[]
  ranking: StudentRankItem[]
}

export interface TrainerProfileResponse {
  trainerId: string
  name: string
  email: string
  inviteCode: string
  activeStudentsCount: number
  totalPrescriptions: number
}

export interface TrainerLookupResponse {
  trainerId: string
  name: string
  inviteCode: string
}

export interface MyTrainerResponse {
  connected: boolean
  trainer: {
    trainerId: string
    name: string
    email: string
    inviteCode: string | null
    connectedAt: string
  } | null
}
