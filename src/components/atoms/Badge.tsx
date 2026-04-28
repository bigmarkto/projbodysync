import React from "react";
import { Box, Text } from "@gluestack-ui/themed";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "solid" | "outline" | "subtle";
  colorScheme?:
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "warning"
    | "info";
  size?: "sm" | "md" | "lg";
  [key: string]: any;
}

const Badge = ({
  variant = "solid",
  colorScheme = "primary",
  size = "md",
  children,
  ...props
}: BadgeProps) => {
  const getColorScheme = () => {
    const colors: Record<string, any> = {
      primary: {
        bg: "$primary500",
        text: "$white",
        border: "$primary500",
        bgLight: "$primary50",
      },
      secondary: {
        bg: "$secondary500",
        text: "$white",
        border: "$secondary500",
        bgLight: "$secondary50",
      },
      success: {
        bg: "$success",
        text: "$white",
        border: "$success",
        bgLight: "$successLight",
      },
      error: {
        bg: "$error",
        text: "$white",
        border: "$error",
        bgLight: "$errorLight",
      },
      warning: {
        bg: "$warning",
        text: "$white",
        border: "$warning",
        bgLight: "$warningLight",
      },
      info: {
        bg: "$info",
        text: "$white",
        border: "$info",
        bgLight: "$infoLight",
      },
    };
    return colors[colorScheme] || colors.primary;
  };

  const colorStyle = getColorScheme();

  const getVariantStyle = () => {
    switch (variant) {
      case "outline":
        return {
          bg: colorStyle.bgLight || "$transparent",
          borderWidth: 1,
          borderColor: colorStyle.border,
        };
      case "subtle":
        return {
          bg: colorStyle.bgLight || "$transparent",
        };
      case "solid":
      default:
        return {
          bg: colorStyle.bg,
        };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { px: "$2", py: "$0.5" };
      case "md":
        return { px: "$2.5", py: "$1" };
      case "lg":
        return { px: "$3", py: "$1.5" };
      default:
        return { px: "$2.5", py: "$1" };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case "sm":
        return { fontSize: 10 };
      case "md":
        return { fontSize: 12 };
      case "lg":
        return { fontSize: 14 };
      default:
        return { fontSize: 12 };
    }
  };

  return (
    <Box
      {...getVariantStyle()}
      {...getSizeStyle()}
      borderRadius="$sm"
      alignSelf="flex-start"
      {...props}
    >
      <Text
        {...getTextSize()}
        color={variant === "solid" ? colorStyle.text : colorStyle.border}
        fontWeight="$medium"
      >
        {children}
      </Text>
    </Box>
  );
};

export default Badge;
