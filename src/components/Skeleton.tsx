import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeProvider";

interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const HomeSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={skStyles.container}>
      {/* Top Bar Skeleton */}
      <View style={skStyles.topBar}>
        <View style={skStyles.row}>
          <Skeleton width={46} height={46} borderRadius={23} />
          <View style={skStyles.colGap}>
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton width={140} height={18} borderRadius={4} />
          </View>
        </View>
        <Skeleton width={42} height={42} borderRadius={14} />
      </View>

      {/* Hero Banner Skeleton */}
      <View style={[skStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Skeleton width={110} height={22} borderRadius={12} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={20} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={14} borderRadius={4} />
      </View>

      {/* Week Calendar Skeleton */}
      <View style={[skStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Skeleton width={150} height={18} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={skStyles.weekRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={skStyles.dayCol}>
              <Skeleton width={26} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width={36} height={36} borderRadius={18} />
            </View>
          ))}
        </View>
      </View>

      {/* Hydration Card Skeleton */}
      <View style={[skStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Skeleton width={160} height={18} borderRadius={6} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={10} borderRadius={5} style={{ marginBottom: 14 }} />
        <View style={skStyles.rowSpread}>
          <Skeleton width={80} height={36} borderRadius={10} />
          <Skeleton width={120} height={36} borderRadius={10} />
        </View>
      </View>
    </View>
  );
};

const skStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colGap: {
    gap: 6,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: {
    alignItems: "center",
  },
  rowSpread: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default Skeleton;

