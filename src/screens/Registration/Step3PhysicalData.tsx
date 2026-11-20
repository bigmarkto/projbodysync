import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRegister } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";
import { useTheme } from "../../context/ThemeProvider";

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
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { data, setField } = useRegister();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const bmi = calcBMI(data.weightKg, data.heightCm);
  const bmiNum = bmi ? parseFloat(bmi) : null;

  const weightDiff =
    data.weightKg && data.desiredWeightKg
      ? (parseFloat(data.weightKg) - parseFloat(data.desiredWeightKg)).toFixed(1)
      : null;

  const checkField = (field: "weightKg" | "heightCm" | "desiredWeightKg", val: string) => {
    const num = parseFloat(val);
    if (field === "weightKg") {
      if (!val || isNaN(num) || num < 20 || num > 300)
        return "Informe seu peso atual entre 20 e 300 kg.";
    } else if (field === "heightCm") {
      if (!val || isNaN(num) || num < 100 || num > 250)
        return "Informe sua altura em centímetros entre 100 e 250 cm.";
    } else if (field === "desiredWeightKg") {
      if (!val || isNaN(num) || num < 20 || num > 300)
        return "Informe o peso desejado entre 20 e 300 kg.";
    }
    return "";
  };

  const handleBlur = (field: "weightKg" | "heightCm" | "desiredWeightKg") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = checkField(field, data[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field: "weightKg" | "heightCm" | "desiredWeightKg", val: string) => {
    setField(field, val);
    if (touched[field] || errors[field]) {
      const err = checkField(field, val);
      if (!err) setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    (["weightKg", "heightCm", "desiredWeightKg"] as const).forEach((f) => {
      const err = checkField(f, data[f]);
      if (err) e[f] = err;
    });
    setTouched({ weightKg: true, heightCm: true, desiredWeightKg: true });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
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

        <FieldInput
          label="Peso atual (kg)"
          placeholder="Ex: 78"
          leftIcon="body-outline"
          value={data.weightKg}
          onChangeText={(v) => handleChange("weightKg", v)}
          onBlur={() => handleBlur("weightKg")}
          error={errors.weightKg}
          keyboardType="decimal-pad"
        />

        <FieldInput
          label="Altura (cm)"
          placeholder="Ex: 175"
          leftIcon="resize-outline"
          value={data.heightCm}
          onChangeText={(v) => handleChange("heightCm", v)}
          onBlur={() => handleBlur("heightCm")}
          error={errors.heightCm}
          keyboardType="decimal-pad"
        />

        <FieldInput
          label="Peso desejado (kg)"
          placeholder="Ex: 72"
          leftIcon="trending-down-outline"
          value={data.desiredWeightKg}
          onChangeText={(v) => handleChange("desiredWeightKg", v)}
          onBlur={() => handleBlur("desiredWeightKg")}
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
              <Text style={[s.bmiStatus, { color: bmiNum >= 18.5 && bmiNum < 25 ? colors.success : colors.warning }]}>
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
    bmiBox: {
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary + "40",
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
      color: colors.text.secondary,
    },
    bmiValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: colors.primary,
    },
    bmiStatus: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
    },
    bmiMeta: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
  });
