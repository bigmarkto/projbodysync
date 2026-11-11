import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { HiitSegment } from "./hiit";
import { ConfirmModal } from "../../components/ConfirmModal";

interface Props {
  script: HiitSegment[];
  onExit: () => void;
  onCompleted?: (startedAt: string) => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const HiitPlayer = ({ script, onExit, onCompleted }: Props) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(script[0]?.durationSec ?? 60);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const segment = script[index];
  const isWork = segment?.type === "work";
  const bgThemeColor = isWork
    ? isDark ? "#1A1009" : "#FFF7ED"
    : isDark ? "#081524" : "#F0F9FF";
  const accentColor = isWork ? colors.primary : colors.info;

  // Fade-in a cada troca de segmento
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, fade]);
  const translateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  // Tique de 1s
  useEffect(() => {
    if (paused || finished || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, paused, finished]);

  // Registra a sessão uma única vez ao concluir
  const startedAt = useRef(new Date().toISOString());
  const reported = useRef(false);
  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      onCompleted?.(startedAt.current);
    }
  }, [finished, onCompleted]);

  // Avança de segmento quando o tempo zera
  useEffect(() => {
    if (finished || secondsLeft !== 0) return;
    if (index < script.length - 1) {
      const next = index + 1;
      setIndex(next);
      setSecondsLeft(script[next].durationSec);
    } else {
      setFinished(true);
    }
  }, [secondsLeft, index, script, finished]);

  const skip = () => {
    if (index < script.length - 1) {
      const next = index + 1;
      setIndex(next);
      setSecondsLeft(script[next].durationSec);
    } else {
      setFinished(true);
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(true);
  };

  const workDone = useMemo(
    () => script.slice(0, index).filter((s) => s.type === "work").length,
    [script, index],
  );
  const workTotal = useMemo(
    () => script.filter((s) => s.type === "work").length,
    [script],
  );

  if (finished) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={60} color="#FFFFFF" />
        </View>
        <Text style={styles.doneTitle}>Cardio concluído!</Text>
        <Text style={styles.doneSub}>{workTotal} minutos de alta intensidade 🔥</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onExit} activeOpacity={0.88}>
          <Text style={styles.doneBtnText}>Finalizar e voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const next = script[index + 1];
  const segProgress = segment ? 1 - secondsLeft / segment.durationSec : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgThemeColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={confirmExit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isWork ? `Ciclo ${workDone + 1} de ${workTotal}` : "Recuperação"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: fade,
            transform: [{ translateY }],
          }}
        >
          {/* Phase Badge */}
          <View style={[styles.phaseBadge, { backgroundColor: isWork ? colors.primaryLight : colors.infoLight }]}>
            <Ionicons
              name={isWork ? "flame" : "water"}
              size={14}
              color={accentColor}
            />
            <Text style={[styles.phaseLabel, { color: accentColor }]}>
              {isWork ? "ATIVIDADE MÁXIMA" : "DESCANSO / HIDRATAÇÃO"}
            </Text>
          </View>

          <View style={[styles.exIconWrap, { backgroundColor: accentColor }]}>
            <Ionicons
              name={isWork ? segment.exercise!.icon : "cafe"}
              size={44}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.exName}>
            {isWork ? segment.exercise!.name : "Respire e recupere"}
          </Text>

          <View style={styles.instructionBox}>
            <Text style={styles.instruction}>
              {isWork
                ? segment.exercise!.instruction
                : "Fique de pé, respire fundo e relaxe. Beba um gole de água e se prepare para o próximo disparo."}
            </Text>
          </View>
        </Animated.View>

        {/* Big Timer */}
        <View style={styles.timerWrapper}>
          <Text style={[styles.timer, { color: accentColor }]}>{fmt(secondsLeft)}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.segTrack}>
          <View
            style={[
              styles.segFill,
              { width: `${segProgress * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        {!!next && (
          <View style={styles.nextUpCard}>
            <Text style={styles.nextUpPrefix}>A SEGUIR:</Text>
            <Text style={styles.nextUpTitle}>
              {next.type === "work" ? next.exercise!.name : "Descanso (1 min)"}
            </Text>
          </View>
        )}
      </View>

      {/* Floating Tactical Footer Controls */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: paused ? colors.primary : colors.card }]}
          onPress={() => setPaused((p) => !p)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={paused ? "play" : "pause"}
            size={26}
            color={paused ? "#FFFFFF" : colors.text.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: colors.card }]}
          onPress={skip}
          activeOpacity={0.85}
        >
          <Ionicons name="play-skip-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showExitConfirm}
        title="Sair do treino?"
        message="Seu progresso neste cardio será perdido."
        cancelLabel="Continuar"
        confirmLabel="Sair"
        destructive
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          onExit();
        }}
      />
    </View>
  );
};

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: { alignItems: "center" },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    phaseBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      gap: 6,
      marginBottom: 16,
    },
    phaseLabel: {
      fontFamily: "Poppins_700Bold",
      fontSize: 12,
      letterSpacing: 1.2,
    },
    exIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
    exName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: colors.text.primary,
      textAlign: "center",
      marginBottom: 10,
    },
    instructionBox: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      maxWidth: 320,
      marginBottom: 20,
    },
    instruction: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: "center",
      lineHeight: 19,
    },
    timerWrapper: {
      marginVertical: 6,
    },
    timer: {
      fontFamily: "Poppins_700Bold",
      fontSize: 76,
      letterSpacing: -1,
      lineHeight: 84,
    },
    segTrack: {
      width: 260,
      height: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 8,
      marginBottom: 18,
    },
    segFill: {
      height: "100%",
      borderRadius: 4,
    },
    nextUpCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nextUpPrefix: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 11,
      color: colors.text.tertiary,
    },
    nextUpTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
      paddingTop: 10,
    },
    ctrlBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    doneCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    doneTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: colors.text.primary,
    },
    doneSub: {
      fontFamily: "Poppins_400Regular",
      fontSize: 15,
      color: colors.text.secondary,
      marginTop: 6,
      marginBottom: 32,
      textAlign: "center",
    },
    doneBtn: {
      height: 52,
      paddingHorizontal: 36,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    doneBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
  });

export default HiitPlayer;