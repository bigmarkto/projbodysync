import React from 'react';
import { Button, Text, Card, Container } from '../components/atoms';
import { VStack } from 'native-base';

const DetailsScreen = ({ navigation }: any) => {
  return (
    <Container>
      <VStack space={4}>
        <Text variant="title">Details Screen</Text>
        <Text variant="body">
          This is a secondary screen to demonstrate navigation.
        </Text>

        <Card>
          <Text variant="subtitle" mb={2}>Navigation Demo</Text>
          <Text variant="body" mb={4}>
            You can navigate between screens using the navigation prop.
          </Text>
          <Button onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </Card>
      </VStack>
    </Container>
  );
};

export default DetailsScreen;