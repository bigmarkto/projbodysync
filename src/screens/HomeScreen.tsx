import React from 'react';
import { View } from 'react-native';
import { Button, Text, Input, Card, Container } from '../components/atoms';
import { VStack, Divider } from 'native-base';

const HomeScreen = ({ navigation }: any) => {
  return (
    <Container>
      <VStack space={4}>
        <Text variant="title">Welcome to BodySync</Text>
        <Text variant="body">
          This is a demonstration of the UI foundation with theme and components.
        </Text>

        <Card>
          <Text variant="subtitle" mb={2}>UI Components Demo</Text>

          <Divider my={4} />

          <Text variant="subtitle" mb={2}>Button Variants</Text>
          <VStack space={2}>
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </VStack>

          <Divider my={4} />

          <Text variant="subtitle" mb={2}>Input Examples</Text>
          <VStack space={3}>
            <Input placeholder="Default input" />
            <Input placeholder="Input with label" label="Email" />
            <Input placeholder="Input with error" label="Password" error="Password is required" />
          </VStack>

          <Divider my={4} />

          <Text variant="subtitle" mb={2}>Navigation</Text>
          <Button onPress={() => navigation.navigate('Details')}>
            Go to Details
          </Button>
        </Card>
      </VStack>
    </Container>
  );
};

export default HomeScreen;