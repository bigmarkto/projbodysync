import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useRegister, Gender, UserRole } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton, SelectCard } from "./components";
import { DatePickerField, parseDateOnlyLocal, toLocalDateKey } from "../../components/DateTimePickerField";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "Masculino", value: "masculino" },
  { label: "Feminino", value: "feminino" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não dizer", value: "nao_binario" },
];

function normalizeBirthDate(raw: string): string | null {
  const parsed = parseDateOnlyLocal(raw);
  return parsed ? toLocalDateKey(parsed) : null;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export const Step1PersonalData = ({ onNext, onBack, totalSteps }: Props) => {
  const { data, setField } = useRegister();
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checkField = (field: string, currentData = data): string => {
    switch (field) {
      case "name":
        return currentData.name.trim().length < 3
          ? "Digite seu nome e sobrenome (mínimo de 3 caracteres)."
          : "";
      case "email":
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentData.email.trim())
          ? "Digite um e-mail válido no formato seu@email.com."
          : "";
      case "password":
        if (currentData.password.length < 8) {
          return "Crie uma senha com pelo menos 8 caracteres, 1 letra maiúscula e 1 número.";
        }
        if (!/[A-Z]/.test(currentData.password) || !/[0-9]/.test(currentData.password)) {
          return "Adicione ao menos 1 letra maiúscula e 1 número à sua senha.";
        }
        return "";
      case "confirmPassword":
        return !currentData.confirmPassword || currentData.password !== currentData.confirmPassword
          ? "Digite exatamente a mesma senha criada no campo anterior."
          : "";
      case "birthYear": {
        const normalized = normalizeBirthDate(currentData.birthYear);
        const year = normalized ? parseInt(normalized.split("-")[0], 10) : NaN;
        const currentYear = new Date().getFullYear();
        if (!normalized || isNaN(year) || year < 1920 || year > currentYear - 10) {
          return "Informe uma data de nascimento válida (ex: 15/05/1998).";
        }
        return "";
      }
      case "gender":
        return !currentData.gender ? "Selecione uma opção de sexo para continuar." : "";
      default:
        return "";
    }
  };

  const handleBlurField = (field: string) => {
    if (field === "birthYear") {
      const normalized = normalizeBirthDate(data.birthYear);
      if (normalized && normalized !== data.birthYear) {
        setField("birthYear", normalized);
      }
    }
    const msg = checkField(field);
    setErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const handleChangeField = (
    field: "name" | "email" | "password" | "confirmPassword",
    value: string,
  ) => {
    setField(field, value);
    const nextData = { ...data, [field]: value };
    if (errors[field] && !checkField(field, nextData)) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (field === "password" && errors.confirmPassword && !checkField("confirmPassword", nextData)) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    for (const f of ["name", "email", "password", "confirmPassword", "birthYear", "gender"]) {
      const msg = checkField(f);
      if (msg) e[f] = msg;
    }
    const normalized = normalizeBirthDate(data.birthYear);
    if (!e.birthYear && normalized && normalized !== data.birthYear) {
      setField("birthYear", normalized);
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StepHeader current={1} total={totalSteps} label="Dados pessoais" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Dados pessoais</Text>

        <FieldInput
          label="Nome completo"
          placeholder="Seu nome"
          leftIcon="person-outline"
          value={data.name}
          onChangeText={(v) => handleChangeField("name", v)}
          onBlur={() => handleBlurField("name")}
          error={errors.name}
          autoCapitalize="words"
        />

        <FieldInput
          label="E-mail"
          placeholder="seu@email.com"
          leftIcon="mail-outline"
          value={data.email}
          onChangeText={(v) => handleChangeField("email", v)}
          onBlur={() => handleBlurField("email")}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FieldInput
          label="Senha"
          placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número"
          leftIcon="lock-closed-outline"
          value={data.password}
          onChangeText={(v) => handleChangeField("password", v)}
          onBlur={() => handleBlurField("password")}
          error={errors.password}
          secureTextEntry={!showPass}
          autoCapitalize="none"
          rightElement={
            <TouchableOpacity
              onPress={() => setShowPass((p) => !p)}
              style={s.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPass ? "Ocultar senha" : "Mostrar senha"}
            >
              <Ionicons
                name={showPass ? "eye-outline" : "eye-off-outline"}
                size={18}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          }
        />

        <FieldInput
          label="Confirmar senha"
          placeholder="Repita a senha"
          leftIcon="lock-closed-outline"
          value={data.confirmPassword}
          onChangeText={(v) => handleChangeField("confirmPassword", v)}
          onBlur={() => handleBlurField("confirmPassword")}
          error={errors.confirmPassword}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          rightElement={
            <TouchableOpacity
              onPress={() => setShowConfirm((p) => !p)}
              style={s.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showConfirm ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
            >
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={18}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          }
        />

        {/* Data de nascimento */}
        <DatePickerField
          label="Data de nascimento"
          placeholder="Selecione sua data de nascimento"
          value={data.birthYear}
          minimumDate={new Date(1920, 0, 1)}
          maximumDate={new Date()}
          onChange={(iso) => {
            setField("birthYear", iso);
            setErrors((e) => ({ ...e, birthYear: "" }));
          }}
          error={errors.birthYear}
        />

        {/* Sexo */}
        <Text style={s.fieldLabel}>Sexo</Text>
        <View style={s.genderRow} accessibilityRole="radiogroup">
          {GENDERS.map((g) => {
            const selected = data.gender === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                style={[
                  s.genderChip,
                  selected && s.genderChipSelected,
                ]}
                onPress={() => {
                  setField("gender", g.value);
                  setErrors((e) => ({ ...e, gender: "" }));
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={g.label}
              >
                <Text
                  style={[
                    s.genderChipText,
                    selected && s.genderChipTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!errors.gender && (
          <View style={s.errorRow} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
            <Text style={s.errorText}>{errors.gender}</Text>
          </View>
        )}

        {/* Tipo de usuário */}
        <Text style={[s.fieldLabel, { marginTop: 8 }]}>Tipo de usuário</Text>
        <View style={s.roleRow}>
          {(["comum", "personal"] as UserRole[]).map((role) => (
            <SelectCard
              key={role}
              label={role === "comum" ? "Comum" : "Personal"}
              icon={role === "comum" ? "person-outline" : "barbell-outline"}
              selected={data.role === role}
              onPress={() => {
                if (role !== data.role) {
                  setField("role", role);
                  setField("subscriptionType", "");
                }
              }}
            />
          ))}
        </View>

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
      marginBottom: 20,
    },
    eyeBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    fieldLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    genderRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 4,
    },
    genderChip: {
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: "center",
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    genderChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    genderChipText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
    },
    genderChipTextSelected: { color: colors.primary },
    roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 8,
    },
    errorText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.error,
      flex: 1,
    },
  });
