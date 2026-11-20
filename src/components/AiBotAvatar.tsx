import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { useTheme } from "../context/ThemeProvider";
import {
  AiBotState,
  GAZE_STEPS,
  PreparingStage,
  getPreparingStage,
} from "./aiBotState";

export { AiBotState, PreparingStage, getPreparingStage };

interface AiBotAvatarProps {
  size?: number;
  state?: AiBotState;
  /**
   * "primary": laranja BodySync com visor escuro (para fundos claros/escuros)
   * "inverse": branco com visor escuro e olhos laranja/brancos (para dentro de botões laranja)
   */
  variant?: "primary" | "inverse";
}

export const AiBotAvatar = ({
  size = 48,
  state = "idle",
  variant = "primary",
}: AiBotAvatarProps) => {
  const { colors, reduceMotion } = useTheme();
  const [blinking, setBlinking] = useState(false);
  const [gazeIdx, setGazeIdx] = useState(1);

  useEffect(() => {
    if (reduceMotion || state === "happy") {
      setBlinking(false);
      setGazeIdx(1);
      return;
    }

    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      blinkTimeout = setTimeout(() => setBlinking(false), 150);
    }, state === "thinking" ? 1800 : 3200);

    let gazeInterval: ReturnType<typeof setInterval> | null = null;
    if (state === "thinking") {
      gazeInterval = setInterval(() => {
        setGazeIdx((prev) => (prev + 1) % GAZE_STEPS.length);
      }, 420);
    } else {
      setGazeIdx(1);
    }

    return () => {
      clearInterval(blinkInterval);
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (gazeInterval) clearInterval(gazeInterval);
    };
  }, [reduceMotion, state]);

  const shellColor = variant === "inverse" ? "#FFFFFF" : colors.primary;
  const earColor =
    variant === "inverse" ? "rgba(255,255,255,0.78)" : colors.primary;
  const visorColor = "#0F172A";
  const eyeColor = variant === "inverse" ? "#F97316" : "#FFFFFF";
  const antennaDotColor =
    state === "happy" ? colors.success : variant === "inverse" ? "#FFFFFF" : colors.primary;

  const offsetX = state === "thinking" && !reduceMotion ? GAZE_STEPS[gazeIdx] : 0;
  const eyeY = blinking ? 30 : 24.5;
  const eyeHeight = blinking ? 2.6 : 11;
  const eyeRadius = blinking ? 1.3 : 3.25;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        state === "thinking"
          ? "Assistente BodySync AI pensando"
          : state === "happy"
            ? "Assistente BodySync AI pronto"
            : "Assistente BodySync AI"
      }
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Haste e sensor da antena */}
        <Rect x="30.5" y="7" width="3" height="6" rx="1.5" fill={earColor} />
        <Circle cx="32" cy="5.5" r="3" fill={antennaDotColor} />

        {/* Orelhas / sensores esportivos laterais */}
        <Rect x="3" y="25" width="5" height="15" rx="2.5" fill={earColor} />
        <Rect x="56" y="25" width="5" height="15" rx="2.5" fill={earColor} />

        {/* Cápsula / cabeça principal (squircle) */}
        <Rect x="8" y="12" width="48" height="42" rx="15" fill={shellColor} />

        {/* Visor escuro interno */}
        <Rect x="13" y="18" width="38" height="28" rx="10" fill={visorColor} />

        {/* Brilho sutil superior no visor */}
        <Path
          d="M 18 21.5 H 30"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Olhos expressivos */}
        {state === "happy" ? (
          <>
            <Path
              d="M 19.5 33 Q 24 26 28.5 33"
              stroke={eyeColor}
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 35.5 33 Q 40 26 44.5 33"
              stroke={eyeColor}
              strokeWidth="3.4"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <Rect
              x={21 + offsetX}
              y={eyeY}
              width="6.5"
              height={eyeHeight}
              rx={eyeRadius}
              fill={eyeColor}
            />
            <Rect
              x={36.5 + offsetX}
              y={eyeY}
              width="6.5"
              height={eyeHeight}
              rx={eyeRadius}
              fill={eyeColor}
            />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AiBotAvatar;
