import React from "react";
import { Text as NBText, TextProps as NBTextProps } from "native-base";

interface CustomTextProps extends NBTextProps {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "subtitle"
    | "body"
    | "bodySmall"
    | "caption"
    | "label";
  children?: React.ReactNode;
}

const Text = ({ variant = "body", children, ...props }: CustomTextProps) => {
  const variantStyles: Record<string, any> = {
    h1: {
      fontSize: "xl",
      fontWeight: "bold",
      lineHeight: "tight",
      color: "text.primary",
    },
    h2: {
      fontSize: "lg",
      fontWeight: "bold",
      lineHeight: "tight",
      color: "text.primary",
    },
    h3: {
      fontSize: "md",
      fontWeight: "semibold",
      lineHeight: "normal",
      color: "text.primary",
    },
    subtitle: {
      fontSize: "lg",
      fontWeight: "semibold",
      lineHeight: "normal",
      color: "text.primary",
    },
    body: {
      fontSize: "md",
      fontWeight: "normal",
      lineHeight: "normal",
      color: "text.primary",
    },
    bodySmall: {
      fontSize: "sm",
      fontWeight: "normal",
      lineHeight: "normal",
      color: "text.secondary",
    },
    caption: {
      fontSize: "xs",
      fontWeight: "normal",
      lineHeight: "tight",
      color: "text.tertiary",
    },
    label: {
      fontSize: "sm",
      fontWeight: "semibold",
      lineHeight: "normal",
      color: "text.primary",
    },
  };

  return (
    <NBText {...variantStyles[variant]} {...props}>
      {children}
    </NBText>
  );
};

export default Text;
