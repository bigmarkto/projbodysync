import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";

// ─── Tipos (espelham a API) ───────────────────────────────────────────────────
interface ProgressSummary {
  current: number | null;
  start: number | null;
  goal: number | null;
  deltaFromStart: number | null;
  remainingToGoal: number | null;
  progressPct: number | null;
}

interface DayStat {
  label: string;
  scheduled: boolean;
  done: boolean;
  missed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface WorkoutStats {
  total: number;
  thisWeek: number;
  streak: number;
  avgDurationMin: number | null;
  adherencePct: number | null;
  scheduledPerWeek: number;
  week: DayStat[];
}

const parseNum = (v: string): number | null => {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
};

const ProgressScreen = () => {
  const { colors } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weightInput, setWeightInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sumRes, statsRes] = await Promise.all([
        request("/measurements/summary"),
        request("/sessions/stats"),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar progresso.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const saveWeight = useCallback(async () => {
    const weightKg = parseNum(weightInput);
    if (weightKg == null || weightKg <= 0) {
      setError("Informe um peso válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await request("/measurements", {
        method: "POST",
        body: JSON.stringify({ weightKg }),
      });
      if (!res.ok) throw new Error("Não foi possível registrar o peso.");
      setWeightInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar peso.");
    } finally {
      setSaving(false);
    }
  }, [weightInput, request, load]);

  const saveGoal = useCallback(async () => {
    const desiredWeightKg = parseNum(goalInput);
    if (desiredWeightKg == null || desiredWeightKg <= 0) {
      setError("Informe uma meta válida.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await request("/measurements/goal", {
        method: "PUT",
        body: JSON.stringify({ desiredWeightKg }),
      });
      if (!res.ok) throw new Error("Não foi possível salvar a meta.");
      setSummary(await res.json());
      setEditingGoal(false);
      setGoalInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar a meta.");
    } finally {
      setSaving(false);
    }
  }, [goalInput, request]);

  const missedThisWeek = stats?.week.filter((d) => d.missed).length ?? 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Progresso</Text>
        <Text style={styles.headerSub}>Acompanhe seus ganhos e treinos</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* ─── Meta de peso ──────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="flag-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.cardTitle}>Meta de peso</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingGoal((v) => !v);
                  setGoalInput(summary?.goal != null ? String(summary.goal) : "");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weightRow}>
              <View style={styles.weightBox}>
                <Text style={styles.weightValue}>
                  {summary?.current != null ? summary.current : "—"}
                  <Text style={styles.weightUnit}> kg</Text>
                </Text>
                <Text style={styles.weightLabel}>Atual</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.text.tertiary} />
              <View style={styles.weightBox}>
                <Text style={[styles.weightValue, { color: colors.success }]}>
                  {summary?.goal != null ? summary.goal : "—"}
                  <Text style={styles.weightUnit}> kg</Text>
                </Text>
                <Text style={styles.weightLabel}>Meta</Text>
              </View>
            </View>

            {summary?.progressPct != null && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${summary.progressPct}%` }]} />
                </View>
                <Text style={styles.progressPct}>{summary.progressPct}% rumo à meta</Text>
              </>
            )}

            {summary?.remainingToGoal != null && summary.goal != null && (
              <Text style={styles.remaining}>
                {Math.abs(summary.remainingToGoal) < 0.1
                  ? "Meta atingida! 🎉"
                  : summary.remainingToGoal > 0
                    ? `Faltam ${summary.remainingToGoal.toFixed(1)} kg para perder`
                    : `Faltam ${Math.abs(summary.remainingToGoal).toFixed(1)} kg para ganhar`}
              </Text>
            )}

            {editingGoal && (
              <View style={styles.inlineForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Meta em kg"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  value={goalInput}
                  onChangeText={setGoalInput}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.disabled]}
                  onPress={saveGoal}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ─── Registrar peso ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="add-circle-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.cardTitle}>Registrar peso de hoje</Text>
            </View>
            <View style={styles.inlineForm}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 74.5"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabled]}
                onPress={saveWeight}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>Registrar</Text>
              </TouchableOpacity>
            </View>
            {summary?.deltaFromStart != null && summary.deltaFromStart !== 0 && (
              <Text style={styles.delta}>
                {summary.deltaFromStart < 0 ? "▼" : "▲"}{" "}
                {Math.abs(summary.deltaFromStart).toFixed(1)} kg desde o início
              </Text>
            )}
          </View>

          {/* ─── Estatísticas de treino ────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.cardTitle}>Estatísticas de treino</Text>
            </View>

            <View style={styles.statsGrid}>
              <StatTile styles={styles} value={String(stats?.total ?? 0)} label="Treinos totais" />
              <StatTile styles={styles} value={String(stats?.thisWeek ?? 0)} label="Nesta semana" />
              <StatTile
                styles={styles}
                value={`${stats?.streak ?? 0}`}
                label="Sequência"
                highlight={(stats?.streak ?? 0) > 0}
              />
              <StatTile
                styles={styles}
                value={stats?.avgDurationMin != null ? `${stats.avgDurationMin} min` : "—"}
                label="Duração média"
              />
            </View>

            {stats?.adherencePct != null && (
              <View style={styles.adherenceBox}>
                <Text style={styles.adherenceLabel}>Aderência (30 dias)</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${stats.adherencePct}%`,
                        backgroundColor:
                          stats.adherencePct >= 70 ? colors.success : colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.adherencePct}>
                  {stats.adherencePct}% dos treinos agendados cumpridos
                </Text>
              </View>
            )}

            {/* Semana: feitos vs faltas */}
            {stats && (
              <>
                <Text style={styles.weekTitle}>Semana atual</Text>
                <View style={styles.weekRow}>
                  {stats.week.map((day, i) => {
                    const state = day.done
                      ? "done"
                      : day.missed
                        ? "missed"
                        : day.scheduled
                          ? "scheduled"
                          : "off";
                    return (
                      <View key={i} style={styles.dayCol}>
                        <Text style={styles.dayLabel}>{day.label}</Text>
                        <View
                          style={[
                            styles.dayDot,
                            state === "done" && styles.dayDone,
                            state === "missed" && styles.dayMissed,
                            state === "scheduled" && styles.dayScheduled,
                            day.isToday && styles.dayToday,
                          ]}
                        >
                          {state === "done" && (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          )}
                          {state === "missed" && (
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.missedText}>
                  {missedThisWeek === 0
                    ? "Nenhuma falta esta semana. Continue assim! 💪"
                    : `Você faltou ${missedThisWeek} ${missedThisWeek === 1 ? "treino" : "treinos"} esta semana`}
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// ─── Stat tile ────────────────────────────────────────────────────────────────
interface StatTileProps {
  styles: ReturnType<typeof createStyles>;
  value: string;
  label: string;
  highlight?: boolean;
}
const StatTile = ({ styles, value, label, highlight }: StatTileProps) => (
  <View style={styles.statTile}>
    <Text style={[styles.statValue, highlight && styles.statValueHi]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16 },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 22, color: "#FFFFFF" },
    headerSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: "rgba(255,255,255,0.9)",
      marginTop: 2,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    cardTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
      marginLeft: 8,
    },

    weightRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      marginBottom: 16,
    },
    weightBox: { alignItems: "center" },
    weightValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: colors.text.primary,
    },
    weightUnit: {
      fontFamily: "Poppins_500Medium",
      fontSize: 15,
      color: colors.text.tertiary,
    },
    weightLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },

    progressTrack: {
      height: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      overflow: "hidden",
    },
    progressFill: { height: 8, borderRadius: 8, backgroundColor: colors.primary },
    progressPct: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 6,
      textAlign: "center",
    },
    remaining: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.primary,
      marginTop: 10,
      textAlign: "center",
    },

    inlineForm: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 10 },
    input: {
      flex: 1,
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontFamily: "Poppins_400Regular",
      fontSize: 15,
      color: colors.text.primary,
    },
    saveBtn: {
      height: 46,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFFFFF" },
    disabled: { opacity: 0.6 },
    delta: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 10,
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statTile: {
      width: "48%",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 10,
    },
    statValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 24,
      color: colors.text.primary,
    },
    statValueHi: { color: colors.primary },
    statLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },

    adherenceBox: { marginTop: 6, marginBottom: 6 },
    adherenceLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    adherencePct: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 6,
    },

    weekTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
      marginTop: 14,
      marginBottom: 12,
    },
    weekRow: { flexDirection: "row", justifyContent: "space-between" },
    dayCol: { alignItems: "center", flex: 1 },
    dayLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.text.tertiary,
      marginBottom: 8,
    },
    dayDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    dayDone: { backgroundColor: colors.success },
    dayMissed: { backgroundColor: colors.error },
    dayScheduled: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dayToday: { borderWidth: 2, borderColor: colors.text.primary },
    missedText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 12,
      textAlign: "center",
    },

    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginBottom: 12,
      textAlign: "center",
    },
  });

export default ProgressScreen;
