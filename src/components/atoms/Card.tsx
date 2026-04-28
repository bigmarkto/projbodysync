import React from "react";
import { Box } from "@gluestack-ui/themed";
import { useTheme } from "../../context/ThemeProvider";

interface CardProps {
  children?: React.ReactNode;
  variant?: "elevated" | "outlined" | "filled";
  size?: "sm" | "md" | "lg" | "full";
  [key: string]: any;
}

const Card = ({
  variant = "elevated",
  size = "md",
  children,
  ...props
}: CardProps) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case "outlined":
        return {
          borderWidth: 1,
          borderColor: colors.border,
          bg: colors.surface,
        };
      case "filled":
        return {
          bg: colors.surfaceVariant,
        };
      case "elevated":
      default:
        return {
          bg: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
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
        return { p: "$4", w: "100%" };
      default:
        return { p: "$3" };
    }
  };

  return (
    <Box
      {...getVariantStyle()}
      {...getSizeStyle()}
      borderRadius="$lg"
      {...props}
    >
      {children}
    </Box>
  );
};

export default Card;
