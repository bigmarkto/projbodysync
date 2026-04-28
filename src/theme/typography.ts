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
  fontFamily: {
    regular: "Poppins_400Regular",
    medium: "Poppins_500Medium",
    semibold: "Poppins_600SemiBold",
    bold: "Poppins_700Bold",
  },
  variants: {
    h1: {
      fontSize: "4xl",
      fontFamily: "Poppins_700Bold",
      lineHeight: "tight",
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: "3xl",
      fontFamily: "Poppins_700Bold",
      lineHeight: "tight",
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: "2xl",
      fontFamily: "Poppins_600SemiBold",
      lineHeight: "normal",
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: "lg",
      fontFamily: "Poppins_600SemiBold",
      lineHeight: "normal",
    },
    body: {
      fontSize: "md",
      fontFamily: "Poppins_400Regular",
      lineHeight: "relaxed",
    },
    bodySmall: {
      fontSize: "sm",
      fontFamily: "Poppins_400Regular",
      lineHeight: "normal",
    },
    caption: {
      fontSize: "xs",
      fontFamily: "Poppins_400Regular",
      lineHeight: "tight",
    },
    label: {
      fontSize: "sm",
      fontFamily: "Poppins_600SemiBold",
      lineHeight: "normal",
      letterSpacing: 0.3,
    },
  },
};
