import React from "react";
import { View, ActivityIndicator, StyleSheet, StatusBar } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeProvider";
import TabNavigator from "./TabNavigator";
import { TrainerMainFlow } from "../screens/Trainer/TrainerMainFlow";
import RegisterScreen from "../screens/Registration/RegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const SplashLoading = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const RootNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors, isDark } = useTheme();

  if (isLoading) return <SplashLoading />;

  const isProfessor = user?.role === "professor";

  return (
    <>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={isProfessor ? TrainerMainFlow : TabNavigator}
          />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default RootNavigator;
