import { MD3LightTheme } from 'react-native-paper';
import { lightColors } from './colors';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.primaryLight,
    error: lightColors.error,
    background: lightColors.background,
    surface: lightColors.surface,
  },
};

export default paperTheme;
