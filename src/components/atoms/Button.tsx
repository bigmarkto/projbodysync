import React from 'react';
import { Button as NBButton, IButtonProps } from 'native-base';

interface CustomButtonProps extends IButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
}

const Button = ({ variant = 'primary', ...props }: CustomButtonProps) => {
  const variantStyles = {
    primary: {
      backgroundColor: 'primary.500',
      _hover: { backgroundColor: 'primary.600' },
      _pressed: { backgroundColor: 'primary.700' },
    },
    secondary: {
      backgroundColor: 'secondary.500',
      _hover: { backgroundColor: 'secondary.600' },
      _pressed: { backgroundColor: 'secondary.700' },
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'primary.500',
      borderWidth: 1,
      _hover: { backgroundColor: 'primary.50' },
      _pressed: { backgroundColor: 'primary.100' },
    },
  };

  return <NBButton {...variantStyles[variant]} {...props} />;
};

export default Button;