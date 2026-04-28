import React from 'react';
import { Container, Text, Card } from '../components/atoms';

const WorkoutsScreen = () => {
  return (
    <Container>
      <Text variant="h1">Workouts</Text>
      <Card variant="elevated" mt={4}>
        <Text variant="h3">Workout Plans</Text>
        <Text variant="body" mt={2}>
          Browse and create custom workout plans tailored to your fitness
          goals. Track your progress and stay motivated.
        </Text>
      </Card>
    </Container>
  );
};

export default WorkoutsScreen;
