// Typography system optimized for readability and visual hierarchy
export default {
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    thin: "100",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  // Typography presets for semantic usage
  variants: {
    h1: {
      fontSize: "4xl",
      fontWeight: "bold",
      lineHeight: "tight",
    },
    h2: {
      fontSize: "3xl",
      fontWeight: "semibold",
      lineHeight: "tight",
    },
    h3: {
      fontSize: "2xl",
      fontWeight: "semibold",
      lineHeight: "normal",
    },
    subtitle: {
      fontSize: "lg",
      fontWeight: "semibold",
      lineHeight: "normal",
    },
    body: {
      fontSize: "md",
      fontWeight: "normal",
      lineHeight: "normal",
    },
    bodySmall: {
      fontSize: "sm",
      fontWeight: "normal",
      lineHeight: "normal",
    },
    caption: {
      fontSize: "xs",
      fontWeight: "normal",
      lineHeight: "tight",
    },
    label: {
      fontSize: "sm",
      fontWeight: "semibold",
      lineHeight: "normal",
    },
  },
};
