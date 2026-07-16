import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";

interface Props {
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  durationMs?: number;
  onDone: () => void;
}

const PreparingScreen = ({
  message = "Estamos preparando seu plano...",
  icon = "barbell",
  durationMs = 5000,
  onDone,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Anel girando continuamente
    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    // Ícone pulsando
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    // Reticências piscando
    const blink = Animated.loop(
      Animated.timing(dots, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    // Barra de progresso preenchendo ao longo da duração
    const bar = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });

    spin.start();
    beat.start();
    blink.start();
    bar.start();

    const timer = setTimeout(onDone, durationMs);
    return () => {
      clearTimeout(timer);
      spin.stop();
      beat.stop();
      blink.stop();
      bar.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.loaderWrap}>
        <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.iconCircle, { transform: [{ scale }] }]}>
          <Ionicons name={icon} size={44} color="#FFFFFF" />
        </Animated.View>
      </View>

      <Text style={styles.message}>{message}</Text>
      <Text style={styles.sub}>Isso leva só alguns segundos</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width }]} />
      </View>
    </View>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    loaderWrap: {
      width: 140,
      height: 140,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 40,
    },
    ring: {
      position: "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 5,
      borderColor: colors.primaryLight,
      borderTopColor: colors.primary,
      borderRightColor: colors.primary,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    message: {
      fontFamily: "Poppins_700Bold",
      fontSize: 20,
      color: colors.text.primary,
      textAlign: "center",
      marginBottom: 8,
    },
    sub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.tertiary,
      textAlign: "center",
      marginBottom: 36,
    },
    progressTrack: {
      width: "100%",
      height: 6,
      borderRadius: 6,
      backgroundColor: colors.surfaceVariant,
      overflow: "hidden",
    },
    progressFill: {
      height: 6,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
  });

export default PreparingScreen;
