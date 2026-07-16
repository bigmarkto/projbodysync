import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Register: undefined;
};

export type TabParamList = {
  Home: undefined;
  Workouts: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;
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
