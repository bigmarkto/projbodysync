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

// ─── Tipos do perfil (GET /profile) ──────────────────────────────────────────
interface WorkoutSchedule {
  days: boolean[]; // índice 0 = domingo ... 6 = sábado
  time: string; // "HH:MM"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = (hour: number): string => {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const getInitials = (name?: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
};

const classifyBmi = (bmi: number): string => {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
};

// Monta os 7 dias da semana atual (domingo → sábado)
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
  const { colors } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  // ─── Header laranja (sempre visível) ───────────────────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>
        <TouchableOpacity
          style={styles.bell}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.userName}>{user?.name ?? "Atleta"} 👋</Text>

      {scheduledCount > 0 && (
        <Text style={styles.headerSubtitle}>
          Você tem {scheduledCount}{" "}
          {scheduledCount === 1 ? "treino agendado" : "treinos agendados"} esta
          semana. Continue assim!
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
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
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.cardTitle}>Semana atual</Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {week.map((day, i) => (
              <View key={i} style={styles.dayCol}>
                <Text style={styles.dayLabel}>{day.label}</Text>
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
                {day.isScheduled && day.time ? (
                  <Text style={styles.dayTime}>{day.time}</Text>
                ) : (
                  <View style={styles.dayTimePlaceholder} />
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
              <Ionicons
                name="stats-chart-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.cardTitle}>Suas métricas</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <MetricItem
              styles={styles}
              icon="barbell-outline"
              iconColor={colors.primary}
              label="Peso atual"
              value={profile?.weightKg != null ? `${profile.weightKg} kg` : "—"}
            />
            <MetricItem
              styles={styles}
              icon="flag-outline"
              iconColor={colors.success}
              label="Meta de peso"
              value={
                profile?.desiredWeightKg != null
                  ? `${profile.desiredWeightKg} kg`
                  : "—"
              }
            />
            <MetricItem
              styles={styles}
              icon="body-outline"
              iconColor={colors.info}
              label="IMC"
              value={profile?.bmi != null ? profile.bmi.toFixed(1) : "—"}
              sub={profile?.bmi != null ? classifyBmi(profile.bmi) : undefined}
            />
            <MetricItem
              styles={styles}
              icon="calendar-number-outline"
              iconColor={colors.warning}
              label="Idade"
              value={profile?.age != null ? `${profile.age} anos` : "—"}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Item de métrica reutilizável ────────────────────────────────────────────
interface MetricItemProps {
  styles: ReturnType<typeof createStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
}

const MetricItem = ({
  styles,
  icon,
  iconColor,
  label,
  value,
  sub,
}: MetricItemProps) => (
  <View style={styles.metricItem}>
    <View style={[styles.metricIcon, { backgroundColor: iconColor + "1A" }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {sub && <Text style={styles.metricSub}>{sub}</Text>}
  </View>
);

// ─── Estilos (dependentes do tema) ───────────────────────────────────────────
const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: 16 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    // Header
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingBottom: 22,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 15,
      color: "#FFFFFF",
    },
    bell: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    greeting: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
    },
    userName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: "#FFFFFF",
      marginTop: 2,
    },
    headerSubtitle: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: "rgba(255,255,255,0.92)",
      marginTop: 6,
      lineHeight: 18,
    },

    // Card genérico
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
    cardTitleRow: { flexDirection: "row", alignItems: "center" },
    cardTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
      marginLeft: 8,
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
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceVariant,
    },
    dayCircleToday: { backgroundColor: colors.primary },
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
    dayTime: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 10,
      color: colors.primary,
      marginTop: 6,
    },
    dayTimePlaceholder: { height: 15, marginTop: 6 },
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
    },
    metricItem: {
      width: "48%",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    metricValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
    },
    metricLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    metricSub: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: 2,
    },

    // Erro
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
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
