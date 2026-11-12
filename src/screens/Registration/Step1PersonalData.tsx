import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRegister, Gender, UserRole } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton, SelectCard } from "./components";
import { DatePickerField, parseDateOnlyLocal, toLocalDateKey } from "../../components/DateTimePickerField";
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
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (data.name.trim().length < 3) e.name = "Nome deve ter pelo menos 3 caracteres.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "E-mail inválido.";
    if (data.password.length < 8) {
      e.password = "Mínimo 8 caracteres.";
    } else if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      e.password = "Use ao menos 1 letra maiúscula e 1 número.";
    }
    if (data.password !== data.confirmPassword) e.confirmPassword = "As senhas não coincidem.";

    const normalized = normalizeBirthDate(data.birthYear);
    const year = normalized ? parseInt(normalized.split("-")[0], 10) : NaN;
    const currentYear = new Date().getFullYear();
    if (!normalized || isNaN(year) || year < 1920 || year > currentYear - 10) {
      e.birthYear = "Informe uma data válida (ex: 15/05/1998 ou 1998-05-15).";
    } else if (normalized !== data.birthYear) {
      setField("birthYear", normalized);
    }

    if (!data.gender) e.gender = "Selecione um sexo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <SafeAreaView style={s.safe}>
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
          onChangeText={(v) => setField("name", v)}
          error={errors.name}
          autoCapitalize="words"
        />

        <FieldInput
          label="E-mail"
          placeholder="seu@email.com"
          leftIcon="mail-outline"
          value={data.email}
          onChangeText={(v) => setField("email", v)}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FieldInput
          label="Senha"
          placeholder="Mínimo 8 caracteres"
          leftIcon="lock-closed-outline"
          value={data.password}
          onChangeText={(v) => setField("password", v)}
          error={errors.password}
          secureTextEntry={!showPass}
          autoCapitalize="none"
          rightElement={
            <TouchableOpacity onPress={() => setShowPass((p) => !p)}>
              <Ionicons
                name={showPass ? "eye-outline" : "eye-off-outline"}
                size={18}
                color={lightColors.text.tertiary}
              />
            </TouchableOpacity>
          }
        />

        <FieldInput
          label="Confirmar senha"
          placeholder="Repita a senha"
          leftIcon="lock-closed-outline"
          value={data.confirmPassword}
          onChangeText={(v) => setField("confirmPassword", v)}
          error={errors.confirmPassword}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          rightElement={
            <TouchableOpacity onPress={() => setShowConfirm((p) => !p)}>
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={18}
                color={lightColors.text.tertiary}
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
          forceLight
          onChange={(iso) => {
            setField("birthYear", iso);
            setErrors((e) => ({ ...e, birthYear: "" }));
          }}
          error={errors.birthYear}
        />

        {/* Sexo */}
        <Text style={s.fieldLabel}>Sexo</Text>
        <View style={s.genderRow}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[
                s.genderChip,
                data.gender === g.value && s.genderChipSelected,
              ]}
              onPress={() => {
                setField("gender", g.value);
                setErrors((e) => ({ ...e, gender: "" }));
              }}
            >
              <Text
                style={[
                  s.genderChipText,
                  data.gender === g.value && s.genderChipTextSelected,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!errors.gender && <Text style={s.errorText}>{errors.gender}</Text>}

        {/* Tipo de usuário */}
        <Text style={[s.fieldLabel, { marginTop: 4 }]}>Tipo de usuário</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: lightColors.text.primary,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
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
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
  },
  genderChipSelected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  genderChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  genderChipTextSelected: { color: lightColors.primary },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  errorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 8,
  },
});
