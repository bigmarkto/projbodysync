import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export type RootStackParamList = {
  Main: undefined;
};

export type TabParamList = {
  Home: undefined;
  Workouts: undefined;
  Settings: undefined;
};

export type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Main"
>;

export type HomeScreenNavigationProp = BottomTabNavigationProp<
  TabParamList,
  "Home"
>;

export type WorkoutsScreenNavigationProp = BottomTabNavigationProp<
  TabParamList,
  "Workouts"
>;

export type SettingsScreenNavigationProp = BottomTabNavigationProp<
  TabParamList,
  "Settings"
>;
