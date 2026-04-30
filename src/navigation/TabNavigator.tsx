import React, { useState } from "react";
import { View, Dimensions, Text, TouchableOpacity } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
import { useTheme } from "../context/ThemeProvider";
import { HomeScreen, WorkoutsScreen, SettingsScreen } from "../screens";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const initialLayout = { width: Dimensions.get("window").width };

const TabNavigator = () => {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const [routes] = useState([
    { key: "home", title: "Home", icon: "home" },
    { key: "workouts", title: "Exercícios", icon: "barbell" },
    { key: "settings", title: "Configurações", icon: "settings" },
  ]);

  const renderScene = SceneMap({
    home: HomeScreen,
    workouts: WorkoutsScreen,
    settings: SettingsScreen,
  });

  const getIconName = (key: string, focused: boolean) => {
    const iconMap: Record<string, string> = {
      home: focused ? "home" : "home-outline",
      workouts: focused ? "barbell" : "barbell-outline",
      settings: focused ? "settings" : "settings-outline",
    };
    return iconMap[key] as keyof typeof Ionicons.glyphMap;
  };

  const getIconColor = (focused: boolean) => {
    return focused ? colors.primary : colors.text.tertiary;
  };

  const renderTabBar = (props: any) => {
    const { navigationState } = props;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          flexDirection: "row",
          paddingBottom: insets.bottom,
        }}
      >
        {navigationState.routes.map((route: any, i: number) => {
          const focused = i === navigationState.index;
          const color = getIconColor(focused);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => setIndex(i)}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: focused ? 3 : 0,
                borderBottomColor: focused ? colors.primary : "transparent",
              }}
            >
              <Ionicons
                name={getIconName(route.key, focused)}
                size={24}
                color={color}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Poppins_500Medium",
                  color: color,
                  marginTop: 4,
                }}
              >
                {route.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={initialLayout}
      renderTabBar={renderTabBar}
      swipeEnabled={true}
      tabBarPosition="bottom"
    />
  );
};

export default TabNavigator;
