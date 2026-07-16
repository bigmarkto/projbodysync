import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Quadrado grande para exibir bem a ilustração do exercício
const SHOWCASE = Math.min(Dimensions.get("window").width * 0.72, 300);
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { HiitSegment } from "./hiit";

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(script[0]?.durationSec ?? 60);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  const segment = script[index];
  const isWork = segment?.type === "work";
  const accent = isWork ? colors.primary : colors.info;

  // Fade-in + leve subida a cada troca de segmento
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, fade]);
  const translateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
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
    Alert.alert("Sair do treino?", "Seu progresso neste cardio será perdido.", [
      { text: "Continuar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: onExit },
    ]);
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
          <Ionicons name="checkmark" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.doneTitle}>Cardio concluído!</Text>
        <Text style={styles.doneSub}>{workTotal} minutos de exercício 🔥</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onExit}>
          <Text style={styles.doneBtnText}>Voltar aos planos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const next = script[index + 1];
  const segProgress = segment ? 1 - secondsLeft / segment.durationSec : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: accent }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isWork ? `Exercício ${workDone + 1}/${workTotal}` : "Descanso"}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: fade,
            transform: [{ translateY }],
          }}
        >
          <Text style={styles.phaseLabel}>
            {isWork ? "AGORA" : "DESCANSE"}
          </Text>

          <View style={styles.exIconWrap}>
            {isWork && segment.exercise!.imageUrl ? (
              <Image
                source={{ uri: segment.exercise!.imageUrl! }}
                style={styles.exImage}
              />
            ) : (
              <Ionicons
                name={isWork ? segment.exercise!.icon : "cafe"}
                size={72}
                color="#FFFFFF"
              />
            )}
          </View>

          <Text style={styles.exName}>
            {isWork ? segment.exercise!.name : "Respire e recupere"}
          </Text>
          {isWork && (
            <Text style={styles.exInstruction}>
              {segment.exercise!.instruction}
            </Text>
          )}
        </Animated.View>

        <Text style={styles.timer}>{fmt(secondsLeft)}</Text>

        {/* Barra do segmento atual */}
        <View style={styles.segTrack}>
          <View style={[styles.segFill, { width: `${segProgress * 100}%` }]} />
        </View>

        {!!next && (
          <Text style={styles.nextUp}>
            A seguir:{" "}
            {next.type === "work" ? next.exercise!.name : "Descanso"}
          </Text>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => setPaused((p) => !p)}>
          <Ionicons name={paused ? "play" : "pause"} size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={skip}>
          <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
    body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    phaseLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "rgba(255,255,255,0.85)",
      letterSpacing: 3,
      marginBottom: 24,
    },
    exIconWrap: {
      width: SHOWCASE,
      height: SHOWCASE,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: 20,
    },
    exImage: {
      width: "100%",
      height: "100%",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    exName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 28,
      color: "#FFFFFF",
      textAlign: "center",
    },
    exInstruction: {
      fontFamily: "Poppins_400Regular",
      fontSize: 15,
      color: "rgba(255,255,255,0.9)",
      textAlign: "center",
      marginTop: 6,
    },
    timer: {
      fontFamily: "Poppins_700Bold",
      fontSize: 64,
      color: "#FFFFFF",
      marginTop: 12,
    },
    segTrack: {
      width: "100%",
      height: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.25)",
      overflow: "hidden",
      marginTop: 8,
    },
    segFill: { height: 8, borderRadius: 8, backgroundColor: "#FFFFFF" },
    nextUp: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      marginTop: 24,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingTop: 12,
    },
    ctrlBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },

    doneCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
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
    },
    doneBtn: {
      height: 52,
      paddingHorizontal: 32,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
  });

export default HiitPlayer;
