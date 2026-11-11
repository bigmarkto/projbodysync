import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Share,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { createTrainerApi } from "./trainerService";
import {
  Student,
  TrainerProfileData,
  getInitials,
} from "./trainerTypes";

interface Props {
  onSelectStudent: (student: Student) => void;
  onPrescribeForStudent: (student: Student) => void;
}

type FilterType = "all" | "today" | "yesterday" | "warning";

export const TrainerHomeScreen = ({
  onSelectStudent,
  onPrescribeForStudent,
}: Props) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const trainerApi = useMemo(() => createTrainerApi(request), [request]);

  const [students, setStudents] = useState<Student[]>([]);
  const [profile, setProfile] = useState<TrainerProfileData>({
    trainerId: user?.id || "",
    name: user?.name || "Personal Trainer",
    email: user?.email || "",
    inviteCode: "---",
    activeStudentsCount: 0,
    totalPrescriptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [pro, stu] = await Promise.all([
        trainerApi.getProfile(),
        trainerApi.listStudents(),
      ]);
      setProfile(pro);
      setStudents(stu);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar seus alunos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trainerApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filtro de alunos em tempo real
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.fitnessGoal.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filter === "today") return s.lastWorkoutStatus === "today";
      if (filter === "yesterday") return s.lastWorkoutStatus === "yesterday";
      if (filter === "warning") return s.lastWorkoutStatus === "warning";
      return true;
    });
  }, [students, search, filter]);

  const handleCopyCode = async () => {
    if (!profile.inviteCode || profile.inviteCode === "---") return;
    setCopied(true);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.inviteCode);
      }
    } catch {
      // fallback silencioso se clipboard web indisponível
    }
    setTimeout(() => setCopied(false), 2400);
  };

  const handleShareCode = async () => {
    if (!profile.inviteCode || profile.inviteCode === "---") return;
    try {
      await Share.share({
        message: `Olá! Conecte-se comigo no BodySync usando meu código de treinador: ${profile.inviteCode}. Baixe o app e adicione o código em Ajustes!`,
      });
    } catch {
      // Ignora cancelamento
    }
  };

  const getStatusBadge = (status: Student["lastWorkoutStatus"], dateText: string) => {
    if (status === "today") {
      return {
        bg: colors.successLight,
        color: colors.success,
        text: `Treinou hoje (${dateText})`,
        icon: "checkmark-circle",
      };
    }
    if (status === "yesterday") {
      return {
        bg: colors.infoLight,
        color: colors.info,
        text: "Treinou ontem",
        icon: "time-outline",
      };
    }
    if (status === "recent") {
      return {
        bg: colors.primaryLight,
        color: colors.primary,
        text: `Último treino: ${dateText}`,
        icon: "barbell-outline",
      };
    }
    return {
      bg: colors.warningLight,
      color: colors.warning,
      text: `Sem treino recente (${dateText})`,
      icon: "alert-circle-outline",
    };
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top Bar do Treinador */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.trainerAvatar}>
            <Text style={styles.trainerAvatarText}>{getInitials(profile.name)}</Text>
          </View>
          <View>
            <View style={styles.proTag}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.proTagText}>PERSONAL TRAINER</Text>
            </View>
            <Text style={styles.trainerGreeting}>{profile.name}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.inviteHeaderBtn}
          onPress={() => setShowInviteModal(true)}
          activeOpacity={0.8}
          accessibilityLabel="Convidar novo aluno"
        >
          <Ionicons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.inviteHeaderBtnText}>Convidar</Text>
        </TouchableOpacity>
      </View>

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

        {/* Painel de Métricas Rápidas */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="people" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{profile.activeStudentsCount}</Text>
            <Text style={styles.statLabel}>Alunos Ativos</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="flash" size={18} color={colors.success} />
            </View>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {students.filter((s) => s.lastWorkoutStatus === "today").length}
            </Text>
            <Text style={styles.statLabel}>Treinaram Hoje</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="barbell" size={18} color={colors.info} />
            </View>
            <Text style={styles.statNumber}>{profile.totalPrescriptions}</Text>
            <Text style={styles.statLabel}>Treinos Prescritos</Text>
          </View>
        </View>

        {/* Barra de Pesquisa e Filtros */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.text.tertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar aluno por nome ou objetivo..."
              placeholderTextColor={colors.text.tertiary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: "all", label: `Todos (${students.length})` },
              { id: "today", label: "Treinaram Hoje" },
              { id: "yesterday", label: "Treinaram Ontem" },
              { id: "warning", label: "Sem Treino Recente" },
            ].map((f) => {
              const active = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(f.id as FilterType)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista de Alunos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Alunos da Consultoria</Text>
          <Text style={styles.sectionBadge}>{filteredStudents.length} exibidos</Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Carregando alunos...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.text.tertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>
              {students.length === 0 ? "Nenhum aluno conectado ainda" : "Nenhum aluno encontrado"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {students.length === 0
                ? "Compartilhe seu código de convite para vincular seus alunos à consultoria."
                : "Tente buscar por outro termo ou remova o filtro."}
            </Text>
            {students.length === 0 && (
              <TouchableOpacity
                style={[styles.inviteHeaderBtn, { marginTop: 16 }]}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.inviteHeaderBtnText}>Convidar Primeiro Aluno</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredStudents.map((student) => {
            const badge = getStatusBadge(student.lastWorkoutStatus, student.lastWorkoutDate);
            const initials = getInitials(student.name, "AL");

            return (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onPress={() => onSelectStudent(student)}
                activeOpacity={0.85}
              >
                {/* Linha Superior: Avatar, Nome e Meta */}
                <View style={styles.studentTopRow}>
                  <View style={[styles.studentAvatar, { backgroundColor: student.avatarColor }]}>
                    <Text style={styles.studentAvatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentGoal} numberOfLines={1}>
                      {student.fitnessGoal}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>

                {/* Badge de Status do Último Treino */}
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon as any} size={14} color={badge.color} style={{ marginRight: 6 }} />
                  <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
                </View>

                {/* Frequência Semanal e Métricas */}
                <View style={styles.studentMetricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricVal}>
                      {student.currentWeightKg > 0 ? `${student.currentWeightKg} kg` : "--"}
                    </Text>
                    <Text style={styles.metricSub}>Peso Atual</Text>
                  </View>

                  <View style={styles.dividerV} />

                  <View style={styles.metricCol}>
                    <Text style={styles.metricVal}>
                      {student.weeklyConsistency.attended}/{student.weeklyConsistency.target} dias
                    </Text>
                    <Text style={styles.metricSub}>Na Semana</Text>
                  </View>

                  <View style={styles.dividerV} />

                  <View style={styles.metricCol}>
                    <Text style={styles.metricVal}>
                      {student.heightCm > 0 ? `${student.heightCm} cm` : "--"}
                    </Text>
                    <Text style={styles.metricSub}>Altura</Text>
                  </View>
                </View>

                {/* Ações Rápidas do Card */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewProfileBtn}
                    onPress={() => onSelectStudent(student)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={15} color={colors.text.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.viewProfileText}>Ver Perfil & Evolução</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.prescribeBtn}
                    onPress={() => onPrescribeForStudent(student)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.prescribeText}>Prescrever Treino</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Convidar Aluno */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <Ionicons name="person-add" size={16} color={colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Convidar Aluno</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowInviteModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Seu aluno pode se conectar instantaneamente à sua consultoria usando o código exclusivo abaixo:
            </Text>

            {/* Código com ação de Toque para Copiar */}
            <TouchableOpacity
              style={[
                styles.modalCodeBox,
                copied && { borderColor: colors.success, backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5" },
              ]}
              onPress={handleCopyCode}
              activeOpacity={0.7}
              accessibilityLabel="Toque para copiar o código"
            >
              <Text
                style={[
                  styles.modalCodeNumber,
                  copied && { color: colors.success },
                ]}
              >
                {profile.inviteCode}
              </Text>

              <View style={styles.modalCodeBadge}>
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={13}
                  color={copied ? colors.success : colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.modalCodeBadgeText,
                    copied && { color: colors.success },
                  ]}
                >
                  {copied ? "Copiado para área de transferência!" : "Toque no código para copiar"}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.modalInstructions}>
              1. Peça ao aluno para abrir o BodySync.{"\n"}
              2. Ir em Ajustes &gt; "Conectar Personal Trainer".{"\n"}
              3. Digitar este código para sincronizar os treinos!
            </Text>

            {/* Ações: Copiar Código e Compartilhar */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCopyBtn,
                  copied && { borderColor: colors.success, backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "#F0FDF4" },
                ]}
                onPress={handleCopyCode}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={copied ? colors.success : colors.text.primary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modalCopyBtnText,
                    copied && { color: colors.success },
                  ]}
                >
                  {copied ? "Copiado!" : "Copiar Código"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalShareBtn}
                onPress={handleShareCode}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="share-social-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.modalShareText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    topBarLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    trainerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    trainerAvatarText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
    },
    proTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: "flex-start",
      marginBottom: 2,
    },
    proTagText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_700Bold",
      fontSize: 9,
      letterSpacing: 0.5,
    },
    trainerGreeting: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 17,
      color: colors.text.primary,
    },
    inviteHeaderBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    inviteHeaderBtnText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      alignItems: "center",
    },
    statIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    statNumber: {
      fontFamily: "Poppins_700Bold",
      fontSize: 19,
      color: colors.text.primary,
      lineHeight: 24,
    },
    statLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: "center",
    },
    searchSection: {
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 48,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
    },
    filterScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
    },
    filterChipTextActive: {
      color: "#FFFFFF",
      fontFamily: "Poppins_600SemiBold",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 17,
      color: colors.text.primary,
    },
    sectionBadge: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    studentCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    studentTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    studentAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    studentAvatarText: {
      color: "#FFFFFF",
      fontFamily: "Poppins_700Bold",
      fontSize: 15,
    },
    studentName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    studentGoal: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    statusBadgeText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
    },
    studentMetricsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: isDark ? colors.surfaceVariant : "#F8FAFC",
      borderRadius: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    metricCol: {
      alignItems: "center",
    },
    metricVal: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
    },
    metricSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 10,
      color: colors.text.tertiary,
      marginTop: 1,
    },
    dividerV: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },
    cardActionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    viewProfileBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    viewProfileText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.primary,
    },
    prescribeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    prescribeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: "#FFFFFF",
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    modalHeaderIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    modalTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
    },
    modalText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 19,
      marginBottom: 16,
    },
    modalCodeBox: {
      backgroundColor: isDark ? colors.surfaceVariant : "#FFF7ED",
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: "dashed",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    modalCodeNumber: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: colors.primary,
      letterSpacing: 2,
    },
    modalCodeBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
    },
    modalCodeBadgeText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.primary,
    },
    modalInstructions: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      lineHeight: 18,
      marginBottom: 20,
    },
    modalActionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    modalCopyBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    modalCopyBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
    },
    modalShareBtn: {
      flex: 1.2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 48,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    modalShareText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#FFFFFF",
    },
  });
