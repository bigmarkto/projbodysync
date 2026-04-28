import React from 'react';
import { Container, Text, Card } from '../components/atoms';
import { Switch } from 'react-native';
import { useTheme } from '../context/ThemeProvider';

const SettingsScreen = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Container>
      <Text variant="h1">Settings</Text>
      <Card variant="elevated" mt={4}>
        <Text variant="h3">Appearance</Text>
        <Text variant="body" mt={2}>
          {isDark ? 'Dark Theme' : 'Light Theme'}
        </Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#D0D0D0', true: '#F96D10' }}
          thumbColor={isDark ? '#F96D10' : '#FAFAF9'}
          style={{ marginTop: 12 }}
        />
      </Card>
    </Container>
  );
};

export default SettingsScreen;
