import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { buildHiitScript, HiitSegment, totalWorkMinutes } from "./hiit";

interface Props {
  onStart: (script: HiitSegment[], durationMin: number) => void;
  onBack: () => void;
}

const DURATIONS = [10, 15, 20, 25, 30];

const HiitSetup = ({ onStart, onBack }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [duration, setDuration] = useState(15);

  const preview = useMemo(() => {
    const script = buildHiitScript(duration);
    const rests = script.filter((s) => s.type === "rest").length;
    return { work: totalWorkMinutes(script), rests, script };
  }, [duration]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cardio HIIT</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Ionicons name="flame" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Treino de cardio roteirizado</Text>
        <Text style={styles.desc}>
          Sequência de calistenia: aquecimento, exercícios de 1 minuto alternando
          grupos musculares e alongamento no fim — tudo sem equipamento, com 1
          minuto de descanso a cada 5 minutos.
        </Text>

        <Text style={styles.label}>Duração do treino</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => {
            const active = d === duration;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDuration(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {d}
                </Text>
                <Text style={[styles.chipUnit, active && styles.chipTextActive]}>
                  min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Ionicons name="fitness" size={18} color={colors.primary} />
            <Text style={styles.summaryText}>{preview.work} min de exercício</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="pause-circle-outline" size={18} color={colors.info} />
            <Text style={styles.summaryText}>
              {preview.rests}{" "}
              {preview.rests === 1 ? "descanso" : "descansos"} de 1 min
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => onStart(preview.script, duration)}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.startText}>Iniciar treino de {duration} min</Text>
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
      paddingBottom: 16,
    },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },
    content: { flex: 1, padding: 24 },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
      marginBottom: 8,
    },
    desc: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: 28,
    },
    label: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
      marginBottom: 12,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    chip: {
      width: 62,
      height: 62,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    chipText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 20,
      color: colors.text.primary,
    },
    chipUnit: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: -2,
    },
    chipTextActive: { color: colors.primary },
    summary: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    summaryItem: { flexDirection: "row", alignItems: "center" },
    summaryText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 10,
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

export default HiitSetup;
