import React from "react";
import { IconButton as NBIconButton, IIconButtonProps } from "native-base";

interface CustomIconButtonProps extends IIconButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const IconButton = ({
  variant = "ghost",
  size = "md",
  ...props
}: CustomIconButtonProps) => {
  const sizeMap = {
    sm: 6,
    md: 10,
    lg: 12,
  };

  const variantStyles = {
    primary: {
      backgroundColor: "primary.500",
      _pressed: { backgroundColor: "primary.700" },
      _hover: { backgroundColor: "primary.600" },
      _icon: { color: "white" },
    },
    secondary: {
      backgroundColor: "neutral.100",
      _pressed: { backgroundColor: "neutral.200" },
      _hover: { backgroundColor: "neutral.200" },
      _icon: { color: "text.primary" },
    },
    ghost: {
      backgroundColor: "transparent",
      _pressed: { backgroundColor: "primary.50" },
      _hover: { backgroundColor: "primary.50" },
      _icon: { color: "text.primary" },
    },
    danger: {
      backgroundColor: "transparent",
      _pressed: { backgroundColor: "errorLight" },
      _hover: { backgroundColor: "errorLight" },
      _icon: { color: "error" },
    },
  };

  return (
    <NBIconButton
      borderRadius="md"
      size={sizeMap[size]}
      {...variantStyles[variant]}
      {...props}
    />
  );
};

export default IconButton;
