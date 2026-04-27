import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Showcase: undefined;
};

export type ShowcaseScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Showcase"
>;
