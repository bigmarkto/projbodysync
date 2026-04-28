// Gluestack UI Config - Using default config with custom colors
import { config as defaultConfig } from "@gluestack-ui/config";

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
      primary500: "#F96D10",
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
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
  },
};

export type ConfigType = typeof config;
