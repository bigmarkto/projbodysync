import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { formatDateBR } from "./DateTimePickerField";
import { StudentEvaluation } from "../screens/Trainer/trainerTypes";

interface EvaluationCardProps {
  evaluation: StudentEvaluation;
  showTrainerName?: boolean;
  onDelete?: (evaluation: StudentEvaluation) => void;
}

const METRIC_FIELDS: {
  key: keyof Pick<
    StudentEvaluation,
    "weightKg" | "bodyFatPct" | "chestCm" | "waistCm" | "armCm" | "thighCm"
  >;
  label: string;
  unit: string;
}[] = [
  { key: "weightKg", label: "Peso", unit: "kg" },
  { key: "bodyFatPct", label: "Gordura", unit: "%" },
  { key: "chestCm", label: "Tórax", unit: "cm" },
  { key: "waistCm", label: "Cintura", unit: "cm" },
  { key: "armCm", label: "Braço", unit: "cm" },
  { key: "thighCm", label: "Coxa", unit: "cm" },
];

export const EvaluationCard = ({
  evaluation,
  showTrainerName = false,
  onDelete,
}: EvaluationCardProps) => {
  const { colors, isDark } = useTheme();
  const formattedDate = formatDateBR(evaluation.evaluatedAt) || evaluation.evaluatedAt;

  const metrics = METRIC_FIELDS.filter((m) => evaluation[m.key] != null);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.dateWrap}>
          <View
            style={[
              styles.dateIconWrap,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateText, { color: colors.text.primary }]}>
              {formattedDate}
            </Text>
            {showTrainerName && (
              <Text style={[styles.trainerText, { color: colors.text.tertiary }]}>
                Por {evaluation.trainerName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightWrap}>
          <View
            style={[
              styles.ratingBadge,
              {
                backgroundColor: isDark
                  ? "rgba(249, 115, 22, 0.16)"
                  : "#FFF7ED",
              },
            ]}
          >
            <Ionicons
              name="star"
              size={13}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.ratingText, { color: colors.primary }]}>
              {evaluation.rating}/5
            </Text>
          </View>

          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(evaluation)}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(239, 68, 68, 0.14)"
                    : "#FEF2F2",
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Excluir avaliação de ${formattedDate}`}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {metrics.length > 0 && (
        <View style={styles.metricsWrap}>
          {metrics.map((m) => (
            <View
              key={m.key}
              style={[
                styles.metricPill,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>
                {m.label}:{" "}
              </Text>
              <Text style={[styles.metricValue, { color: colors.text.primary }]}>
                {evaluation[m.key]} {m.unit}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.notesText, { color: colors.text.secondary }]}>
        {evaluation.notes}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  trainerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
  },
  rightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
  },
  metricValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  notesText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
});
