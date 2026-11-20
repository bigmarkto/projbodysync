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
import { useRegister, SubscriptionType } from "./RegisterContext";
import { StepHeader, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeProvider";

interface PlanDef {
  id: SubscriptionType;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
  disabled?: boolean;
}

const PLANS_COMUM: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    features: [
      "Calistenia e exercícios em casa",
      "Treinos básicos",
      "IA personalizada",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 29,90",
    period: "/mês",
    features: ["Todas as modalidades", "IA personalizada", "Até 3 modalidades"],
    recommended: true,
  },
];

// TODO: Planos para personais não existem como subscriptionType na API atual.
// A API só aceita: free | basic | premium
// "pro" e "custom" são placeholders — será necessário adicionar no backend.
const PLANS_PERSONAL: PlanDef[] = [
  {
    id: "basic",
    name: "Basic",
    price: "R$ 49,90",
    period: "/mês",
    features: ["Até 5 alunos", "Planos de treino", "Relatórios básicos"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 99,90",
    period: "/mês",
    features: ["Alunos ilimitados", "IA para planos", "Relatórios avançados"],
    recommended: true,
    disabled: true, // placeholder — não existe na API ainda
  },
  {
    id: "custom",
    name: "Custom",
    price: "Sob consulta",
    period: "",
    features: ["Tudo do Pro", "Suporte dedicado", "White-label"],
    disabled: true, // placeholder — não existe na API ainda
  },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
  currentStep: number;
}

export const Step2Subscription = ({ onNext, onBack, totalSteps, currentStep }: Props) => {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { data, setField } = useRegister();
  const [error, setError] = useState("");

  const plans = data.role === "personal" ? PLANS_PERSONAL : PLANS_COMUM;

  const handleNext = () => {
    if (!data.subscriptionType) {
      setError("Selecione um plano para continuar.");
      return;
    }
    onNext();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StepHeader current={currentStep} total={totalSteps} label="Plano de assinatura" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Plano de assinatura</Text>
        <Text style={s.subtitle}>
          {data.role === "personal"
            ? "Planos para personal trainer"
            : "Planos para usuário comum"}
        </Text>

        {plans.map((plan) => {
          const selected = data.subscriptionType === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                s.card,
                selected && s.cardSelected,
                plan.disabled && s.cardDisabled,
              ]}
              onPress={() => {
                if (!plan.disabled) {
                  setField("subscriptionType", plan.id);
                  setError("");
                }
              }}
              activeOpacity={plan.disabled ? 1 : 0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!plan.disabled }}
            >
              {plan.recommended && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>Recomendado</Text>
                </View>
              )}
              {plan.disabled && (
                <View style={s.badgeDisabled}>
                  <Text style={s.badgeText}>Em breve</Text>
                </View>
              )}
              <View style={s.cardHeader}>
                <Text style={[s.planName, selected && s.planNameSelected]}>
                  {plan.name}
                </Text>
                <View style={s.priceRow}>
                  <Text style={[s.price, selected && s.priceSelected]}>
                    {plan.price}
                  </Text>
                  <Text style={s.period}>{plan.period}</Text>
                </View>
              </View>
              <View style={s.divider} />
              {plan.features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={selected ? colors.primary : colors.success}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[s.feature, selected && s.featureSelected]}>{f}</Text>
                </View>
              ))}
            </TouchableOpacity>
          );
        })}

        {!!error && <Text style={s.error}>{error}</Text>}

        {data.role === "personal" && (
          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 8 }} />
            <Text style={s.infoText}>
              Os planos Pro e Custom estão em desenvolvimento. Selecione o Basic para continuar.
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
      fontSize: 22,
      color: colors.text.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 20,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 18,
      marginBottom: 16,
      position: "relative",
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    cardDisabled: { opacity: 0.5 },
    badge: {
      position: "absolute",
      top: -12,
      right: 14,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeDisabled: {
      position: "absolute",
      top: -12,
      right: 14,
      backgroundColor: colors.text.tertiary,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: "#fff",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 12,
    },
    planName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 20,
      color: colors.text.primary,
    },
    planNameSelected: { color: colors.primary },
    priceRow: { flexDirection: "row", alignItems: "baseline" },
    price: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
    },
    priceSelected: { color: colors.primary },
    period: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.tertiary,
      marginLeft: 2,
    },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },
    featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    feature: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
    },
    featureSelected: { color: colors.text.primary },
    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginBottom: 8,
    },
    infoBox: {
      flexDirection: "row",
      backgroundColor: colors.infoLight,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.info,
    },
    infoText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.primary,
      lineHeight: 18,
    },
  });
