import React, { useState, useCallback, useMemo } from "react";
import { View, Dimensions, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
import { useTheme } from "../context/ThemeProvider";
import { TabFocusContext, StudentTabKey } from "../context/TabFocusContext";
import { HomeScreen, WorkoutsScreen, ProgressScreen, SettingsScreen } from "../screens";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const initialLayout = { width: Dimensions.get("window").width };

const TabNavigator = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [visitTick, setVisitTick] = useState<Record<StudentTabKey, number>>({
    home: 0,
    workouts: 0,
    progress: 0,
    settings: 0,
  });

  const [routes] = useState([
    { key: "home", title: "Início", icon: "flash" },
    { key: "workouts", title: "Treinos", icon: "barbell" },
    { key: "progress", title: "Progresso", icon: "stats-chart" },
    { key: "settings", title: "Ajustes", icon: "settings" },
  ]);

  const handleIndexChange = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex);
      const nextKey = routes[nextIndex]?.key as StudentTabKey | undefined;
      if (nextKey) {
        setVisitTick((prev) => ({ ...prev, [nextKey]: (prev[nextKey] ?? 0) + 1 }));
      }
    },
    [routes]
  );

  const navigateTab = useCallback(
    (tabKey: StudentTabKey) => {
      const idx = routes.findIndex((r) => r.key === tabKey);
      if (idx >= 0) handleIndexChange(idx);
    },
    [routes, handleIndexChange]
  );

  const tabFocusValue = useMemo(
    () => ({
      activeTab: (routes[index]?.key ?? "home") as StudentTabKey,
      visitTick,
      navigateTab,
    }),
    [routes, index, visitTick, navigateTab]
  );

  const renderScene = SceneMap({
    home: HomeScreen,
    workouts: WorkoutsScreen,
    progress: ProgressScreen,
    settings: SettingsScreen,
  });

  const getIconName = (key: string, focused: boolean) => {
    const iconMap: Record<string, string> = {
      home: focused ? "flash" : "flash-outline",
      workouts: focused ? "barbell" : "barbell-outline",
      progress: focused ? "stats-chart" : "stats-chart-outline",
      settings: focused ? "settings" : "settings-outline",
    };
    return iconMap[key] as keyof typeof Ionicons.glyphMap;
  };

  const renderTabBar = (props: any) => {
    const { navigationState } = props;

    return (
      <View
        style={[
          styles.tabBarWrapper,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {navigationState.routes.map((route: any, i: number) => {
          const focused = i === navigationState.index;
          const iconColor = focused ? colors.primary : colors.text.tertiary;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => handleIndexChange(i)}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabPill,
                  focused && {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={getIconName(route.key, focused)}
                  size={22}
                  color={iconColor}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    {
                      color: iconColor,
                      fontFamily: focused
                        ? "Poppins_600SemiBold"
                        : "Poppins_400Regular",
                    },
                  ]}
                >
                  {route.title}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <TabFocusContext.Provider value={tabFocusValue}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        initialLayout={initialLayout}
        renderTabBar={renderTabBar}
        swipeEnabled={false}
        tabBarPosition="bottom"
      />
    </TabFocusContext.Provider>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabPill: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 64,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default TabNavigator;
