import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { ConfirmModal } from "../../components/ConfirmModal";
import { createTrainerApi } from "./trainerService";
import { Student, getInitials } from "./trainerTypes";

interface Props {
  studentId: string;
  initialStudent?: Student;
  noticeMessage?: string | null;
  onClearNotice?: () => void;
  onBack: () => void;
  onPrescribe: (student: Student) => void;
  onDisconnected?: () => void;
}

type TabType = "plans" | "sessions" | "weight";

export const StudentDetailScreen = ({
  studentId,
  initialStudent,
  noticeMessage,
  onClearNotice,
  onBack,
  onPrescribe,
  onDisconnected,
}: Props) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const trainerApi = useMemo(() => createTrainerApi(request), [request]);

  const [student, setStudent] = useState<Student | null>(initialStudent ?? null);
  const [loading, setLoading] = useState(!initialStudent);
  const [error, setError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("plans");
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<{ id: number; name: string } | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const loadDetail = useCallback(async () => {
    setError(null);
    try {
      const fresh = await trainerApi.getStudentDetail(studentId);
      setStudent(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar ficha do aluno.");
    } finally {
      setLoading(false);
    }
  }, [studentId, trainerApi]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleConfirmDisconnect = async () => {
    if (!student) return;
    setDisconnecting(true);
    try {
      await trainerApi.disconnect(student.id);
      setShowDisconnectModal(false);
      onDisconnected?.();
    } catch (e) {
      setShowDisconnectModal(false);
      setError(e instanceof Error ? e.message : "Erro ao desvincular aluno.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!pendingDeletePlan) return;
    setDeletingPlan(true);
    setError(null);
    try {
      await trainerApi.deletePrescribedPlan(pendingDeletePlan.id);
      const removedName = pendingDeletePlan.name;
      setPendingDeletePlan(null);
      setLocalNotice(`Ficha "${removedName}" excluída com sucesso.`);
      await loadDetail();
    } catch (e) {
      setPendingDeletePlan(null);
      setError(e instanceof Error ? e.message : "Erro ao excluir ficha prescrita.");
    } finally {
      setDeletingPlan(false);
    }
  };

  const styles = createStyles(colors, isDark);

  if (loading && !student) {
    return (
      <View style={[styles.container, styles.centerBox, { paddingTop: insets.top + 8 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.emptyText, { marginTop: 12 }]}>Carregando ficha do aluno...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ficha do Aluno</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>{error || "Aluno não encontrado."}</Text>
          <TouchableOpacity style={styles.retryPill} onPress={loadDetail}>
            <Text style={styles.retryPillText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = getInitials(student.name, "AL");
  const deltaWeightNum = Number((student.currentWeightKg - student.startWeightKg).toFixed(1));
  const deltaWeight = deltaWeightNum.toFixed(1);
  const isLoss = deltaWeightNum < 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header com Botão Voltar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ficha do Aluno</Text>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => onPrescribe(student)}
          activeOpacity={0.7}
          accessibilityLabel="Prescrever novo treino"
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {!!(localNotice || noticeMessage) && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={styles.successBannerText}>{localNotice || noticeMessage}</Text>
            <TouchableOpacity
              onPress={() => {
                setLocalNotice(null);
                onClearNotice?.();
              }}
            >
              <Ionicons name="close" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Card do Perfil do Aluno */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: student.avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{student.name}</Text>
              <Text style={styles.email}>{student.email}</Text>
              <View style={styles.goalPill}>
                <Text style={styles.goalText}>{student.fitnessGoal}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.disconnectIconBtn}
              onPress={() => setShowDisconnectModal(true)}
              activeOpacity={0.7}
              accessibilityLabel="Desvincular aluno"
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>

          {/* Dados Físicos em Grid */}
          <View style={styles.bioGrid}>
            <View style={styles.bioItem}>
              <Text style={styles.bioVal}>{student.age > 0 ? `${student.age} anos` : "--"}</Text>
              <Text style={styles.bioLabel}>Idade</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={styles.bioVal}>{student.heightCm > 0 ? `${student.heightCm} cm` : "--"}</Text>
              <Text style={styles.bioLabel}>Altura</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={styles.bioVal}>{student.currentWeightKg > 0 ? `${student.currentWeightKg} kg` : "--"}</Text>
              <Text style={styles.bioLabel}>Peso Atual</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={[styles.bioVal, { color: isLoss ? colors.success : colors.info }]}>
                {deltaWeightNum === 0 ? "0.0" : isLoss ? deltaWeight : `+${deltaWeight}`} kg
              </Text>
              <Text style={styles.bioLabel}>Evolução</Text>
            </View>
          </View>

          {/* Hidratação & Consistência */}
          <View style={styles.extraStatsRow}>
            <View style={styles.extraStat}>
              <Ionicons name="water-outline" size={16} color={colors.info} style={{ marginRight: 6 }} />
              <Text style={styles.extraStatText}>
                Água hoje: <Text style={{ fontFamily: "Poppins_600SemiBold", color: colors.text.primary }}>{student.hydrationTodayMl}ml</Text> / {student.hydrationGoalMl}ml
              </Text>
            </View>
            <View style={styles.extraStat}>
              <Ionicons name="checkmark-done-circle-outline" size={16} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.extraStatText}>
                Frequência: <Text style={{ fontFamily: "Poppins_600SemiBold", color: colors.text.primary }}>{student.weeklyConsistency.attended}/{student.weeklyConsistency.target}x</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Segmented Control de Abas */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "plans" && styles.tabItemActive]}
            onPress={() => setActiveTab("plans")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="barbell-outline"
              size={15}
              color={activeTab === "plans" ? colors.primary : colors.text.tertiary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "plans" && styles.tabTextActive]}>
              Treinos ({student.plans.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "sessions" && styles.tabItemActive]}
            onPress={() => setActiveTab("sessions")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === "sessions" ? colors.primary : colors.text.tertiary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "sessions" && styles.tabTextActive]}>
              Histórico
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "weight" && styles.tabItemActive]}
            onPress={() => setActiveTab("weight")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="stats-chart-outline"
              size={15}
              color={activeTab === "weight" ? colors.primary : colors.text.tertiary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "weight" && styles.tabTextActive]}>
              Pesagens
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da Aba Selecionada */}
        {activeTab === "plans" && (
          <View style={styles.tabContent}>
            {student.plans.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhum treino prescrito para este aluno ainda.</Text>
              </View>
            ) : (
              student.plans.map((plan) => {
                const isExpanded = expandedPlanId === plan.id;

                return (
                  <View key={plan.id} style={styles.planCard}>
                    <View style={styles.planCardHeader}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                        onPress={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.planCategoryPill}>
                            <Text style={styles.planCategoryText}>{plan.category}</Text>
                          </View>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <Text style={styles.planMeta}>
                            {plan.exerciseCount} exercícios • ~{plan.estimatedMinutes} min • Atribuído em {plan.assignedAt}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={colors.text.tertiary}
                        />
                      </TouchableOpacity>
                      {!!plan.createdByTrainerId && plan.createdByTrainerId === user?.id && (
                        <TouchableOpacity
                          style={styles.deletePlanBtn}
                          onPress={() => setPendingDeletePlan({ id: plan.id, name: plan.name })}
                          activeOpacity={0.7}
                          accessibilityLabel={`Excluir ficha ${plan.name}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Exercícios Expandidos */}
                    {isExpanded && (
                      <View style={styles.exercisesList}>
                        <View style={styles.exerciseListHeader}>
                          <Text style={styles.exerciseListHeaderText}>EXERCÍCIO</Text>
                          <Text style={styles.exerciseListHeaderText}>SÉRIES × REPS</Text>
                        </View>

                        {plan.exercises.map((ex, idx) => (
                          <View key={idx} style={styles.exerciseRow}>
                            <View style={styles.exerciseLeft}>
                              <View style={styles.exerciseIndexBadge}>
                                <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.exerciseName}>{ex.name}</Text>
                                <Text style={styles.exerciseCategory}>{ex.category} • Descanso: {ex.restSeconds}s</Text>
                              </View>
                            </View>
                            <Text style={styles.exerciseSetsReps}>
                              {ex.sets} × {ex.reps}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={styles.addPlanDashedBtn}
              onPress={() => onPrescribe(student)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.addPlanDashedText}>Prescrever Novo Treino para {student.name.split(" ")[0]}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "sessions" && (
          <View style={styles.tabContent}>
            {student.recentSessions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhuma sessão concluída registrada ainda.</Text>
              </View>
            ) : (
              student.recentSessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionTop}>
                    <View style={styles.sessionIconWrap}>
                      <Ionicons name="checkmark-done" size={16} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionPlanName}>{session.planName}</Text>
                      <Text style={styles.sessionDate}>{session.finishedAt}</Text>
                    </View>
                    <View style={styles.sessionBadge}>
                      <Ionicons name="stopwatch-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.sessionCalories}>{session.durationMinutes} min</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "weight" && (
          <View style={styles.tabContent}>
            <View style={styles.weightSummaryCard}>
              <View style={styles.weightSummaryCol}>
                <Text style={styles.weightSummaryVal}>{student.startWeightKg > 0 ? `${student.startWeightKg} kg` : "--"}</Text>
                <Text style={styles.weightSummaryLabel}>Inicial</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.text.tertiary} />
              <View style={styles.weightSummaryCol}>
                <Text style={[styles.weightSummaryVal, { color: colors.primary }]}>{student.currentWeightKg > 0 ? `${student.currentWeightKg} kg` : "--"}</Text>
                <Text style={styles.weightSummaryLabel}>Atual</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.text.tertiary} />
              <View style={styles.weightSummaryCol}>
                <Text style={[styles.weightSummaryVal, { color: colors.success }]}>
                  {student.targetWeightKg != null ? `${student.targetWeightKg} kg` : "--"}
                </Text>
                <Text style={styles.weightSummaryLabel}>Meta</Text>
              </View>
            </View>

            <Text style={styles.timelineTitle}>Linha do Tempo de Pesagens</Text>
            {student.weightHistory.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhuma pesagem registrada pelo aluno.</Text>
              </View>
            ) : (
              student.weightHistory.map((item, index) => (
                <View key={index} style={styles.weightRow}>
                  <View style={styles.weightDateCol}>
                    <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} style={{ marginRight: 6 }} />
                    <Text style={styles.weightDateText}>{item.date}</Text>
                  </View>
                  <View>
                    <Text style={styles.weightValText}>{item.weightKg} kg</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Botão Fixo de Ação no Rodapé */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={styles.prescribeFooterBtn}
          onPress={() => onPrescribe(student)}
          activeOpacity={0.85}
        >
          <Ionicons name="barbell-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.prescribeFooterText}>Prescrever Novo Treino</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showDisconnectModal}
        title="Desvincular aluno?"
        message={`Você deseja encerrar o acompanhamento de ${student.name}? Os treinos já prescritos continuarão salvos no histórico do aluno.`}
        cancelLabel="Manter"
        confirmLabel="Desvincular"
        destructive
        loading={disconnecting}
        onCancel={() => setShowDisconnectModal(false)}
        onConfirm={handleConfirmDisconnect}
      />

      <ConfirmModal
        visible={!!pendingDeletePlan}
        title="Excluir ficha prescrita?"
        message={`Deseja excluir "${pendingDeletePlan?.name ?? ""}" do aluno? O histórico de sessões já realizadas será preservado.`}
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        destructive
        loading={deletingPlan}
        onCancel={() => setPendingDeletePlan(null)}
        onConfirm={handleConfirmDeletePlan}
      />
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 17,
      color: colors.text.primary,
    },
    headerActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    profileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 16,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
    },
    name: {
      fontFamily: "Poppins_700Bold",
      fontSize: 17,
      color: colors.text.primary,
    },
    email: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    goalPill: {
      backgroundColor: isDark ? colors.surfaceVariant : "#FFF7ED",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    goalText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.primary,
    },
    bioGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: isDark ? colors.surfaceVariant : "#F8FAFC",
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      marginBottom: 14,
    },
    bioItem: {
      alignItems: "center",
      flex: 1,
    },
    bioVal: {
      fontFamily: "Poppins_700Bold",
      fontSize: 14,
      color: colors.text.primary,
    },
    bioLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    extraStatsRow: {
      gap: 8,
    },
    extraStat: {
      flexDirection: "row",
      alignItems: "center",
    },
    extraStatText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      marginBottom: 16,
    },
    tabItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 38,
      borderRadius: 10,
    },
    tabItemActive: {
      backgroundColor: isDark ? colors.surfaceVariant : "#FFF7ED",
    },
    tabText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    tabTextActive: {
      fontFamily: "Poppins_600SemiBold",
      color: colors.primary,
    },
    tabContent: {
      gap: 12,
    },
    planCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    planCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 10,
    },
    deletePlanBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
    },
    planCategoryPill: {
      backgroundColor: isDark ? colors.surfaceVariant : "#F1F5F9",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: "flex-start",
      marginBottom: 6,
    },
    planCategoryText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 10,
      color: colors.text.secondary,
    },
    planName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
      marginBottom: 2,
    },
    planMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
    },
    exercisesList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: isDark ? colors.surfaceVariant : "#F8FAFC",
      padding: 14,
    },
    exerciseListHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    exerciseListHeaderText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 10,
      color: colors.text.tertiary,
      letterSpacing: 0.5,
    },
    exerciseRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    exerciseLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    exerciseIndexBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    exerciseIndexText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 11,
      color: colors.text.secondary,
    },
    exerciseName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.primary,
    },
    exerciseCategory: {
      fontFamily: "Poppins_400Regular",
      fontSize: 10,
      color: colors.text.tertiary,
    },
    exerciseSetsReps: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
    addPlanDashedBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: "dashed",
      backgroundColor: isDark ? colors.surface : "#FFFBF7",
      marginTop: 4,
    },
    addPlanDashedText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    sessionTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    sessionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.successLight,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionPlanName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
    },
    sessionDate: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
    },
    sessionBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    sessionCalories: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: colors.primary,
    },
    sessionBottom: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    sessionDuration: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.secondary,
    },
    weightSummaryCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    weightSummaryCol: {
      alignItems: "center",
    },
    weightSummaryVal: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
    },
    weightSummaryLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    timelineTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: 8,
    },
    weightRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    weightDateCol: {
      flexDirection: "row",
      alignItems: "center",
    },
    weightDateText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
    },
    weightValText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
    },
    footerBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    prescribeFooterBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    prescribeFooterText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
    centerBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    retryPill: {
      marginTop: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryPillText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: "#FFFFFF",
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.successLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.success + "40",
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    successBannerText: {
      flex: 1,
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.success,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEF2F2",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error + "40",
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.error,
    },
    disconnectIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.error + "30",
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    emptyBox: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
    },
    emptyText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: "center",
    },
  });
