import { MD3LightTheme } from 'react-native-paper';
import colors from './colors';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary[500],
    secondary: colors.primary[600],
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
  },
};

export default paperTheme;
