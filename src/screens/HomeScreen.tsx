import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeProvider";
import { useApi } from "../hooks/useApi";
import { lightColors } from "../theme/colors";
import HydrationCard from "../components/HydrationCard";
import { HomeSkeleton } from "../components/Skeleton";

interface WorkoutSchedule {
  days: boolean[];
  time: string;
}

interface Profile {
  weightKg: number | null;
  heightCm: number | null;
  desiredWeightKg: number | null;
  workoutFrequency: number | null;
  workoutSchedule: WorkoutSchedule | null;
  age: number | null;
  bmi: number | null;
}

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const getGreeting = (hour: number): string => {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const getInitials = (name?: string | null): string => {
  if (!name) return "AT";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
};

const classifyBmi = (bmi: number): { label: string; color: "success" | "warning" | "error" | "info" } => {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "warning" };
  if (bmi < 25) return { label: "Peso normal", color: "success" };
  if (bmi < 30) return { label: "Sobrepeso", color: "warning" };
  return { label: "Obesidade", color: "error" };
};

const buildWeek = (schedule: WorkoutSchedule | null) => {
  const today = new Date();
  const todayIdx = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - todayIdx);

  return WEEK_LABELS.map((label, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return {
      label,
      dayNumber: date.getDate(),
      isToday: i === todayIdx,
      isScheduled: schedule?.days?.[i] ?? false,
      time: schedule?.time ?? null,
    };
  });
};

const HomeScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const week = useMemo(
    () => buildWeek(profile?.workoutSchedule ?? null),
    [profile],
  );
  const scheduledCount = useMemo(
    () => profile?.workoutSchedule?.days?.filter(Boolean).length ?? 0,
    [profile],
  );

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const res = await request("/profile");
      if (!res.ok) {
        throw new Error("Não foi possível carregar seu perfil.");
      }
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao carregar seus dados.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [request]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HomeSkeleton />
      </View>
    );
  }

  const bmiInfo = profile?.bmi != null ? classifyBmi(profile.bmi) : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100, // Space for floating TabBar
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ─── Top Bar: Saudação + Avatar ──────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.userNameText}>{user?.name ?? "Atleta"} 👋</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Hero Banner: Status dos Treinos ─────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="flame" size={14} color={colors.primary} />
              <Text style={styles.heroBadgeText}>
                {scheduledCount > 0
                  ? `${scheduledCount} ${scheduledCount === 1 ? "Treino agendado" : "Treinos agendados"}`
                  : "Rotina Livre"}
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              {scheduledCount > 0
                ? "Mantenha o ritmo desta semana!"
                : "Defina seus dias de treino no perfil"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {scheduledCount > 0
                ? "Consistência é a chave para alcançar seus objetivos com saúde."
                : "Ajuste os dias ideais e horários para receber lembretes."}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.retry}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Semana atual ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.cardTitle}>Cronograma semanal</Text>
            </View>
            <Text style={styles.cardHeaderSub}>7 dias</Text>
          </View>

          <View style={styles.weekRow}>
            {week.map((day, i) => (
              <View key={i} style={styles.dayCol}>
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                  {day.label}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    day.isToday && styles.dayCircleToday,
                    day.isScheduled && !day.isToday && styles.dayCircleScheduled,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      day.isScheduled && !day.isToday && styles.dayNumberActive,
                      day.isToday && styles.dayNumberToday,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
                {day.isScheduled ? (
                  <View style={styles.dotIndicator} />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </View>
            ))}
          </View>

          {scheduledCount === 0 && (
            <Text style={styles.emptyHint}>
              Nenhum treino agendado. Configure sua rotina no seu perfil.
            </Text>
          )}
        </View>

        {/* ─── Hidratação diária ────────────────────────────────────────── */}
        <HydrationCard />

        {/* ─── Suas métricas ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons
                  name="analytics"
                  size={16}
                  color={colors.success}
                />
              </View>
              <Text style={styles.cardTitle}>Suas métricas</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="barbell-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.metricLabel}>Peso atual</Text>
              <Text style={styles.metricValue}>
                {profile?.weightKg != null ? `${profile.weightKg} kg` : "—"}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="flag-outline" size={18} color={colors.success} />
              </View>
              <Text style={styles.metricLabel}>Meta de peso</Text>
              <Text style={styles.metricValue}>
                {profile?.desiredWeightKg != null
                  ? `${profile.desiredWeightKg} kg`
                  : "—"}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="body-outline" size={18} color={colors.info} />
              </View>
              <Text style={styles.metricLabel}>IMC</Text>
              <Text style={styles.metricValue}>
                {profile?.bmi != null ? profile.bmi.toFixed(1) : "—"}
              </Text>
              {bmiInfo && (
                <View
                  style={[
                    styles.bmiBadge,
                    {
                      backgroundColor:
                        bmiInfo.color === "success"
                          ? colors.successLight
                          : bmiInfo.color === "warning"
                            ? colors.warningLight
                            : colors.errorLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bmiBadgeText,
                      {
                        color:
                          bmiInfo.color === "success"
                            ? colors.success
                            : bmiInfo.color === "warning"
                              ? colors.warning
                              : colors.error,
                      },
                    ]}
                  >
                    {bmiInfo.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="calendar-number-outline" size={18} color={colors.warning} />
              </View>
              <Text style={styles.metricLabel}>Idade</Text>
              <Text style={styles.metricValue}>
                {profile?.age != null ? `${profile.age} anos` : "—"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 18 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    // Top Bar
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    avatarText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: "#FFFFFF",
    },
    greetingText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
    },
    userNameText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
      marginTop: -2,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    // Hero Card
    heroCard: {
      backgroundColor: isDark ? colors.surface : "#FFF7ED",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(249, 115, 22, 0.2)",
      padding: 18,
      marginBottom: 16,
    },
    heroContent: {},
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      gap: 6,
      marginBottom: 8,
    },
    heroBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
    heroTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    // Card genérico
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
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
    cardHeaderSub: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.tertiary,
    },

    // Semana
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
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceVariant,
    },
    dayCircleToday: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    dayCircleScheduled: {
      backgroundColor: colors.primaryLight,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayNumber: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.secondary,
    },
    dayNumberActive: { color: colors.primary },
    dayNumberToday: { color: "#FFFFFF" },
    dotIndicator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      marginTop: 6,
    },
    dotPlaceholder: { height: 4, marginTop: 6 },
    emptyHint: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      textAlign: "center",
      marginTop: 14,
    },

    // Métricas
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    metricItem: {
      width: "48%",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    metricLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
    },
    metricValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
      marginTop: 2,
    },
    bmiBadge: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    bmiBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 10,
    },

    // Erro
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorLight,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
    },
    retry: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
      marginLeft: 8,
    },
  });

export default HomeScreen;