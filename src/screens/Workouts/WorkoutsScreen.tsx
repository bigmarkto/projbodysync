import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";
import {
  EditablePlan,
  PlanDetail,
  PlanDraft,
  PlanMeta,
  PlanSummary,
} from "./types";
import PlanEditor from "./PlanEditor";

const SUB_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  premium: "Premium",
};

const WorkoutsScreen = () => {
  const { colors } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [editing, setEditing] = useState<EditablePlan | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadList();
  }, [loadList]);

  // Gera rascunho com a "IA" e abre no editor
  const onGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await request("/workouts/generate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível gerar o plano.");
      const draft: PlanDraft = data.draft;
      setEditing({ id: null, name: draft.name, exercises: draft.exercises });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar o plano.");
    } finally {
      setGenerating(false);
    }
  }, [generating, request]);

  const onCreateManual = useCallback(() => {
    setEditing({ id: null, name: "", exercises: [] });
  }, []);

  const onOpenPlan = useCallback(
    async (id: number) => {
      try {
        const res = await request(`/workouts/${id}`);
        if (!res.ok) throw new Error("Não foi possível abrir o plano.");
        const data = await res.json();
        const plan: PlanDetail = data.plan;
        setEditing({ id: plan.id, name: plan.name, exercises: plan.exercises });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao abrir o plano.");
      }
    },
    [request],
  );

  const onDelete = useCallback(
    (plan: PlanSummary) => {
      Alert.alert("Excluir plano", `Excluir "${plan.name}"?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await request(`/workouts/${plan.id}`, { method: "DELETE" });
              if (!res.ok && res.status !== 204) throw new Error();
              loadList();
            } catch {
              setError("Não foi possível excluir o plano.");
            }
          },
        },
      ]);
    },
    [request, loadList],
  );

  // ─── Modo edição ────────────────────────────────────────────────────────────
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

  // ─── Cabeçalho ──────────────────────────────────────────────────────────────
  const renderHeader = () => {
    const limitText =
      meta == null
        ? ""
        : meta.limit === null
          ? "planos ilimitados"
          : `${meta.used}/${meta.limit} planos`;
    return (
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Meus planos</Text>
        {meta && (
          <View style={styles.subRow}>
            <View style={styles.subBadge}>
              <Ionicons name="star" size={12} color="#FFFFFF" />
              <Text style={styles.subBadgeText}>
                {SUB_LABELS[meta.subscriptionType] ?? meta.subscriptionType}
              </Text>
            </View>
            {!!limitText && <Text style={styles.limitText}>{limitText}</Text>}
          </View>
        )}
      </View>
    );
  };

  const canCreate = meta?.canCreate ?? false;

  return (
    <View style={styles.screen}>
      {renderHeader()}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Ações de criação */}
          {canCreate ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.aiBtn, generating && styles.disabled]}
                onPress={onGenerate}
                disabled={generating}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.aiBtnText}>Gerar plano com IA</Text>
                  </>
                )}
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

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Lista de planos */}
          {plans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Nenhum plano ainda</Text>
              {canCreate && (
                <Text style={styles.emptySub}>
                  Gere um plano com IA ou crie um do zero.
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
                  <Text style={styles.planName} numberOfLines={1}>
                    {plan.name}
                  </Text>
                  <Text style={styles.planMeta}>
                    {plan.exerciseCount}{" "}
                    {plan.exerciseCount === 1 ? "exercício" : "exercícios"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onDelete(plan)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    content: { padding: 16 },

    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: "#FFFFFF",
    },
    subRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    subBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.22)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    subBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: "#FFFFFF",
      marginLeft: 4,
    },
    limitText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: "rgba(255,255,255,0.9)",
      marginLeft: 10,
    },

    actions: { marginBottom: 18 },
    aiBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      marginBottom: 10,
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
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    manualBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.primary,
      marginLeft: 6,
    },
    disabled: { opacity: 0.7 },

    lockBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.warningLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.warning + "55",
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
    },

    planCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
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
    planMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 2,
    },
  });

export default WorkoutsScreen;
