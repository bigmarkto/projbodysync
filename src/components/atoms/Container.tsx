import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, ViewProps } from 'native-base';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

const Container = ({ children, safeArea = true, ...props }: ContainerProps) => {
  if (safeArea) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View flex={1} padding="md" {...props}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View flex={1} padding="md" {...props}>
      {children}
    </View>
  );
};

export default Container;