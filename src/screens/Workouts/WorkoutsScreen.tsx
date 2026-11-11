import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { useTabFocus } from "../../context/TabFocusContext";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  EditablePlan,
  PlanDetail,
  PlanDraft,
  PlanMeta,
  PlanSummary,
} from "./types";
import PlanEditor from "./PlanEditor";
import PlanDetailView from "./PlanDetail";
import PreparingScreen from "./PreparingScreen";
import WorkoutPlayer from "./WorkoutPlayer";
import HiitSetup from "./HiitSetup";
import HiitPlayer from "./HiitPlayer";
import { HiitSegment } from "./hiit";

const SUB_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  premium: "Premium",
};

const WorkoutsScreen = () => {
  const { colors, isDark } = useTheme();
  const { focusTick } = useTabFocus("workouts");
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditablePlan | null>(null);
  const [detailPlan, setDetailPlan] = useState<PlanDetail | null>(null);
  const [runningPlan, setRunningPlan] = useState<PlanDetail | null>(null);
  const [hiitSetup, setHiitSetup] = useState(false);
  const [hiitScript, setHiitScript] = useState<HiitSegment[] | null>(null);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<PlanSummary | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  // Geração de plano por IA (tela de carregamento animada)
  const [genPreparing, setGenPreparing] = useState(false);
  const [genDraft, setGenDraft] = useState<PlanDraft | null>(null);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genMinElapsed, setGenMinElapsed] = useState(false);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const res = await request("/workouts");
      if (!res.ok) throw new Error("Não foi possível carregar seus planos.");
      const data = await res.json();
      setPlans(data.plans ?? []);
      setMeta(data.meta ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar planos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (focusTick > 0) loadList();
  }, [focusTick, loadList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadList();
  }, [loadList]);

  const onGenerate = useCallback(async () => {
    if (genPreparing) return;
    setError(null);
    setGenErr(null);
    setGenDraft(null);
    setGenMinElapsed(false);
    setGenPreparing(true);

    request("/workouts/generate", { method: "POST" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data.error || "Não foi possível gerar o plano.");
        setGenDraft(data.draft as PlanDraft);
      })
      .catch((e) =>
        setGenErr(e instanceof Error ? e.message : "Erro ao gerar o plano."),
      );
  }, [genPreparing, request]);

  useEffect(() => {
    if (!genPreparing || !genMinElapsed) return;
    if (genErr) {
      setGenPreparing(false);
      setError(genErr);
      return;
    }
    if (genDraft) {
      setGenPreparing(false);
      setEditing({ id: null, name: genDraft.name, exercises: genDraft.exercises });
    }
  }, [genPreparing, genMinElapsed, genErr, genDraft]);

  const onCreateManual = useCallback(() => {
    setEditing({ id: null, name: "", exercises: [] });
  }, []);

  const recordSession = useCallback(
    async (planId: number | null, startedAt: string) => {
      try {
        await request("/sessions", {
          method: "POST",
          body: JSON.stringify({
            planId,
            startedAt,
            finishedAt: new Date().toISOString(),
          }),
        });
      } catch {
        /* não bloqueia a experiência do usuário */
      }
    },
    [request],
  );

  const onOpenPlan = useCallback(
    async (id: number) => {
      try {
        const res = await request(`/workouts/${id}`);
        if (!res.ok) throw new Error("Não foi possível abrir o plano.");
        const data = await res.json();
        setDetailPlan(data.plan as PlanDetail);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao abrir o plano.");
      }
    },
    [request],
  );

  const onStartPlan = useCallback((plan: PlanDetail) => {
    setDetailPlan(null);
    setRunningPlan(plan);
  }, []);

  const onStartHiit = useCallback((script: HiitSegment[]) => {
    setHiitSetup(false);
    setHiitScript(script);
  }, []);

  const onDelete = useCallback((plan: PlanSummary) => {
    setPendingDeletePlan(plan);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeletePlan) return;
    setDeletingPlan(true);
    try {
      const res = await request(`/workouts/${pendingDeletePlan.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error();
      setPendingDeletePlan(null);
      loadList();
    } catch {
      setPendingDeletePlan(null);
      setError("Não foi possível excluir o plano.");
    } finally {
      setDeletingPlan(false);
    }
  }, [pendingDeletePlan, request, loadList]);

  if (editing) {
    return (
      <PlanEditor
        initial={editing}
        onSaved={() => {
          setEditing(null);
          loadList();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  if (genPreparing) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setGenPreparing(false)}>
        <SafeAreaProvider>
          <PreparingScreen
            message="Estamos preparando seu plano..."
            icon="barbell"
            onDone={() => setGenMinElapsed(true)}
          />
        </SafeAreaProvider>
      </Modal>
    );
  }

  if (runningPlan) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setRunningPlan(null)}>
        <SafeAreaProvider>
          <WorkoutPlayer
            plan={runningPlan}
            onExit={() => setRunningPlan(null)}
            onCompleted={(startedAt) => recordSession(runningPlan.id, startedAt)}
          />
        </SafeAreaProvider>
      </Modal>
    );
  }

  if (hiitScript) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setHiitScript(null)}>
        <SafeAreaProvider>
          <HiitPlayer
            script={hiitScript}
            onExit={() => setHiitScript(null)}
            onCompleted={(startedAt) => recordSession(null, startedAt)}
          />
        </SafeAreaProvider>
      </Modal>
    );
  }

  if (hiitSetup) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => setHiitSetup(false)}>
        <SafeAreaProvider>
          <HiitSetup onStart={onStartHiit} onBack={() => setHiitSetup(false)} />
        </SafeAreaProvider>
      </Modal>
    );
  }

  if (detailPlan) {
    return (
      <PlanDetailView
        plan={detailPlan}
        onStart={() => onStartPlan(detailPlan)}
        onEdit={
          detailPlan.createdByTrainerId
            ? undefined
            : () => {
                setEditing({
                  id: detailPlan.id,
                  name: detailPlan.name,
                  exercises: detailPlan.exercises,
                });
                setDetailPlan(null);
              }
        }
        onBack={() => setDetailPlan(null)}
      />
    );
  }

  const limitText =
    meta == null
      ? ""
      : meta.limit === null
        ? "planos ilimitados"
        : `${meta.used}/${meta.limit} planos`;

  const canCreate = meta?.canCreate ?? false;

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Treinos & Planos</Text>
          {meta && (
            <View style={styles.subBadge}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.subBadgeText}>
                {SUB_LABELS[meta.subscriptionType] ?? meta.subscriptionType}
              </Text>
            </View>
          )}
        </View>
        {!!limitText && <Text style={styles.limitText}>{limitText}</Text>}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Ações de criação */}
          {canCreate ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={onGenerate}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.aiBtnText}>Gerar plano com IA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manualBtn} onPress={onCreateManual} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.manualBtnText}>Criar plano manual</Text>
              </TouchableOpacity>
            </View>
          ) : (
            !!meta?.reason && (
              <View style={styles.lockBox}>
                <Ionicons name="lock-closed" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                <Text style={styles.lockText}>{meta.reason}</Text>
              </View>
            )
          )}

          {/* Cardio HIIT — disponível para todos */}
          <TouchableOpacity
            style={styles.hiitCard}
            onPress={() => setHiitSetup(true)}
            activeOpacity={0.85}
          >
            <View style={styles.hiitIcon}>
              <Ionicons name="flame" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.hiitBadgeRow}>
                <Text style={styles.hiitTitle}>Cardio HIIT</Text>
                <View style={styles.cardioPill}>
                  <Text style={styles.cardioPillText}>Livre</Text>
                </View>
              </View>
              <Text style={styles.hiitSub}>
                Treino por intervalos de 10 a 30 min sem equipamento
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Seus Planos de Musculação</Text>
            <Text style={styles.sectionCount}>{plans.length}</Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Lista de planos */}
          {plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={44} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Nenhum plano ainda</Text>
              {canCreate && (
                <Text style={styles.emptySub}>
                  Gere um plano com IA ou crie seu próprio treino personalizado.
                </Text>
              )}
            </View>
          ) : (
            plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => onOpenPlan(plan.id)}
                activeOpacity={0.8}
              >
                <View style={styles.planIcon}>
                  <Ionicons name="barbell" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.planName} numberOfLines={1}>
                      {plan.name}
                    </Text>
                    {!!plan.createdByTrainerId && (
                      <View style={styles.trainerPrescribedBadge}>
                        <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.trainerPrescribedText}>Personal</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planMeta}>
                    {plan.exerciseCount}{" "}
                    {plan.exerciseCount === 1 ? "exercício" : "exercícios"}
                  </Text>
                </View>
                {!plan.createdByTrainerId && (
                  <TouchableOpacity
                    onPress={() => onDelete(plan)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.trashBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <ConfirmModal
        visible={!!pendingDeletePlan}
        title="Excluir plano"
        message={`Deseja realmente excluir "${pendingDeletePlan?.name ?? ""}"?`}
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        destructive
        loading={deletingPlan}
        onCancel={() => setPendingDeletePlan(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
};

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    content: { padding: 18 },

    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 24,
      color: colors.text.primary,
    },
    subBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 4,
    },
    subBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
    limitText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 4,
    },

    actions: { marginBottom: 18 },
    aiBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      marginBottom: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    aiBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
      marginLeft: 8,
    },
    manualBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    manualBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
      marginLeft: 6,
    },

    hiitCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    hiitIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    hiitBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    hiitTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.text.primary,
    },
    cardioPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.successLight,
    },
    cardioPillText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: colors.success,
    },
    hiitSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    sectionLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    sectionCount: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.tertiary,
    },

    lockBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.warningLight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.warning + "40",
      padding: 14,
      marginBottom: 18,
    },
    lockText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginBottom: 12,
    },

    emptyState: { alignItems: "center", paddingVertical: 48 },
    emptyTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.text.primary,
      marginTop: 12,
    },
    emptySub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.tertiary,
      marginTop: 4,
      textAlign: "center",
    },

    planCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    planIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    planName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    trainerPrescribedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    trainerPrescribedText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 9,
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    planMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    trashBtn: {
      padding: 6,
      borderRadius: 8,
    },
  });

export default WorkoutsScreen;