import React from "react";
import { Button as NBButton, IButtonProps, Spinner } from "native-base";
import colors from "../../theme/colors";

interface CustomButtonProps extends IButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  ...props
}: CustomButtonProps) => {
  const sizeStyles = {
    sm: {
      paddingY: 2,
      paddingX: 3,
      fontSize: "sm",
      height: 32,
    },
    md: {
      paddingY: 3,
      paddingX: 4,
      fontSize: "md",
      height: 40,
    },
    lg: {
      paddingY: 3.5,
      paddingX: 5,
      fontSize: "md",
      height: 48,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? "disabled" : "primary.500",
      borderRadius: "md",
      _pressed: { backgroundColor: "primary.700" },
      _hover: { backgroundColor: "primary.600" },
    },
    secondary: {
      backgroundColor: disabled ? "neutral.100" : "neutral.100",
      borderRadius: "md",
      _text: { color: disabled ? "disabledText" : "text.primary" },
      _pressed: { backgroundColor: "neutral.200" },
      _hover: { backgroundColor: "neutral.200" },
    },
    ghost: {
      backgroundColor: "transparent",
      borderRadius: "md",
      _text: { color: disabled ? "disabledText" : "primary.500" },
      _pressed: { backgroundColor: "primary.50" },
      _hover: { backgroundColor: "primary.50" },
    },
    danger: {
      backgroundColor: disabled ? "disabled" : "error",
      borderRadius: "md",
      _pressed: { backgroundColor: "#B91C1C" },
      _hover: { backgroundColor: "#991B1B" },
    },
  };

  return (
    <NBButton
      disabled={disabled || isLoading}
      {...sizeStyles[size]}
      {...variantStyles[variant]}
      {...props}
      _text={{
        fontWeight: "semibold",
        color:
          variant === "primary" || variant === "danger" ? "white" : undefined,
        ...props._text,
      }}
      startIcon={
        isLoading ? (
          <Spinner
            size="sm"
            color={variant === "secondary" ? "primary.500" : "white"}
          />
        ) : null
      }
    >
      {props.children}
    </NBButton>
  );
};

export default Button;
