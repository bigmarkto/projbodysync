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
import { useTabFocus } from "../../context/TabFocusContext";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";

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
  const { colors, isDark } = useTheme();
  const { focusTick } = useTabFocus("progress");
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  }, [load]);

  useEffect(() => {
    if (focusTick > 0) load();
  }, [focusTick, load]);

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
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Evolução & Metas</Text>
        <Text style={styles.headerSub}>Acompanhe seu peso, consistência e métricas</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          {/* ─── Meta de peso ──────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="flag" size={16} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Meta de peso</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingGoal((v) => !v);
                  setGoalInput(summary?.goal != null ? String(summary.goal) : "");
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.editBtn}
              >
                <Ionicons name={editingGoal ? "close" : "create-outline"} size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weightRow}>
              <View style={styles.weightBox}>
                <Text style={styles.weightValue}>
                  {summary?.current != null ? summary.current : "—"}
                  <Text style={styles.weightUnit}> kg</Text>
                </Text>
                <Text style={styles.weightLabel}>Peso Atual</Text>
              </View>

              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={18} color={colors.text.tertiary} />
              </View>

              <View style={styles.weightBox}>
                <Text style={[styles.weightValue, { color: colors.success }]}>
                  {summary?.goal != null ? summary.goal : "—"}
                  <Text style={styles.weightUnit}> kg</Text>
                </Text>
                <Text style={styles.weightLabel}>Meta Final</Text>
              </View>
            </View>

            {summary?.progressPct != null && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(summary.progressPct, 100)}%` }]} />
                </View>
                <Text style={styles.progressPct}>{summary.progressPct}% concluído rumo à meta</Text>
              </View>
            )}

            {summary?.remainingToGoal != null && summary.goal != null && (
              <View style={styles.remainingBadge}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.remaining}>
                  {Math.abs(summary.remainingToGoal) < 0.1
                    ? "Meta atingida com sucesso! 🎉"
                    : summary.remainingToGoal > 0
                      ? `Faltam ${summary.remainingToGoal.toFixed(1)} kg para o objetivo`
                      : `Faltam ${Math.abs(summary.remainingToGoal).toFixed(1)} kg de ganho de massa`}
                </Text>
              </View>
            )}

            {editingGoal && (
              <View style={styles.inlineForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Nova meta (ex: 72.0)"
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
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="add-circle" size={16} color={colors.info} />
              </View>
              <Text style={styles.cardTitle}>Registrar peso de hoje</Text>
            </View>
            <View style={styles.inlineForm}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 74.5 kg"
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
              <View style={styles.deltaBox}>
                <Ionicons
                  name={summary.deltaFromStart < 0 ? "trending-down" : "trending-up"}
                  size={16}
                  color={summary.deltaFromStart < 0 ? colors.success : colors.info}
                />
                <Text style={styles.delta}>
                  {Math.abs(summary.deltaFromStart).toFixed(1)} kg de variação desde o início
                </Text>
              </View>
            )}
          </View>

          {/* ─── Estatísticas de treino ────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="stats-chart" size={16} color={colors.warning} />
              </View>
              <Text style={styles.cardTitle}>Estatísticas de treino</Text>
            </View>

            <View style={styles.statsGrid}>
              <StatTile styles={styles} value={String(stats?.total ?? 0)} label="Treinos totais" icon="barbell-outline" iconColor={colors.primary} />
              <StatTile styles={styles} value={String(stats?.thisWeek ?? 0)} label="Nesta semana" icon="calendar-outline" iconColor={colors.info} />
              <StatTile
                styles={styles}
                value={`${stats?.streak ?? 0}`}
                label="Sequência de dias"
                icon="flame-outline"
                iconColor={colors.primary}
                highlight={(stats?.streak ?? 0) > 0}
              />
              <StatTile
                styles={styles}
                value={stats?.avgDurationMin != null ? `${stats.avgDurationMin} min` : "—"}
                label="Duração média"
                icon="time-outline"
                iconColor={colors.success}
              />
            </View>

            {stats?.adherencePct != null && (
              <View style={styles.adherenceBox}>
                <View style={styles.adherenceHeader}>
                  <Text style={styles.adherenceLabel}>Aderência aos treinos (30 dias)</Text>
                  <Text style={styles.adherencePctNum}>{stats.adherencePct}%</Text>
                </View>
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
                  {stats.adherencePct}% dos treinos agendados foram cumpridos
                </Text>
              </View>
            )}

            {/* Semana: feitos vs faltas */}
            {stats && (
              <View style={styles.weekSection}>
                <Text style={styles.weekTitle}>Frequência Semanal</Text>
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
                        <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                          {day.label}
                        </Text>
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
                    ? "Nenhuma falta esta semana. Parabéns pelo foco! 💪"
                    : `Você teve ${missedThisWeek} ${missedThisWeek === 1 ? "falta" : "faltas"} esta semana.`}
                </Text>
              </View>
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
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  highlight?: boolean;
}
const StatTile = ({ styles, value, label, icon, iconColor, highlight }: StatTileProps) => (
  <View style={styles.statTile}>
    <View style={[styles.statIconCircle, { backgroundColor: iconColor + "18" }]}>
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <Text style={[styles.statValue, highlight && styles.statValueHi]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 18 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 24,
      color: colors.text.primary,
    },
    headerSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 2,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    editBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
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
      fontSize: 14,
      color: colors.text.tertiary,
    },
    weightLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    arrowCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },

    progressContainer: {
      marginVertical: 4,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceVariant,
      overflow: "hidden",
    },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
    progressPct: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 6,
      textAlign: "center",
    },
    remainingBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 6,
      marginTop: 10,
    },
    remaining: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.primary,
    },

    inlineForm: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      gap: 10,
    },
    input: {
      flex: 1,
      height: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
      backgroundColor: colors.surfaceVariant,
    },
    saveBtn: {
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFFFFF" },
    disabled: { opacity: 0.5 },
    deltaBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
    },
    delta: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 14,
    },
    statTile: {
      width: "48%",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    statValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
    },
    statValueHi: { color: colors.primary },
    statLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.secondary,
      marginTop: 2,
    },

    adherenceBox: { marginTop: 14 },
    adherenceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    adherenceLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
    },
    adherencePctNum: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: colors.text.primary,
    },
    adherencePct: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 6,
    },

    weekSection: {
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    weekTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
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
    dayLabelToday: {
      color: colors.primary,
      fontFamily: "Poppins_700Bold",
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

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      gap: 8,
    },
    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
    },
  });

export default ProgressScreen;