import React from "react";
import { Input as NBInput, IInputProps, FormControl, Text } from "native-base";

interface CustomInputProps extends IInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: "outline" | "filled";
}

const Input = ({
  label,
  error,
  helperText,
  variant = "outline",
  ...props
}: CustomInputProps) => {
  const isInvalid = !!error;

  const variantStyle =
    variant === "outline"
      ? {
          borderWidth: 1,
          borderColor: isInvalid ? "error" : "border",
          backgroundColor: "surface",
          _focus: {
            borderColor: isInvalid ? "error" : "primary.500",
            backgroundColor: "surface",
          },
          _hover: {
            borderColor: isInvalid ? "error" : "neutral.300",
          },
        }
      : {
          borderWidth: 0,
          backgroundColor: "neutral.100",
          _focus: {
            backgroundColor: "neutral.100",
            borderWidth: 1,
            borderColor: isInvalid ? "error" : "primary.500",
          },
          _hover: {
            backgroundColor: "neutral.100",
          },
        };

  return (
    <FormControl isInvalid={isInvalid}>
      {label && (
        <FormControl.Label
          _text={{
            fontSize: "sm",
            fontWeight: "semibold",
            color: "text.primary",
          }}
        >
          {label}
        </FormControl.Label>
      )}
      <NBInput
        borderRadius="md"
        paddingX={3}
        paddingY={2.5}
        fontSize="md"
        fontWeight="normal"
        color="text.primary"
        placeholderTextColor="text.tertiary"
        {...variantStyle}
        {...props}
      />
      {helperText && (
        <FormControl.HelperText
          _text={{ fontSize: "xs", color: "text.tertiary" }}
        >
          {helperText}
        </FormControl.HelperText>
      )}
      {error && (
        <FormControl.ErrorMessage _text={{ fontSize: "xs", color: "error" }}>
          {error}
        </FormControl.ErrorMessage>
      )}
    </FormControl>
  );
};

export default Input;
