import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
