import React, { useState } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useTheme } from "../context/ThemeProvider";
import { HomeScreen, WorkoutsScreen, SettingsScreen } from "../screens";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "@gluestack-ui/themed";

const initialLayout = { width: Dimensions.get("window").width };

const TabNavigator = () => {
  const { isDark } = useTheme();
  const [index, setIndex] = useState(0);

  const [routes] = useState([
    { key: "home", title: "Home", icon: "home" },
    { key: "workouts", title: "Workouts", icon: "barbell" },
    { key: "settings", title: "Settings", icon: "settings" },
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
    return focused ? "#F96D10" : isDark ? "#808080" : "#888888";
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: "#F96D10" }}
      style={{
        backgroundColor: isDark ? "#252525" : "#FFFFFF",
        borderTopColor: isDark ? "#3A3A3A" : "#E5E5E5",
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      }}
      activeColor="#F96D10"
      inactiveColor={isDark ? "#808080" : "#888888"}
      renderIcon={({ route, focused }: { route: any; focused: boolean }) => (
        <Ionicons
          name={getIconName(route.key, focused)}
          size={20}
          color={getIconColor(focused)}
        />
      )}
      renderLabel={() => null} // Hide text labels, only show icons
      tabStyle={{ paddingVertical: 8 }}
    />
  );

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
