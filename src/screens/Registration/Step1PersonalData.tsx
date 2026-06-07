import React, { useState } from "react";
import { Modal, View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { useRegister, Gender, UserRole } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton, SelectCard } from "./components";
import { lightColors } from "../../theme/colors";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "Masculino", value: "masculino" },
  { label: "Feminino", value: "feminino" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não dizer", value: "nao_binario" },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export const Step1PersonalData = ({ onNext, onBack, totalSteps }: Props) => {
  const { data, setField } = useRegister();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.name.trim()) e.name = "Informe seu nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "E-mail inválido.";
    if (data.password.length < 8) e.password = "Mínimo 8 caracteres.";
    if (data.password !== data.confirmPassword) e.confirmPassword = "As senhas não coincidem.";
    const year = data.birthYear ? parseInt(data.birthYear.split('-')[0]) : NaN;
    const currentYear = new Date().getFullYear();
    if (!data.birthYear || isNaN(year) || year < 1920 || year > currentYear - 10)
      e.birthYear = "Data de nascimento inválida.";
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

        {/* Data de nascimento (apenas ano) */}
        <TouchableOpacity style={s.timePickerBtn} onPress={() => setShowBirthPicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={lightColors.text.tertiary} style={{ marginRight: 10 }} />
          <Text style={s.timePickerText}>{data.birthYear ? new Date(data.birthYear).getFullYear().toString() : 'Selecione o ano de nascimento'}</Text>
        </TouchableOpacity>
        {showBirthPicker && (
          <Modal
            visible={showBirthPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBirthPicker(false)}
          >
            <View style={s.modalBackdrop}>
              <View style={s.modalContainer}>
                <DateTimePicker
                  mode="date"
                  value={data.birthYear ? new Date(data.birthYear) : new Date()}
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    setShowBirthPicker(false);
                    if (selectedDate) {
                      const iso = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
                      setField('birthYear', iso);
                      setErrors((e) => ({ ...e, birthYear: '' }));
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

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
              onPress={() => setField("role", role)}
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
  birthPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    marginBottom: 16,
  },
  birthPickerText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    marginBottom: 16,
  },
  timePickerText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    padding: 16,
    minWidth: '80%',
  },
  errorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 8,
  },
});
