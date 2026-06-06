import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "./src/theme/gluestackConfig";
import { PaperProvider } from "react-native-paper";
import paperTheme from "./src/theme/paperTheme";
import ThemeProvider from "./src/context/ThemeProvider";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GluestackUIProvider config={config}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider>
            <AuthProvider>
              <NavigationContainer>
                <StatusBar backgroundColor="#F96D10" barStyle="light-content" />
                <RootNavigator />
              </NavigationContainer>
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
