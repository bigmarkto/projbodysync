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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="create-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.headerBody}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planMeta}>
          {plan.exercises.length} exercícios · {totalSets} séries
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {plan.exercises.map((ex, i) => (
          <View key={`${ex.exerciseId}-${i}`} style={styles.exRow}>
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
            <Text style={styles.exReps}>
              {ex.sets} × {ex.reps}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.85}>
          <Ionicons name="play" size={22} color="#FFFFFF" />
          <Text style={styles.startText}>Começar treino</Text>
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
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
    },
    headerBody: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    planName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: "#FFFFFF",
    },
    planMeta: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: "rgba(255,255,255,0.9)",
      marginTop: 4,
    },
    scroll: { flex: 1 },
    exRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginRight: 12,
    },
    thumbImg: { width: "100%", height: "100%" },
    exName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.primary,
    },
    exCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    exReps: {
      fontFamily: "Poppins_700Bold",
      fontSize: 15,
      color: colors.primary,
      marginLeft: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    startBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    startText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
      marginLeft: 8,
    },
  });

export default PlanDetail;
