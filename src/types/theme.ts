import theme from '../theme';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export type AppTheme = typeof theme;
export type ThemeColors = AppTheme['colors'];
export type ThemeSpacing = AppTheme['space'];
export type ThemeTypography = typeof typography;