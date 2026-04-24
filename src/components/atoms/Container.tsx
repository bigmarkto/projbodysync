import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, ViewProps } from "native-base";

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  padding?: "sm" | "md" | "lg" | "xl" | number;
  variant?: "default" | "compact" | "spacious";
}

const Container = ({
  children,
  safeArea = true,
  padding = "lg",
  variant = "default",
  ...props
}: ContainerProps) => {
  const paddingMap = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  };

  const variantPadding = {
    compact: 12,
    default: 16,
    spacious: 24,
  };

  const finalPadding =
    typeof padding === "string"
      ? paddingMap[padding as keyof typeof paddingMap] ||
        variantPadding[variant]
      : padding;

  const content = (
    <View
      flex={1}
      backgroundColor="background"
      paddingX={finalPadding}
      paddingTop={finalPadding}
      paddingBottom={0}
      {...props}
    >
      {children}
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFBFC" }}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
};

export default Container;
