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
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeProvider";

// ─── Progress Bar ────────────────────────────────────────────────────────────
interface StepHeaderProps {
  current: number;
  total: number;
  label: string;
  onBack: () => void;
}

export const StepHeader = ({ current, total, label, onBack }: StepHeaderProps) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const handlePress = () => {
    if (current === 1) {
      navigation.navigate("Login");
    } else {
      onBack();
    }
  };

  return (
    <View style={sh.container}>
      <TouchableOpacity
        onPress={handlePress}
        style={sh.back}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={[sh.label, { color: colors.text.tertiary }]}>
        Etapa {current} de {total}
      </Text>
      <View style={[sh.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            sh.barFill,
            {
              width: `${(current / total) * 100}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
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
    marginBottom: 8,
  },
  barTrack: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
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

export const FieldInput = ({ label, error, leftIcon, rightElement, ...props }: FieldInputProps) => {
  const { colors } = useTheme();

  return (
    <View style={fi.group}>
      <Text style={[fi.label, { color: colors.text.secondary }]}>{label}</Text>
      <View
        style={[
          fi.row,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={17}
            color={colors.text.tertiary}
            style={fi.icon}
          />
        )}
        <TextInput
          style={[fi.input, { color: colors.text.primary }]}
          placeholderTextColor={colors.text.tertiary}
          {...props}
        />
        {rightElement}
      </View>
      {!!error && <Text style={[fi.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const fi = StyleSheet.create({
  group: { marginBottom: 14 },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 14,
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
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
}: ContinueButtonProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        cb.btn,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
        (disabled || loading) && cb.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <Text style={cb.text}>{loading ? "Aguarde..." : label}</Text>
    </TouchableOpacity>
  );
};

const cb = StyleSheet.create({
  btn: {
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: { opacity: 0.55 },
  text: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
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
}: SelectCardProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        sc.card,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primaryLight : colors.card,
        },
        disabled && sc.cardDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.8}
    >
      {badge && (
        <View style={[sc.badge, { backgroundColor: colors.primary }]}>
          <Text style={sc.badgeText}>{badge}</Text>
        </View>
      )}
      {icon && (
        <Ionicons
          name={icon as any}
          size={20}
          color={selected ? colors.primary : colors.text.tertiary}
          style={{ marginBottom: 4 }}
        />
      )}
      <Text
        style={[
          sc.label,
          { color: selected ? colors.primary : disabled ? colors.text.tertiary : colors.text.primary },
        ]}
      >
        {label}
      </Text>
      {sublabel && (
        <Text style={[sc.sub, { color: colors.text.tertiary }]}>{sublabel}</Text>
      )}
    </TouchableOpacity>
  );
};

const sc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
    position: "relative",
  },
  cardDisabled: { opacity: 0.4 },
  badge: {
    position: "absolute",
    top: -10,
    right: 8,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#FFFFFF",
  },
  label: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  sub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
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
  const { colors } = useTheme();

  const cfg = {
    info: {
      bg: colors.infoLight,
      border: colors.info + "55",
      icon: "information-circle-outline",
      text: colors.info,
    },
    warning: {
      bg: colors.warningLight,
      border: colors.warning + "55",
      icon: "alert-circle-outline",
      text: colors.warning,
    },
    success: {
      bg: colors.successLight,
      border: colors.success + "55",
      icon: "checkmark-circle-outline",
      text: colors.success,
    },
  }[type];

  return (
    <View style={[ib.box, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon as any} size={16} color={cfg.text} style={{ marginRight: 8 }} />
      <Text style={[ib.text, { color: cfg.text }]}>{text}</Text>
    </View>
  );
};

const ib = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
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