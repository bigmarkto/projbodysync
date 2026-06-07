import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRegister } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton, InfoBox } from "./components";
import { lightColors } from "../../theme/colors";

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
  currentStep: number;
}

const calcBMI = (weight: string, height: string): string | null => {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h || h <= 0) return null;
  return (w / (h * h)).toFixed(1);
};

const bmiLabel = (bmi: number): string => {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso normal ✓";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
};

export const Step3PhysicalData = ({ onNext, onBack, totalSteps, currentStep }: Props) => {
  const { data, setField } = useRegister();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bmi = calcBMI(data.weightKg, data.heightCm);
  const bmiNum = bmi ? parseFloat(bmi) : null;

  const weightDiff =
    data.weightKg && data.desiredWeightKg
      ? (parseFloat(data.weightKg) - parseFloat(data.desiredWeightKg)).toFixed(1)
      : null;

  const validate = () => {
    const e: Record<string, string> = {};
    const w = parseFloat(data.weightKg);
    const h = parseFloat(data.heightCm);
    const dw = parseFloat(data.desiredWeightKg);
    if (!data.weightKg || isNaN(w) || w < 20 || w > 300) e.weightKg = "Peso inválido (20–300 kg).";
    if (!data.heightCm || isNaN(h) || h < 100 || h > 250) e.heightCm = "Altura inválida (100–250 cm).";
    if (!data.desiredWeightKg || isNaN(dw) || dw < 20 || dw > 300)
      e.desiredWeightKg = "Peso desejado inválido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <SafeAreaView style={s.safe}>
      <StepHeader current={currentStep} total={totalSteps} label="Dados físicos" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Dados físicos</Text>
        <Text style={s.subtitle}>
          Nos conte sobre seu corpo para personalizarmos sua experiência.
        </Text>

        <View style={s.row}>
          <View style={s.col}>
            <FieldInput
              label="Peso atual (kg)"
              placeholder="Ex: 78"
              leftIcon="body-outline"
              value={data.weightKg}
              onChangeText={(v) => setField("weightKg", v)}
              error={errors.weightKg}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.col}>
            <FieldInput
              label="Altura (cm)"
              placeholder="Ex: 175"
              leftIcon="resize-outline"
              value={data.heightCm}
              onChangeText={(v) => setField("heightCm", v)}
              error={errors.heightCm}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <FieldInput
          label="Peso desejado (kg)"
          placeholder="Ex: 72"
          leftIcon="trending-down-outline"
          value={data.desiredWeightKg}
          onChangeText={(v) => setField("desiredWeightKg", v)}
          error={errors.desiredWeightKg}
          keyboardType="decimal-pad"
        />

        {bmiNum && (
          <View style={s.bmiBox}>
            <View style={s.bmiRow}>
              <View>
                <Text style={s.bmiLabel}>IMC estimado</Text>
                <Text style={s.bmiValue}>{bmi}</Text>
              </View>
              <Text style={[s.bmiStatus, { color: bmiNum >= 18.5 && bmiNum < 25 ? lightColors.success : lightColors.warning }]}>
                {bmiLabel(bmiNum)}
              </Text>
            </View>
            {weightDiff && parseFloat(weightDiff) !== 0 && (
              <Text style={s.bmiMeta}>
                Meta: {parseFloat(weightDiff) > 0 ? `−${weightDiff}` : `+${Math.abs(parseFloat(weightDiff))}`} kg — estimativa de{" "}
                {Math.round(Math.abs(parseFloat(weightDiff)) / 0.5)} semanas no plano recomendado.
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
        <ContinueButton onPress={() => { if (validate()) onNext(); }} />
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
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  bmiBox: {
    backgroundColor: lightColors.primaryLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: lightColors.primary + "40",
  },
  bmiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bmiLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: lightColors.text.secondary,
  },
  bmiValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: lightColors.primary,
  },
  bmiStatus: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  bmiMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: lightColors.text.secondary,
    lineHeight: 18,
  },
});
