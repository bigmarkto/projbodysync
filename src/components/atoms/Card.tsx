import React from 'react';
import { Box, IBoxProps } from 'native-base';

interface CardProps extends IBoxProps {
  children: React.ReactNode;
}

const Card = ({ children, ...props }: CardProps) => {
  return (
    <Box
      backgroundColor="surface"
      borderRadius="lg"
      shadow={2}
      padding="md"
      {...props}>
      {children}
    </Box>
  );
};

export default Card;