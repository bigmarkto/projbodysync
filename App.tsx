import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "native-base";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import paperTheme from "./src/theme/paperTheme";
import ThemeProvider from "./src/context/ThemeProvider";
import { ShowcaseScreen } from "./src/screens";
import { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider>
          <NavigationContainer>
            <StatusBar backgroundColor="#6366F1" barStyle="light-content" />
            <Stack.Navigator
              initialRouteName="Showcase"
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
                name="Showcase"
                component={ShowcaseScreen}
                options={{
                  title: "BodySync",
                  headerShown: false,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
