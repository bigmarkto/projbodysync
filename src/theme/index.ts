import { extendTheme } from "native-base";
import colors from "./colors";
import spacing from "./spacing";
import typography from "./typography";

const theme = extendTheme({
  colors,
  space: spacing,
  fontSizes: typography.fontSize,
  lineHeights: typography.lineHeight,
  fontWeights: typography.fontWeight,
  sizes: {
    // Common component sizes
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
    full: "100%",
  },
  radii: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  components: {
    Text: {
      defaultProps: {
        color: "text.primary",
        lineHeight: "normal",
      },
    },
  },
});

export type Theme = typeof theme;
export default theme;
