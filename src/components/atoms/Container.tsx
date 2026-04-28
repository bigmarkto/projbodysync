import React from "react";
import { Box } from "@gluestack-ui/themed";
import { useTheme } from "../../context/ThemeProvider";

interface ContainerProps {
  children?: React.ReactNode;
  variant?: "default" | "card" | "surface";
  size?: "sm" | "md" | "lg" | "full";
  [key: string]: any;
}

const Container = ({
  variant = "default",
  size = "full",
  children,
  ...props
}: ContainerProps) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case "card":
        return {
          bg: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case "surface":
        return {
          bg: colors.surfaceVariant,
        };
      case "default":
      default:
        return {
          bg: colors.background,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { p: "$2" };
      case "md":
        return { p: "$3" };
      case "lg":
        return { p: "$4" };
      case "full":
        return { p: "$4", w: "100%", flex: 1 };
      default:
        return { p: "$4", w: "100%" };
    }
  };

  return (
    <Box {...getVariantStyle()} {...getSizeStyle()} {...props}>
      {children}
    </Box>
  );
};

export default Container;
