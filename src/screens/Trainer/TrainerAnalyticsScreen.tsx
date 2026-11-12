import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { createTrainerApi } from "./trainerService";
import { TrainerAnalyticsData, getInitials } from "./trainerTypes";

interface Props {
  refreshTick?: number;
  onGoToStudents?: () => void;
  onSelectStudentId?: (studentId: string) => void;
}

const EMPTY_ANALYTICS: TrainerAnalyticsData = {
  activeStudentsCount: 0,
  weeklyAttendanceRate: 0,
  trainedTodayCount: 0,
  totalPrescriptions: 0,
  weeklyWorkoutsCount: 0,
  avgWorkoutDurationMinutes: 0,
  waterComplianceRate: 0,
  attentionStudents: [],
  ranking: [],
};

export const TrainerAnalyticsScreen = ({
  refreshTick = 0,
  onGoToStudents,
  onSelectStudentId,
}: Props) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const trainerApi = useMemo(() => createTrainerApi(request), [request]);

  const [analytics, setAnalytics] = useState<TrainerAnalyticsData>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await trainerApi.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar métricas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trainerApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (refreshTick > 0) loadData();
  }, [refreshTick, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSendReminder = (studentName: string) => {
    const text = `Olá ${studentName.split(" ")[0]}! Notei que você não treina há alguns dias no BodySync. Bora retomar o foco hoje?`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {});
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Métricas da Consultoria</Text>
          <Text style={styles.headerSubtitle}>Acompanhe o engajamento dos seus alunos</Text>
        </View>
        {onGoToStudents && (
          <TouchableOpacity
            style={styles.headerPillBtn}
            onPress={onGoToStudents}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.headerPillText}>Alunos ({analytics.activeStudentsCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Carregando métricas...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Tentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Banner Geral de Performance */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>TAXA DE ADESÃO SEMANAL</Text>
                <Text style={styles.heroPercentage}>{analytics.weeklyAttendanceRate}%</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="flash" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.heroBadgeText}>
                  {analytics.trainedTodayCount} hoje
                </Text>
              </View>
            </View>
            <Text style={styles.heroDesc}>
              {analytics.activeStudentsCount === 0
                ? "Conecte seus primeiros alunos na aba Alunos (+ Convidar) para acompanhar a adesão em tempo real."
                : analytics.weeklyAttendanceRate >= 70
                  ? `Excelente ritmo! ${analytics.activeStudentsCount} aluno(s) ativo(s) mantendo ótima consistência.`
                  : "Acompanhe os alunos em atenção abaixo para recuperar o ritmo semanal."}
            </Text>
          </View>

          {/* Resumo da Consultoria (Métricas movidas da aba Alunos) */}
          <View style={styles.summaryRow}>
            <View style={styles.kpiCard}>
              <Ionicons name="people-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.kpiVal}>{analytics.activeStudentsCount}</Text>
              <Text style={styles.kpiLabel}>Alunos Ativos</Text>
            </View>

            <View style={styles.kpiCard}>
              <Ionicons name="flash-outline" size={20} color={colors.success} style={{ marginBottom: 6 }} />
              <Text style={[styles.kpiVal, { color: colors.success }]}>
                {analytics.trainedTodayCount}
              </Text>
              <Text style={styles.kpiLabel}>Treinaram Hoje</Text>
            </View>

            <View style={styles.kpiCard}>
              <Ionicons name="clipboard-outline" size={20} color={colors.info} style={{ marginBottom: 6 }} />
              <Text style={styles.kpiVal}>{analytics.totalPrescriptions}</Text>
              <Text style={styles.kpiLabel}>Prescrições</Text>
            </View>
          </View>

          {/* Grid de KPIs Semanais */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Ionicons name="barbell-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.kpiVal}>{analytics.weeklyWorkoutsCount}</Text>
              <Text style={styles.kpiLabel}>Treinos (7d)</Text>
            </View>

            <View style={styles.kpiCard}>
              <Ionicons name="time-outline" size={20} color={colors.info} style={{ marginBottom: 6 }} />
              <Text style={styles.kpiVal}>{analytics.avgWorkoutDurationMinutes} min</Text>
              <Text style={styles.kpiLabel}>Duração Média</Text>
            </View>

            <View style={styles.kpiCard}>
              <Ionicons name="water-outline" size={20} color={colors.success} style={{ marginBottom: 6 }} />
              <Text style={styles.kpiVal}>{analytics.waterComplianceRate}%</Text>
              <Text style={styles.kpiLabel}>Meta de Água</Text>
            </View>
          </View>

          {/* Seção: Alunos em Atenção (Engajamento em Risco) */}
          {analytics.attentionStudents.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Alunos em Atenção</Text>
              {analytics.attentionStudents.map((att) => (
                <View key={att.studentId} style={styles.warningCard}>
                  <View style={styles.warningTop}>
                    <TouchableOpacity
                      style={styles.warningLinkArea}
                      onPress={() => onSelectStudentId?.(att.studentId)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.warningIcon}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.warningName}>{att.name}</Text>
                        <Text style={styles.warningReason}>
                          {att.neverTrained
                            ? `Vinculado há ${att.daysInactive} dias sem treinos`
                            : `Sem registrar treino há ${att.daysInactive} dias`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reminderBtn}
                      onPress={() => handleSendReminder(att.name)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.reminderBtnText}>Cobrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Ranking de Assiduidade dos Alunos */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Ranking de Assiduidade</Text>
          {analytics.ranking.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={28} color={colors.text.tertiary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>
                Quando seus alunos conectarem o código e treinarem, o ranking aparecerá aqui.
              </Text>
            </View>
          ) : (
            analytics.ranking.map((item, idx) => {
              const initials = getInitials(item.name, "AL");
              const pct = item.percentage;

              return (
                <TouchableOpacity
                  key={item.studentId}
                  style={styles.rankCard}
                  onPress={() => onSelectStudentId?.(item.studentId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankPosition}>
                    <Text style={styles.rankPosText}>{idx + 1}º</Text>
                  </View>

                  <View style={[styles.rankAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.rankAvatarText}>{initials}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>{item.name}</Text>
                    <Text style={styles.rankMeta}>
                      {item.attended} de {item.target} treinos • {pct}%
                    </Text>
                  </View>

                  <View style={styles.rankProgress}>
                    <View style={[styles.rankProgressBar, { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 80 ? colors.success : colors.primary }]} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {onGoToStudents && (
            <TouchableOpacity
              style={styles.viewAllStudentsBtn}
              onPress={onGoToStudents}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.viewAllStudentsText}>Ver Lista Completa de Alunos</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
    centerBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
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
    retryBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.error,
      marginLeft: 8,
    },
    retryBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: "#FFFFFF",
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
      marginBottom: 12,
    },
    emptyText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 20,
      color: colors.text.primary,
    },
    headerSubtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
    },
    headerPillBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    headerPillText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    heroLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 10,
      color: "rgba(255,255,255,0.8)",
      letterSpacing: 1,
    },
    heroPercentage: {
      fontFamily: "Poppins_700Bold",
      fontSize: 32,
      color: "#FFFFFF",
      lineHeight: 38,
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    heroBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: "#FFFFFF",
    },
    heroDesc: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.9)",
      lineHeight: 18,
    },
    summaryRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },
    kpiGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 18,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      alignItems: "center",
    },
    kpiVal: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
    },
    kpiLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 10,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    sectionTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 10,
    },
    warningCard: {
      backgroundColor: isDark ? colors.surface : "#FEF2F2",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.error,
      padding: 14,
      marginBottom: 12,
    },
    warningTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    warningLinkArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    warningIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
      alignItems: "center",
      justifyContent: "center",
    },
    warningName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
    },
    warningReason: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.error,
    },
    reminderBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    reminderBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: "#FFFFFF",
    },
    rankCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      gap: 10,
    },
    rankPosition: {
      width: 24,
      alignItems: "center",
    },
    rankPosText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: colors.text.tertiary,
    },
    rankAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    rankAvatarText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
    },
    rankName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
    },
    rankMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.secondary,
    },
    rankProgress: {
      width: 50,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    rankProgressBar: {
      height: 6,
      borderRadius: 3,
    },
    viewAllStudentsBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      marginBottom: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    viewAllStudentsText: {
      flex: 1,
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
  });
