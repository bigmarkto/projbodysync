import React from 'react';
import { Input as NBInput, IInputProps, FormControl } from 'native-base';

interface CustomInputProps extends IInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = ({ label, error, helperText, ...props }: CustomInputProps) => {
  return (
    <FormControl isInvalid={!!error}>
      {label && <FormControl.Label>{label}</FormControl.Label>}
      <NBInput {...props} />
      {helperText && <FormControl.HelperText>{helperText}</FormControl.HelperText>}
      {error && <FormControl.ErrorMessage>{error}</FormControl.ErrorMessage>}
    </FormControl>
  );
};

export default Input;