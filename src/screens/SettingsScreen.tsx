import React from "react";
import { Container, Text, Card } from "../components/atoms";
import { Switch } from "react-native";
import { useTheme } from "../context/ThemeProvider";

const SettingsScreen = () => {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <Container>
      <Text variant="h1">Settings</Text>
      <Card variant="elevated" mt={4}>
        <Text variant="h3">Appearance</Text>
        <Text variant="body" mt={2}>
          {isDark ? "Dark Theme" : "Light Theme"}
        </Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.borderHeavy, true: colors.primary }}
          thumbColor={isDark ? colors.primary : colors.background}
          style={{ marginTop: 12 }}
        />
      </Card>
    </Container>
  );
};

export default SettingsScreen;
