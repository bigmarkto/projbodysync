import React from "react";
import { Box, IBoxProps } from "native-base";

interface CardProps extends IBoxProps {
  children: React.ReactNode;
  variant?: "elevated" | "outlined" | "flat";
}

const Card = ({ children, variant = "elevated", ...props }: CardProps) => {
  const variantStyles = {
    elevated: {
      backgroundColor: "surface",
      borderRadius: "lg",
      shadow: "sm",
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: "surface",
      borderRadius: "lg",
      borderWidth: 1,
      borderColor: "border",
      shadow: "none",
    },
    flat: {
      backgroundColor: "surfaceVariant",
      borderRadius: "lg",
      borderWidth: 0,
      shadow: "none",
    },
  };

  return (
    <Box paddingX={16} paddingY={16} {...variantStyles[variant]} {...props}>
      {children}
    </Box>
  );
};

export default Card;
