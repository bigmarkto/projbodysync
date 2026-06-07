import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import TabNavigator from "./TabNavigator";
import RegisterScreen from "../screens/Registration/RegisterScreen";
import LoginScreen from "../screens/LoginScreen";
import { RootStackParamList } from "./types";
import { lightColors } from "../theme/colors";

const Stack = createNativeStackNavigator<RootStackParamList>();

const SplashLoading = () => (
  <View style={styles.splash}>
    <ActivityIndicator size="large" color={lightColors.primary} />
  </View>
);

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashLoading />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      {isAuthenticated ? (
                    <Stack.Screen name="Main" component={TabNavigator} />
                  ) : (
                    <>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
                  )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightColors.background,
  },
});

export default RootNavigator;
