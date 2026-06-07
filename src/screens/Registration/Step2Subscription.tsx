import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRegister, SubscriptionType } from "./RegisterContext";
import { StepHeader, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";

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
    <SafeAreaView style={s.safe}>
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
                    color={selected ? lightColors.primary : lightColors.success}
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
            <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" style={{ marginRight: 8 }} />
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: lightColors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: lightColors.text.secondary,
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    padding: 18,
    marginBottom: 16,
    position: "relative",
  },
  cardSelected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  cardDisabled: { opacity: 0.5 },
  badge: {
    position: "absolute",
    top: -12,
    right: 14,
    backgroundColor: lightColors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeDisabled: {
    position: "absolute",
    top: -12,
    right: 14,
    backgroundColor: lightColors.text.tertiary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
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
    color: lightColors.text.primary,
  },
  planNameSelected: { color: lightColors.primary },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: lightColors.text.primary,
  },
  priceSelected: { color: lightColors.primary },
  period: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: lightColors.text.tertiary,
    marginLeft: 2,
  },
  divider: { height: 1, backgroundColor: lightColors.border, marginBottom: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  feature: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  featureSelected: { color: lightColors.text.primary },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: lightColors.infoLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: lightColors.info,
  },
  infoText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 18,
  },
});
