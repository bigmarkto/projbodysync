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
import { useRegister, Modality } from "./RegisterContext";
import { StepHeader, ContinueButton, InfoBox } from "./components";
import { lightColors } from "../../theme/colors";

// ─── Configuração de modalidades ─────────────────────────────────────────────
// Para adicionar uma nova modalidade: insira um novo item aqui.
// O `id` deve corresponder ao tipo Modality em RegisterContext.tsx.
// Ao adicionar, também atualize o tipo Modality no RegisterContext.
const MODALITIES_CONFIG: {
  id: Modality;
  label: string;
  icon: string;
  difficulty: string;
  availableFor: ("free" | "premium")[];
}[] = [
  {
    id: "musculacao",
    label: "Musculação",
    icon: "barbell-outline",
    difficulty: "Médio",
    availableFor: ["free", "premium"],
  },
  {
    id: "calistenia",
    label: "Calistenia",
    icon: "body-outline",
    difficulty: "Fácil",
    availableFor: ["free", "premium"],
  },
  // ── Adicione novas modalidades abaixo ──
  // {
  //   id: "yoga",
  //   label: "Yoga",
  //   icon: "leaf-outline",
  //   difficulty: "Fácil",
  //   availableFor: ["free", "premium"],
  // },
  // {
  //   id: "crossfit",
  //   label: "CrossFit",
  //   icon: "flash-outline",
  //   difficulty: "Avançado",
  //   availableFor: ["premium"],
  // },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
  currentStep: number;
}

export const Step5Modalities = ({ onNext, onBack, totalSteps, currentStep }: Props) => {
  const { data, setField } = useRegister();
  const [error, setError] = useState("");

  const isPremium = data.subscriptionType === "premium";
  const maxModalities = isPremium ? 3 : 1;

  const toggle = (id: Modality) => {
    setError("");
    if (data.modalities.includes(id)) {
      setField("modalities", data.modalities.filter((m) => m !== id));
    } else {
      if (data.modalities.length >= maxModalities) {
        setError(
          isPremium
            ? "Máximo de 3 modalidades para o plano Premium."
            : "O plano Free permite apenas 1 modalidade."
        );
        return;
      }
      setField("modalities", [...data.modalities, id]);
    }
  };

  const handleNext = () => {
    if (data.modalities.length === 0) {
      setError("Selecione ao menos uma modalidade.");
      return;
    }
    onNext();
  };

  return (
    <SafeAreaView style={s.safe}>
      <StepHeader current={currentStep} total={totalSteps} label="Modalidades" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Modalidades</Text>
        <Text style={s.subtitle}>
          {isPremium
            ? "Escolha até 3 modalidades (plano Premium)"
            : "Escolha 1 modalidade (plano Free)"}
        </Text>

        <View style={s.grid}>
          {MODALITIES_CONFIG.map((m) => {
            const selected = data.modalities.includes(m.id);
            const isLocked = !m.availableFor.includes(
              (data.subscriptionType as "free" | "premium") || "free"
            );

            return (
              <TouchableOpacity
                key={m.id}
                style={[s.card, selected && s.cardSelected, isLocked && s.cardLocked]}
                onPress={() => (!isLocked ? toggle(m.id) : null)}
                activeOpacity={isLocked ? 1 : 0.8}
              >
                {isLocked && (
                  <View style={s.lockBadge}>
                    <Ionicons name="lock-closed" size={10} color="#fff" />
                    <Text style={s.lockText}>Premium</Text>
                  </View>
                )}
                <Ionicons
                  name={m.icon as any}
                  size={28}
                  color={selected ? lightColors.primary : isLocked ? lightColors.text.tertiary : lightColors.text.secondary}
                  style={{ marginBottom: 8 }}
                />
                <Text style={[s.cardLabel, selected && s.cardLabelSelected, isLocked && s.cardLabelLocked]}>
                  {m.label}
                </Text>
                <View style={[s.diffBadge, selected && s.diffBadgeSelected]}>
                  <Text style={[s.diffText, selected && s.diffTextSelected]}>
                    {m.difficulty}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Text style={s.counter}>
          {data.modalities.length} de {maxModalities} selecionadas
        </Text>

        {!isPremium && (
          <InfoBox
            text="Faça upgrade para o plano Premium e acesse até 3 modalidades."
            type="info"
          />
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    padding: 18,
    alignItems: "center",
    position: "relative",
  },
  cardSelected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  cardLocked: { opacity: 0.45 },
  lockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightColors.text.tertiary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  lockText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9,
    color: "#fff",
  },
  cardLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: lightColors.text.primary,
    marginBottom: 6,
  },
  cardLabelSelected: { color: lightColors.primary },
  cardLabelLocked: { color: lightColors.text.tertiary },
  diffBadge: {
    backgroundColor: lightColors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  diffBadgeSelected: { backgroundColor: lightColors.primary + "30" },
  diffText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: lightColors.text.secondary,
  },
  diffTextSelected: { color: lightColors.primary },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  errorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#dc2626",
  },
  counter: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.tertiary,
    marginBottom: 16,
    textAlign: "center",
  },
});
