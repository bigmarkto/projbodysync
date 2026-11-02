import React from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { useAuth } from "../context/AuthContext";

const SettingsScreen = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 20 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Configurações
      </Text>

      {user && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            {user.name}
          </Text>
          <Text style={[styles.cardBody, { color: colors.text.secondary }]}>
            {user.email}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.card,
          styles.rowCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
            Aparência
          </Text>
          <Text style={[styles.cardBody, { color: colors.text.secondary }]}>
            {isDark ? "Tema Escuro" : "Tema Claro"}
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.borderHeavy, true: colors.primary }}
          thumbColor={isDark ? colors.primary : colors.background}
        />
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.error }]}
        onPress={logout}
        activeOpacity={0.8}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={colors.error}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.logoutText, { color: colors.error }]}>
          Sair da conta
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  cardBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
});

export default SettingsScreen;
