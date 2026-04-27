// Tipografia com escala refinada para leitura confortável em mobile
export default {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.7,
  },
  fontWeight: {
    thin: "100",
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  variants: {
    h1: {
      fontSize: "4xl",
      fontWeight: "bold",
      lineHeight: "tight",
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: "3xl",
      fontWeight: "semibold",
      lineHeight: "tight",
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: "2xl",
      fontWeight: "semibold",
      lineHeight: "normal",
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: "lg",
      fontWeight: "medium",
      lineHeight: "normal",
    },
    body: {
      fontSize: "md",
      fontWeight: "regular",
      lineHeight: "relaxed",
    },
    bodySmall: {
      fontSize: "sm",
      fontWeight: "regular",
      lineHeight: "normal",
    },
    caption: {
      fontSize: "xs",
      fontWeight: "regular",
      lineHeight: "tight",
    },
    label: {
      fontSize: "sm",
      fontWeight: "semibold",
      lineHeight: "normal",
      letterSpacing: 0.3,
    },
  },
};
