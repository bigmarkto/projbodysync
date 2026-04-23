import { extendTheme } from 'native-base';
import colors from './colors';
import spacing from './spacing';
import typography from './typography';

const theme = extendTheme({
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  },
  space: spacing,
  fontSizes: typography.fontSize,
  fontWeights: typography.fontWeight,
  components: {
    Text: {
      defaultProps: {
        color: 'text.primary',
      },
    },
    Button: {
      defaultProps: {
        colorScheme: 'primary',
      },
    },
  },
});

export type Theme = typeof theme;

export default theme;