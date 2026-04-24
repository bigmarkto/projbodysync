import React from "react";
import { VStack, HStack, Divider } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Button,
  Text,
  Card,
  Container,
  IconButton,
  Badge,
} from "../components/atoms";

const DetailsScreen = ({ navigation }: any) => {
  return (
    <Container padding="lg">
      <VStack space="lg">
        {/* Header */}
        <VStack space="xs">
          <Text variant="h2">Details Screen</Text>
          <Text variant="bodySmall">
            Demonstrating the minimalist design system
          </Text>
        </VStack>

        {/* Main Content Card */}
        <Card variant="elevated">
          <VStack space="md">
            <VStack space="xs">
              <HStack justifyContent="space-between" alignItems="center">
                <Text variant="h3">Sample Item</Text>
                <Badge variant="success">Active</Badge>
              </HStack>
              <Text variant="bodySmall">Last updated: 5 minutes ago</Text>
            </VStack>

            <Divider />

            <Text variant="body">
              This screen demonstrates how the new design system creates clean,
              organized layouts with consistent spacing and typography.
            </Text>

            {/* Actions Section */}
            <VStack space="sm">
              <Text variant="label">Item Actions</Text>
              <HStack space="sm" justifyContent="flex-start">
                <IconButton
                  icon={<MaterialIcons name="edit" size={20} />}
                  variant="secondary"
                  aria-label="Edit item"
                />
                <IconButton
                  icon={<MaterialIcons name="delete" size={20} />}
                  variant="danger"
                  aria-label="Delete item"
                />
                <IconButton
                  icon={<MaterialIcons name="share" size={20} />}
                  variant="secondary"
                  aria-label="Share item"
                />
              </HStack>
            </VStack>

            <Divider />

            {/* Status Examples */}
            <VStack space="sm">
              <Text variant="label">Status Examples</Text>
              <VStack space="sm">
                <HStack space="md" alignItems="center">
                  <Badge variant="success" size="sm">
                    Complete
                  </Badge>
                  <Text variant="body">Task completed successfully</Text>
                </HStack>
                <HStack space="md" alignItems="center">
                  <Badge variant="warning" size="sm">
                    Pending
                  </Badge>
                  <Text variant="body">Action pending approval</Text>
                </HStack>
                <HStack space="md" alignItems="center">
                  <Badge variant="error" size="sm">
                    Failed
                  </Badge>
                  <Text variant="body">Operation failed, please retry</Text>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </Card>

        {/* Info Cards */}
        <Card variant="outlined">
          <VStack space="sm">
            <Text variant="subtitle">Additional Information</Text>
            <Text variant="body">
              The design system uses neutral colors with a single primary accent
              (Indigo) to maintain visual clarity and reduce cognitive load.
            </Text>
          </VStack>
        </Card>

        {/* Navigation Buttons */}
        <VStack space="sm">
          <Button
            variant="primary"
            size="lg"
            onPress={() => navigation.goBack()}
          >
            Go Back to Home
          </Button>
          <Button variant="ghost" onPress={() => navigation.goBack()}>
            Dismiss
          </Button>
        </VStack>
      </VStack>
    </Container>
  );
};

export default DetailsScreen;
