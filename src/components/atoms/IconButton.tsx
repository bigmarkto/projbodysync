import React from "react";
import { Pressable } from "@gluestack-ui/themed";
import { StyleSheet } from "react-native";

interface IconButtonProps {
  icon: React.ComponentType<any>;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  onPress?: () => void;
  [key: string]: any;
}

const IconButton = ({
  variant = "primary",
  size = "md",
  icon: IconComponent,
  isDisabled = false,
  onPress,
  ...props
}: IconButtonProps) => {
  const getVariantStyle = () => {
    switch (variant) {
      case "primary":
        return { bg: "$primary500", color: "$white" };
      case "secondary":
        return { bg: "$secondary500", color: "$white" };
      case "outline":
        return {
          bg: "$transparent",
          borderWidth: 1,
          borderColor: "$primary500",
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
        return { w: 32, h: 32 };
      case "md":
        return { w: 40, h: 40 };
      case "lg":
        return { w: 48, h: 48 };
      default:
        return { w: 40, h: 40 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 16;
      case "md":
        return 20;
      case "lg":
        return 24;
      default:
        return 20;
    }
  };

  return (
    <Pressable
      {...getVariantStyle()}
      {...getSizeStyle()}
      borderRadius="$md"
      alignItems="center"
      justifyContent="center"
      onPress={isDisabled ? undefined : onPress}
      opacity={isDisabled ? 0.5 : 1}
      {...props}
    >
      {IconComponent && (
        <IconComponent
          width={getIconSize()}
          height={getIconSize()}
          color={
            variant === "outline" || variant === "ghost" || variant === "link"
              ? "$primary500"
              : "$white"
          }
        />
      )}
    </Pressable>
  );
};

export default IconButton;
