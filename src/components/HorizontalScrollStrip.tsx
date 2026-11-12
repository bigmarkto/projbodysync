import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";

interface HorizontalScrollStripProps {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  stepSize?: number;
}

/**
 * Faixa horizontal com pista visual de overflow ("peek" + setas laterais discretas)
 * para deixar subentendido que existem mais abas/filtros para o lado.
 */
export const HorizontalScrollStrip = ({
  children,
  containerStyle,
  contentContainerStyle,
  stepSize = 140,
}: HorizontalScrollStripProps) => {
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const hasOverflow = contentWidth > containerWidth + 6;
  const canScrollLeft = hasOverflow && scrollX > 6;
  const canScrollRight = hasOverflow && scrollX + containerWidth < contentWidth - 6;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  const scrollBy = (delta: number) => {
    const maxOffset = Math.max(0, contentWidth - containerWidth);
    const nextX = Math.max(0, Math.min(maxOffset, scrollX + delta));
    scrollRef.current?.scrollTo({ x: nextX, animated: true });
    setScrollX(nextX);
  };

  const edgeSurfaceBg = isDark ? "rgba(22, 31, 46, 0.94)" : "rgba(255, 255, 255, 0.94)";

  return (
    <View
      style={[styles.wrapper, containerStyle]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(w) => setContentWidth(w)}
        contentContainerStyle={[
          styles.contentBase,
          hasOverflow && styles.contentWithPadding,
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>

      {canScrollLeft && (
        <View style={[styles.edgeCue, styles.edgeLeft, { backgroundColor: edgeSurfaceBg }]}>
          <TouchableOpacity
            onPress={() => scrollBy(-stepSize)}
            style={[styles.arrowPill, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Ver abas anteriores"
          >
            <Ionicons name="chevron-back" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {canScrollRight && (
        <View style={[styles.edgeCue, styles.edgeRight, { backgroundColor: edgeSurfaceBg }]}>
          <TouchableOpacity
            onPress={() => scrollBy(stepSize)}
            style={[styles.arrowPill, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "45" }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Ver mais abas à direita"
          >
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    justifyContent: "center",
  },
  contentBase: {
    alignItems: "center",
  },
  contentWithPadding: {
    paddingRight: 28,
  },
  edgeCue: {
    position: "absolute",
    top: 2,
    bottom: 2,
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeLeft: {
    left: 2,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  edgeRight: {
    right: 2,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  arrowPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
