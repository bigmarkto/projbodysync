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
import colors from "../theme/colors";
import spacing from "../theme/spacing";

const ShowcaseScreen = () => {
  return (
    <Container>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <VStack space="lg" padding="lg">
          {/* Header */}
          <VStack space="sm">
            <Text variant="h2">Component Library</Text>
            <Text variant="bodySmall">BodySync Design System</Text>
          </VStack>

          {/* TYPOGRAPHY */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Typography
            </Text>
            <VStack space="lg">
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  h1
                </Text>
                <Text variant="h1" flex={1}>
                  Heading 1
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  h2
                </Text>
                <Text variant="h2" flex={1}>
                  Heading 2
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  h3
                </Text>
                <Text variant="h3" flex={1}>
                  Heading 3
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  subtitle
                </Text>
                <Text variant="subtitle" flex={1}>
                  Subtitle
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  body
                </Text>
                <Text variant="body" flex={1}>
                  Body text
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  bodySmall
                </Text>
                <Text variant="bodySmall" flex={1}>
                  Body small
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  caption
                </Text>
                <Text variant="caption" flex={1}>
                  Caption text
                </Text>
              </HStack>
              <HStack alignItems="center" space="md">
                <Text variant="caption" color="text.tertiary" width="28%">
                  label
                </Text>
                <Text variant="label" flex={1}>
                  Label
                </Text>
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* SPACING */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Spacing
            </Text>
            <VStack space="sm">
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing.xs}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  xs — 4px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing.sm}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  sm — 8px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing.md}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  md — 12px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing.lg}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  lg — 16px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing.xl}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  xl — 24px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing["2xl"]}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  2xl — 32px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing["3xl"]}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  3xl — 48px
                </Text>
              </HStack>
              <HStack alignItems="center" space="sm">
                <Box
                  width={spacing["4xl"]}
                  height={8}
                  backgroundColor="primary.500"
                  borderRadius="sm"
                />
                <Text variant="caption" color="text.tertiary">
                  4xl — 64px
                </Text>
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* COLORS */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Colors
            </Text>

            {/* Primary scale */}
            <VStack space="sm">
              <Text variant="bodySmall" color="text.secondary">
                Primary scale
              </Text>
              <HStack space="md" justifyContent="center">
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.primary[50]}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    50
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.primary[100]}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    100
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.primary[500]}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    500
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.primary[600]}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    600
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.primary[700]}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    700
                  </Text>
                </VStack>
              </HStack>
            </VStack>

            {/* Semantic colors */}
            <VStack space="sm">
              <Text variant="bodySmall" color="text.secondary">
                Semantic colors
              </Text>
              <HStack space="md" justifyContent="center">
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.success}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    success
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.error}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    error
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.warning}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    warning
                  </Text>
                </VStack>
                <VStack alignItems="center" space="xs">
                  <Box
                    size={40}
                    backgroundColor={colors.info}
                    borderRadius="md"
                  />
                  <Text variant="caption" textAlign="center">
                    info
                  </Text>
                </VStack>
              </HStack>
            </VStack>

            {/* Neutral scale */}
            <VStack space="sm">
              <Text variant="bodySmall" color="text.secondary">
                Neutral scale
              </Text>
              <HStack space="xs" justifyContent="center" flexWrap="wrap">
                <Box
                  size={28}
                  backgroundColor={colors.neutral[100]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[200]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[300]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[400]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[500]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[600]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[700]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[800]}
                  borderRadius="sm"
                />
                <Box
                  size={28}
                  backgroundColor={colors.neutral[900]}
                  borderRadius="sm"
                />
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* BUTTONS */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Buttons
            </Text>

            {/* Variants */}
            <VStack space="sm">
              <Button variant="primary" width="100%">
                Primary
              </Button>
              <Button variant="secondary" width="100%">
                Secondary
              </Button>
              <Button variant="ghost" width="100%">
                Ghost
              </Button>
              <Button variant="danger" width="100%">
                Danger
              </Button>
              <Button variant="primary" isLoading width="100%">
                Loading
              </Button>
              <Button variant="primary" disabled width="100%">
                Disabled
              </Button>
            </VStack>

            {/* Sizes */}
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

          <Divider />

          {/* INPUTS */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Inputs
            </Text>
            <VStack space="md">
              <Input placeholder="Placeholder text" />
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
              <Input label="Search" placeholder="Search..." variant="filled" />
            </VStack>
          </VStack>

          <Divider />

          {/* BADGES */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Badges
            </Text>
            <HStack space="sm" flexWrap="wrap">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </HStack>
            <HStack space="sm" flexWrap="wrap">
              <Badge variant="default" size="sm">
                Default
              </Badge>
              <Badge variant="success" size="sm">
                Success
              </Badge>
              <Badge variant="warning" size="sm">
                Warning
              </Badge>
              <Badge variant="error" size="sm">
                Error
              </Badge>
              <Badge variant="info" size="sm">
                Info
              </Badge>
            </HStack>
          </VStack>

          <Divider />

          {/* ICON BUTTONS */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Icon Buttons
            </Text>
            <HStack space="md" justifyContent="center">
              <VStack alignItems="center" space="xs">
                <IconButton
                  icon={<MaterialIcons name="edit" size={24} />}
                  variant="ghost"
                  aria-label="Edit"
                />
                <Text variant="caption" textAlign="center">
                  ghost
                </Text>
              </VStack>
              <VStack alignItems="center" space="xs">
                <IconButton
                  icon={<MaterialIcons name="visibility" size={24} />}
                  variant="secondary"
                  aria-label="View"
                />
                <Text variant="caption" textAlign="center">
                  secondary
                </Text>
              </VStack>
              <VStack alignItems="center" space="xs">
                <IconButton
                  icon={<MaterialIcons name="delete" size={24} />}
                  variant="danger"
                  aria-label="Delete"
                />
                <Text variant="caption" textAlign="center">
                  danger
                </Text>
              </VStack>
              <VStack alignItems="center" space="xs">
                <IconButton
                  icon={<MaterialIcons name="add" size={24} />}
                  variant="primary"
                  aria-label="Add"
                />
                <Text variant="caption" textAlign="center">
                  primary
                </Text>
              </VStack>
            </HStack>
          </VStack>

          <Divider />

          {/* CARDS */}
          <VStack space="md">
            <Text
              variant="label"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Cards
            </Text>
            <VStack space="md">
              <Card variant="elevated">
                <Text variant="subtitle">Elevated</Text>
                <Text variant="bodySmall">Subtle shadow for depth</Text>
              </Card>
              <Card variant="outlined">
                <Text variant="subtitle">Outlined</Text>
                <Text variant="bodySmall">Border style, flat look</Text>
              </Card>
              <Card variant="flat">
                <Text variant="subtitle">Flat</Text>
                <Text variant="bodySmall">Alternative surface color</Text>
              </Card>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </Container>
  );
};

export default ShowcaseScreen;
