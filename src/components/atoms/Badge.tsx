import React from "react";
import { Badge as NBBadge, IBadgeProps } from "native-base";

interface CustomBadgeProps extends IBadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  children?: React.ReactNode;
}

const Badge = ({
  variant = "default",
  size = "sm",
  children,
  ...props
}: CustomBadgeProps) => {
  const variantStyles = {
    default: {
      backgroundColor: "neutral.200",
      _text: { color: "text.primary" },
    },
    success: {
      backgroundColor: "successLight",
      _text: { color: "success" },
    },
    warning: {
      backgroundColor: "warningLight",
      _text: { color: "warning" },
    },
    error: {
      backgroundColor: "errorLight",
      _text: { color: "error" },
    },
    info: {
      backgroundColor: "infoLight",
      _text: { color: "info" },
    },
  };

  const sizeStyles = {
    sm: {
      paddingX: 3,
      paddingY: 15,
      fontSize: "xs",
    },
    md: {
      paddingX: 4,
      paddingY: 15,
      fontSize: "sm",
      minWidth: 24,
    },
  };

  return (
    <NBBadge
      borderRadius="full"
      {...sizeStyles[size]}
      {...variantStyles[variant]}
      _text={{
        fontWeight: "semibold",
        ...variantStyles[variant]._text,
      }}
      {...props}
    >
      {children}
    </NBBadge>
  );
};

export default Badge;
