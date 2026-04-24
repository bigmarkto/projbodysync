import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "native-base";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import ThemeProvider from "./src/context/ThemeProvider";
import { HomeScreen, DetailsScreen } from "./src/screens";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ThemeProvider>
          <NavigationContainer>
            <StatusBar backgroundColor="#6366F1" barStyle="light-content" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#FFFFFF",
                },
                headerTintColor: "#111827",
                headerTitleStyle: {
                  fontWeight: "600",
                  fontSize: 18,
                  color: "#111827",
                },
                headerBackTitleVisible: true,
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                  title: "BodySync",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Details"
                component={DetailsScreen}
                options={{
                  title: "Details",
                  headerBackTitleVisible: false,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
