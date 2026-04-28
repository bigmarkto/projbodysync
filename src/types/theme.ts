import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;

export interface AppTheme {
  colors: Colors;
  space: Spacing;
  typography: Typography;
}
