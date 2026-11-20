import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRegister, ExperienceLevel } from "./RegisterContext";
import { StepHeader, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeProvider";

const LEVELS: {
  id: ExperienceLevel;
  label: string;
  description: string;
  icon: string;
  recommendation: string;
}[] = [
  {
    id: "iniciante",
    label: "Não faço exercícios ainda",
    description: "Sou novo no mundo fitness",
    icon: "walk-outline",
    recommendation: "Vamos começar com treinos 3x por semana, com progressão gradual ao longo das semanas.",
  },
  {
    id: "intermediario",
    label: "1–2 vezes por semana",
    description: "Faço exercícios periodicamente",
    icon: "bicycle-outline",
    recommendation: "Indicamos treinos 4x por semana com intensidade moderada para evoluir com segurança.",
  },
  {
    id: "avancado",
    label: "3 ou mais dias por semana",
    description: "Faço exercícios de forma frequente",
    icon: "trophy-outline",
    recommendation: "Você está pronto para treinos de alta intensidade. Personalizaremos de acordo com seus objetivos.",
  },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
  currentStep: number;
}

export const Step6Frequency = ({ onNext, onBack, totalSteps, currentStep }: Props) => {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { data, setField } = useRegister();
  const [error, setError] = useState("");

  const selected = LEVELS.find((l) => l.id === data.experienceLevel);

  const handleNext = () => {
    if (!data.experienceLevel) {
      setError("Selecione uma opção para continuar.");
      return;
    }
    onNext();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StepHeader current={currentStep} total={totalSteps} label="Frequência" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Com que frequência você faz exercícios hoje?</Text>

        {LEVELS.map((level) => {
          const isSelected = data.experienceLevel === level.id;
          return (
            <TouchableOpacity
              key={level.id}
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => {
                setField("experienceLevel", level.id);
                setError("");
              }}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[s.iconBox, isSelected && s.iconBoxSelected]}>
                <Ionicons
                  name={level.icon as any}
                  size={24}
                  color={isSelected ? colors.primary : colors.text.tertiary}
                />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardLabel, isSelected && s.cardLabelSelected]}>
                  {level.label}
                </Text>
                <Text style={s.cardDesc}>{level.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        {!!error && <Text style={s.error}>{error}</Text>}

        {selected && (
          <View style={s.recommendBox}>
            <Ionicons
              name="bulb-outline"
              size={16}
              color={colors.warning}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text style={s.recommendText}>
              <Text style={{ fontFamily: "Poppins_600SemiBold" }}>
                Com base no seu nível:{" "}
              </Text>
              {selected.recommendation}
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
        <ContinueButton onPress={handleNext} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 24, paddingTop: 8 },
    title: {
      fontFamily: "Poppins_700Bold",
      fontSize: 20,
      color: colors.text.primary,
      marginBottom: 20,
      lineHeight: 28,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    iconBoxSelected: { backgroundColor: colors.primary + "20" },
    cardText: { flex: 1 },
    cardLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: 2,
    },
    cardLabelSelected: { color: colors.primary },
    cardDesc: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginBottom: 12,
    },
    recommendBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.warningLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.warning + "60",
      padding: 14,
      marginTop: 4,
    },
    recommendText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.primary,
      lineHeight: 19,
    },
  });
