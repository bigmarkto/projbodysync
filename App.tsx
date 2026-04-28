import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "./src/theme/gluestackConfig";
import { PaperProvider } from "react-native-paper";
import paperTheme from "./src/theme/paperTheme";
import ThemeProvider from "./src/context/ThemeProvider";
import TabNavigator from "./src/navigation/TabNavigator";
import { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider>
            <NavigationContainer>
              <StatusBar backgroundColor="#F96D10" barStyle="light-content" />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={TabNavigator} />
              </Stack.Navigator>
            </NavigationContainer>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
