// Gluestack UI Config - Using default config with custom colors
import { config as defaultConfig } from "@gluestack-ui/config";
import { lightColors } from "./colors";

export const config = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Custom primary colors (BodySync orange)
      primary50: "#fef3c7",
      primary100: "#fde68a",
      primary200: "#fcd34d",
      primary300: "#fbbf24",
      primary400: "#f59e0b",
      primary500: lightColors.primary,
      primary600: "#ea580c",
      primary700: "#dc510b",
      primary800: "#c24610",
      primary900: "#9f390e",
      // Secondary colors
      secondary50: "#f0f9ff",
      secondary100: "#e0f2fe",
      secondary200: "#bae6fd",
      secondary300: "#7dd3fc",
      secondary400: "#38bdf8",
      secondary500: "#0ea5e9",
      secondary600: "#0284c7",
      secondary700: "#0369a1",
      secondary800: "#075985",
      secondary900: "#0c4a6e",
      // Status colors
      success: lightColors.success,
      error: lightColors.error,
      warning: lightColors.warning,
      info: lightColors.info,
      // Status light variants
      successLight: lightColors.successLight,
      errorLight: lightColors.errorLight,
      warningLight: lightColors.warningLight,
      infoLight: lightColors.infoLight,
      // Primary light
      primaryLight: lightColors.primaryLight,
      // Text colors
      textPrimary: lightColors.text.primary,
      textSecondary: lightColors.text.secondary,
      textTertiary: lightColors.text.tertiary,
      textInverse: lightColors.text.inverse,
      // Surface/background colors
      background: lightColors.background,
      surface: lightColors.surface,
      surfaceVariant: lightColors.surfaceVariant,
      // Border colors
      border: lightColors.border,
      borderHeavy: lightColors.borderHeavy,
      // Disabled colors
      disabled: lightColors.disabled,
      disabledText: lightColors.disabledText,
      // Constant colors (same in light and dark)
      white: lightColors.text.inverse,
      black: lightColors.shadow,
    },
  },
};

export type ConfigType = typeof config;
