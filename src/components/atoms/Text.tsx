import React from "react";
import { Text as GSText, Box } from "@gluestack-ui/themed";

type GSTextProps = React.ComponentProps<typeof GSText>;

interface CustomTextProps extends GSTextProps {
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
  mt?: number | string;
  mb?: number | string;
  mr?: number | string;
  ml?: number | string;
  mx?: number | string;
  my?: number | string;
  m?: number | string;
}

const Text = ({ variant = "body", mt, mb, mr, ml, mx, my, m, children, ...props }: CustomTextProps) => {
  const variantStyles: Record<string, any> = {
    h1: {
      fontSize: "$2xl",
      fontWeight: "$bold",
      color: "$text.primary",
    },
    h2: {
      fontSize: "$xl",
      fontWeight: "$bold",
      color: "$text.primary",
    },
    h3: {
      fontSize: "$lg",
      fontWeight: "$semibold",
      color: "$text.primary",
    },
    subtitle: {
      fontSize: "$lg",
      fontWeight: "$semibold",
      color: "$text.primary",
    },
    body: {
      fontSize: "$md",
      fontWeight: "$normal",
      color: "$text.primary",
    },
    bodySmall: {
      fontSize: "$sm",
      fontWeight: "$normal",
      color: "$text.secondary",
    },
    caption: {
      fontSize: "$xs",
      fontWeight: "$normal",
      color: "$text.tertiary",
    },
    label: {
      fontSize: "$sm",
      fontWeight: "$semibold",
      color: "$text.primary",
    },
  };

  const marginProps: any = {};
  if (mt !== undefined) marginProps.marginTop = mt;
  if (mb !== undefined) marginProps.marginBottom = mb;
  if (mr !== undefined) marginProps.marginRight = mr;
  if (ml !== undefined) marginProps.marginLeft = ml;
  if (mx !== undefined) { marginProps.marginLeft = mx; marginProps.marginRight = mx; }
  if (my !== undefined) { marginProps.marginTop = my; marginProps.marginBottom = my; }
  if (m !== undefined) marginProps.margin = m;

  return (
    <GSText {...variantStyles[variant]} {...marginProps} {...props}>
      {children}
    </GSText>
  );
};

export default Text;
