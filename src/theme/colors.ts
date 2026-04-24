// Minimalist, semantic color system
// Primary accent: Indigo (#6366F1)
// Neutral palette: Slate grays

export default {
  // Primary brand color
  primary: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    500: "#6366F1", // Main primary
    600: "#4F46E5",
    700: "#4338CA",
  },

  // Neutral colors (background, text, borders)
  neutral: {
    0: "#FFFFFF",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  // Semantic backgrounds
  background: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceVariant: "#F9FAFB",

  // Text colors (with proper contrast)
  text: {
    primary: "#111827", // High contrast for body text
    secondary: "#6B7280", // Medium for secondary text
    tertiary: "#9CA3AF", // Low for muted text
    inverse: "#FFFFFF", // For dark backgrounds
  },

  // Feedback colors (semantic, muted)
  success: "#059669",
  successLight: "#ECFDF5",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  info: "#0284C7",
  infoLight: "#F0F9FF",

  // Interactive states
  disabled: "#D1D5DB",
  disabledText: "#9CA3AF",

  // Borders
  border: "#E5E7EB",
  borderHeavy: "#D1D5DB",
};
