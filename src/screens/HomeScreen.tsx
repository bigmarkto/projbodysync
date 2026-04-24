import React from "react";
import { ScrollView } from "react-native";
import { VStack, HStack, Divider, Box } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Button,
  Text,
  Input,
  Card,
  Container,
  IconButton,
  Badge,
} from "../components/atoms";

const HomeScreen = ({ navigation }: any) => {
  return (
    <Container padding="lg">
      <ScrollView
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <VStack space="xl">
          {/* Header Section */}
          <VStack space="md">
            <Text variant="h1">Welcome to BodySync</Text>
            <Text variant="body" color="text.secondary">
              Modern, minimalist design system for scalable UIs
            </Text>
          </VStack>

          {/* Components Showcase Card */}
          <Card variant="elevated">
            <VStack space="xl">
              {/* 1. Typography Hierarchy */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Typography Hierarchy
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <VStack space="lg">
                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      H1 (32px, Bold)
                    </Text>
                    <Text variant="h1">Heading 1 (H1)</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      H2 (24px, Semibold)
                    </Text>
                    <Text variant="h2">Heading 2 (H2)</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      H3 (20px, Semibold)
                    </Text>
                    <Text variant="h3">Heading 3 (H3)</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      Subtitle (16px, Semibold)
                    </Text>
                    <Text variant="subtitle">Subtitle</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      Body (14px, Normal)
                    </Text>
                    <Text variant="body">Body text - main content</Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      Body Small (12px, Normal)
                    </Text>
                    <Text variant="bodySmall">
                      Small body text - secondary info
                    </Text>
                  </VStack>

                  <VStack space="xs">
                    <Text color="text.tertiary" fontSize="xs">
                      Caption (11px, Normal)
                    </Text>
                    <Text variant="caption">Caption text - metadata</Text>
                  </VStack>
                </VStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 2. Button Variants */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Button Variants
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <VStack space="sm">
                  <Button variant="primary" width="100%">
                    Primary Button
                  </Button>
                  <Button variant="secondary" width="100%">
                    Secondary Button
                  </Button>
                  <Button variant="ghost" width="100%">
                    Ghost Button
                  </Button>
                  <Button variant="danger" width="100%">
                    Danger Button
                  </Button>
                </VStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 3. Button Sizes */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Button Sizes
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <HStack space="sm" justifyContent="space-between">
                  <Button variant="primary" size="sm" flex={1}>
                    Small
                  </Button>
                  <Button variant="primary" size="md" flex={1}>
                    Medium
                  </Button>
                  <Button variant="primary" size="lg" flex={1}>
                    Large
                  </Button>
                </HStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 4. Loading State */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Loading State
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <Button variant="primary" isLoading width="100%">
                  Loading Button
                </Button>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 5. Input Variants */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Input Variants
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <VStack space="md">
                  <Input placeholder="Basic input (outline)" />
                  <Input
                    label="Email"
                    placeholder="user@example.com"
                    helperText="We'll never share your email"
                  />
                  <Input
                    label="Password"
                    placeholder="Enter password"
                    type="password"
                    error="Password must be at least 8 characters"
                  />
                  <Input
                    label="Search (filled variant)"
                    placeholder="Search..."
                    variant="filled"
                  />
                </VStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 6. Status Badges */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Status Badges
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <HStack space="sm" flexWrap="wrap">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </HStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 7. Icon Buttons - CRUD Actions */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Icon Buttons (CRUD Actions)
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <VStack space="md">
                  <Text variant="bodySmall" color="text.secondary">
                    Ghost Variant (Recommended)
                  </Text>
                  <HStack space="md" alignItems="center">
                    <IconButton
                      icon={<MaterialIcons name="edit" size={24} />}
                      variant="ghost"
                      aria-label="Edit"
                    />
                    <Text variant="body">Edit</Text>
                  </HStack>

                  <Text variant="bodySmall" color="text.secondary">
                    Danger Variant
                  </Text>
                  <HStack space="md" alignItems="center">
                    <IconButton
                      icon={<MaterialIcons name="delete" size={24} />}
                      variant="danger"
                      aria-label="Delete"
                    />
                    <Text variant="body">Delete</Text>
                  </HStack>

                  <Text variant="bodySmall" color="text.secondary">
                    Secondary Variant
                  </Text>
                  <HStack space="md" alignItems="center">
                    <IconButton
                      icon={<MaterialIcons name="visibility" size={24} />}
                      variant="secondary"
                      aria-label="View"
                    />
                    <Text variant="body">View</Text>
                  </HStack>

                  <Text variant="bodySmall" color="text.secondary">
                    More Actions
                  </Text>
                  <HStack space="md" alignItems="center">
                    <IconButton
                      icon={<MaterialIcons name="more-vert" size={24} />}
                      variant="ghost"
                      aria-label="More"
                    />
                    <Text variant="body">More</Text>
                  </HStack>
                </VStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* 8. Card Variants */}
              <VStack space="md">
                <HStack alignItems="center">
                  <Box
                    width="3"
                    height="8"
                    backgroundColor="primary.500"
                    borderRadius="sm"
                  />
                  <Text variant="label" ml="md">
                    Card Variants
                  </Text>
                </HStack>
                <Divider borderColor="neutral.200" />

                <VStack space="md">
                  <Card variant="elevated">
                    <VStack space="sm">
                      <Text variant="subtitle">Elevated Card</Text>
                      <Text variant="body">
                        Subtle shadow for depth and hierarchy
                      </Text>
                    </VStack>
                  </Card>

                  <Card variant="outlined">
                    <VStack space="sm">
                      <Text variant="subtitle">Outlined Card</Text>
                      <Text variant="body">
                        Border style for flat, minimalist design
                      </Text>
                    </VStack>
                  </Card>

                  <Card variant="flat">
                    <VStack space="sm">
                      <Text variant="subtitle">Flat Card</Text>
                      <Text variant="body">
                        Alternative background for visual distinction
                      </Text>
                    </VStack>
                  </Card>
                </VStack>
              </VStack>

              <Divider borderColor="neutral.200" />

              {/* Navigation Button */}
              <Button
                variant="primary"
                size="lg"
                width="100%"
                onPress={() => navigation.navigate("Details")}
              >
                Go to Details Screen
              </Button>
            </VStack>
          </Card>
        </VStack>
      </ScrollView>
    </Container>
  );
};

export default HomeScreen;
