import React from 'react';
import { Container, Text, Card } from '../components/atoms';

const HomeScreen = () => {
  return (
    <Container>
      <Text variant="h1">Home</Text>
      <Card variant="elevated" mt={4}>
        <Text variant="h3">Welcome to BodySync</Text>
        <Text variant="body" mt={2}>
          Your fitness journey starts here. Navigate to Workouts or Settings
          using the tabs below.
        </Text>
      </Card>
    </Container>
  );
};

export default HomeScreen;
