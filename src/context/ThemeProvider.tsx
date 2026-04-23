import React, { ReactNode } from 'react';
import { NativeBaseProvider } from 'native-base';
import theme from '../theme';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NativeBaseProvider theme={theme}>
      {children}
    </NativeBaseProvider>
  );
};

export default ThemeProvider;