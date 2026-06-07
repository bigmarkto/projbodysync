import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors } from "../../theme/colors";

// ─── Progress Bar ────────────────────────────────────────────────────────────
interface StepHeaderProps {
  current: number;
  total: number;
  label: string;
  onBack: () => void;
}

import { useNavigation } from "@react-navigation/native";

export const StepHeader = ({ current, total, label, onBack }: StepHeaderProps) => {
  const navigation = useNavigation<any>();
  const handlePress = () => {
    if (current === 1) {
      // Na primeira etapa, volta direto para a tela de login
      navigation.navigate("Login");
    } else {
      onBack();
    }
  };
  return (
    <View style={sh.container}>
      {/* Sempre exibe a seta de volta; o comportamento depende da etapa */}
      <TouchableOpacity
        onPress={handlePress}
        style={sh.back}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color={lightColors.text.primary} />
      </TouchableOpacity>
      <Text style={sh.label}>Etapa {current} de {total}</Text>
      <View style={sh.barTrack}>
        <View style={[sh.barFill, { width: `${(current / total) * 100}%` }]} />
      </View>
    </View>
  );
};

const sh = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  back: { marginBottom: 12 },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.tertiary,
    marginBottom: 8,
  },
  barTrack: {
    height: 4,
    backgroundColor: lightColors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    backgroundColor: lightColors.primary,
    borderRadius: 4,
  },
});

// ─── Field Input ─────────────────────────────────────────────────────────────
interface FieldInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: string;
  rightElement?: React.ReactNode;
}

export const FieldInput = ({ label, error, leftIcon, rightElement, ...props }: FieldInputProps) => (
  <View style={fi.group}>
    <Text style={fi.label}>{label}</Text>
    <View style={[fi.row, !!error && fi.rowError]}>
      {leftIcon && (
        <Ionicons name={leftIcon as any} size={17} color={lightColors.text.tertiary} style={fi.icon} />
      )}
      <TextInput
        style={fi.input}
        placeholderTextColor={lightColors.text.tertiary}
        {...props}
      />
      {rightElement}
    </View>
    {!!error && <Text style={fi.error}>{error}</Text>}
  </View>
);

const fi = StyleSheet.create({
  group: { marginBottom: 14 },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    height: 50,
    paddingHorizontal: 14,
  },
  rowError: { borderColor: "#fca5a5" },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: lightColors.text.primary,
  },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
});

// ─── Continue Button ──────────────────────────────────────────────────────────
interface ContinueButtonProps {
  label?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ContinueButton = ({
  label = "Continuar →",
  onPress,
  loading = false,
  disabled = false,
}: ContinueButtonProps) => (
  <TouchableOpacity
    style={[cb.btn, (disabled || loading) && cb.disabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
  >
    <Text style={cb.text}>{loading ? "Aguarde..." : label}</Text>
  </TouchableOpacity>
);

const cb = StyleSheet.create({
  btn: {
    backgroundColor: lightColors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: lightColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: { opacity: 0.55 },
  text: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});

// ─── SelectCard ───────────────────────────────────────────────────────────────
interface SelectCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  icon?: string;
  disabled?: boolean;
}

export const SelectCard = ({
  label,
  sublabel,
  selected,
  onPress,
  badge,
  icon,
  disabled = false,
}: SelectCardProps) => (
  <TouchableOpacity
    style={[sc.card, selected && sc.selected, disabled && sc.cardDisabled]}
    onPress={disabled ? undefined : onPress}
    activeOpacity={0.8}
  >
    {badge && (
      <View style={sc.badge}>
        <Text style={sc.badgeText}>{badge}</Text>
      </View>
    )}
    {icon && (
      <Ionicons
        name={icon as any}
        size={20}
        color={selected ? lightColors.primary : lightColors.text.tertiary}
        style={{ marginBottom: 4 }}
      />
    )}
    <Text style={[sc.label, selected && sc.labelSelected, disabled && sc.labelDisabled]}>
      {label}
    </Text>
    {sublabel && <Text style={sc.sub}>{sublabel}</Text>}
  </TouchableOpacity>
);

const sc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
    position: "relative",
  },
  selected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  cardDisabled: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: -10,
    right: 8,
    backgroundColor: lightColors.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: lightColors.text.primary,
    textAlign: "center",
  },
  labelSelected: { color: lightColors.primary },
  labelDisabled: { color: lightColors.text.tertiary },
  sub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: lightColors.text.tertiary,
    textAlign: "center",
    marginTop: 2,
  },
});

// ─── InfoBox ──────────────────────────────────────────────────────────────────
interface InfoBoxProps {
  text: string;
  type?: "info" | "warning" | "success";
}

export const InfoBox = ({ text, type = "info" }: InfoBoxProps) => {
  const colors = {
    info: { bg: lightColors.infoLight, border: lightColors.info, icon: "information-circle-outline", text: "#1d4ed8" },
    warning: { bg: lightColors.warningLight, border: lightColors.warning, icon: "alert-circle-outline", text: "#92400e" },
    success: { bg: lightColors.successLight, border: lightColors.success, icon: "checkmark-circle-outline", text: "#065f46" },
  }[type];

  return (
    <View style={[ib.box, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Ionicons name={colors.icon as any} size={16} color={colors.text} style={{ marginRight: 8 }} />
      <Text style={[ib.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const ib = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
