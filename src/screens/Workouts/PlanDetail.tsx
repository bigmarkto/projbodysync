import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { PlanDetail as PlanDetailType } from "./types";

interface Props {
  plan: PlanDetailType;
  onStart: () => void;
  onEdit: () => void;
  onBack: () => void;
}

const PlanDetail = ({ plan, onStart, onEdit, onBack }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalSets = plan.exercises.reduce((s, e) => s + e.sets, 0);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalhes do Treino
        </Text>
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.iconBtn}
        >
          <Ionicons name="create-outline" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Plan Hero Card */}
      <View style={styles.heroBox}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="barbell-outline" size={14} color={colors.primary} />
            <Text style={styles.metaChipText}>
              {plan.exercises.length} {plan.exercises.length === 1 ? "exercício" : "exercícios"}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="repeat-outline" size={14} color={colors.info} />
            <Text style={styles.metaChipText}>{totalSets} séries no total</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Sequência de Exercícios</Text>

        {plan.exercises.map((ex, i) => (
          <View key={`${ex.exerciseId}-${i}`} style={styles.exRow}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{i + 1}</Text>
            </View>
            <View style={styles.thumb}>
              {ex.exercise?.imageUrl ? (
                <Image source={{ uri: ex.exercise.imageUrl }} style={styles.thumbImg} />
              ) : (
                <Ionicons name="barbell-outline" size={20} color={colors.text.tertiary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exName} numberOfLines={1}>
                {ex.exercise?.name ?? `Exercício #${ex.exerciseId}`}
              </Text>
              {!!ex.exercise?.category && (
                <Text style={styles.exCat}>{ex.exercise.category}</Text>
              )}
            </View>
            <View style={styles.setsPill}>
              <Text style={styles.exReps}>
                {ex.sets} <Text style={styles.exRepsMuted}>×</Text> {ex.reps}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.88}>
          <Ionicons name="play" size={22} color="#FFFFFF" />
          <Text style={styles.startText}>Começar treino agora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.text.primary,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    heroBox: {
      backgroundColor: colors.card,
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    planName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      gap: 5,
    },
    metaChipText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
    },
    scroll: { flex: 1 },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 12,
    },
    exRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    orderBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    orderBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: colors.text.tertiary,
    },
    thumb: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginRight: 12,
    },
    thumbImg: { width: "100%", height: "100%" },
    exName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
    },
    exCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    setsPill: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    exReps: {
      fontFamily: "Poppins_700Bold",
      fontSize: 14,
      color: colors.primary,
    },
    exRepsMuted: {
      color: colors.text.tertiary,
      fontFamily: "Poppins_400Regular",
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    startBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    startText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },
  });

export default PlanDetail;