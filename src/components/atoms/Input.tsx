import React from "react";
import {
  Input as GSInput,
  InputField,
  InputIcon,
  InputSlot,
  Text,
  Box,
} from "@gluestack-ui/themed";
import { StyleSheet } from "react-native";

interface CustomInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "filled" | "underlined";
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  errorMessage?: string;
  showErrorMessage?: boolean;
  [key: string]: any;
}

const Input = ({
  size = "md",
  variant = "outline",
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  leftIcon,
  rightIcon,
  errorMessage,
  showErrorMessage = false,
  value,
  onChangeText,
  placeholder,
  ...props
}: CustomInputProps) => {
  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { h: 36 };
      case "md":
        return { h: 44 };
      case "lg":
        return { h: 52 };
      default:
        return { h: 44 };
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "filled":
        return { bg: "$neutral100", borderWidth: 0 };
      case "underlined":
        return {
          borderWidth: 0,
          borderBottomWidth: 1,
          borderColor: isInvalid ? "$error" : "$border",
          borderRadius: 0,
        };
      case "outline":
      default:
        return {
          borderWidth: 1,
          borderColor: isInvalid ? "$error" : "$border",
        };
    }
  };

  return (
    <>
      <GSInput
        {...getSizeStyle()}
        {...getVariantStyle()}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
        {...props}
      >
        {leftIcon && (
          <InputSlot style={styles.inputSlot}>
            <InputIcon as={leftIcon} />
          </InputSlot>
        )}
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="$text.tertiary"
          readOnly={isReadOnly}
          style={styles.inputField}
        />
        {rightIcon && (
          <InputSlot style={styles.inputSlot}>
            <InputIcon as={rightIcon} />
          </InputSlot>
        )}
      </GSInput>
      {showErrorMessage && isInvalid && errorMessage && (
        <Box style={{ marginTop: 4 }}>
          <Text color="#ef4444" fontSize={12}>
            {errorMessage}
          </Text>
        </Box>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inputSlot: {
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 12,
  },
});

export default Input;
