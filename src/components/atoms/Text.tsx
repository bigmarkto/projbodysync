import React from 'react';
import { Text as NBText, TextProps } from 'native-base';

interface CustomTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
}

const Text = ({ variant = 'body', ...props }: CustomTextProps) => {
  const variantStyles = {
    title: {
      fontSize: '3xl',
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 'xl',
      fontWeight: 'semibold',
    },
    body: {
      fontSize: 'md',
      fontWeight: 'normal',
    },
    caption: {
      fontSize: 'sm',
      fontWeight: 'light',
    },
  };

  return <NBText {...variantStyles[variant]} {...props} />;
};

export default Text;