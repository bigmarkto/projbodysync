import React from "react";
import { Button as GSButton, Spinner, Text } from "@gluestack-ui/themed";
import { StyleSheet } from "react-native";

interface CustomButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "full";
  children?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

const Button = ({
  variant = "primary",
  size = "md",
  children,
  isLoading = false,
  disabled = false,
  ...props
}: CustomButtonProps) => {
  const getVariantStyle = () => {
    switch (variant) {
      case "primary":
        return { bg: "$primary500", color: "$white" };
      case "secondary":
        return { bg: "$secondary500", color: "$white" };
      case "outline":
        return {
          bg: "$transparent",
          borderColor: "$primary500",
          borderWidth: 1,
          color: "$primary500",
        };
      case "ghost":
        return { bg: "$transparent", color: "$primary500" };
      case "link":
        return { bg: "$transparent", color: "$primary500" };
      default:
        return { bg: "$primary500", color: "$white" };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { px: "$3", py: "$2", h: 36 };
      case "md":
        return { px: "$4", py: "$2.5", h: 44 };
      case "lg":
        return { px: "$5", py: "$3", h: 52 };
      case "full":
        return { px: "$5", py: "$3", h: 52, w: "100%" };
      default:
        return { px: "$4", py: "$2.5", h: 44 };
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <GSButton
      {...getVariantStyle()}
      {...getSizeStyle()}
      {...props}
      disabled={isDisabled}
      opacity={isDisabled ? 0.5 : 1}
    >
      {isLoading ? (
        <Spinner color="$white" />
      ) : variant === "link" ? (
        <Text
          style={[
            styles.linkText,
            { color: variant === "link" ? "$primary500" : "$white" },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </GSButton>
  );
};

const styles = StyleSheet.create({
  linkText: {
    textDecorationLine: "underline",
  },
});

export default Button;
