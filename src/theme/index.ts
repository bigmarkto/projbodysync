import colors from './colors';
import spacing from './spacing';
import typography from './typography';

export const createTheme = (colors: any) => ({
  colors,
  space: spacing,
  fontSizes: typography.fontSize,
  lineHeights: typography.lineHeight,
  fontWeights: typography.fontWeight,
  sizes: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
    full: '100%',
  },
  radii: {
    none: 0,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },
  shadows: {
    none: 'none',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 8px -1px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 20px -3px rgba(0, 0, 0, 0.08)',
    xl: '0 20px 30px -5px rgba(0, 0, 0, 0.08)',
  },
});

export type Theme = ReturnType<typeof createTheme>;
export default colors;
