import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { PlanDetail, PlanExercise } from "./types";

interface Props {
  plan: PlanDetail;
  onExit: () => void;
}

const REST_BETWEEN_SETS = 45;
const REST_BETWEEN_EXERCISES = 60;

const WorkoutPlayer = ({ plan, onExit }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const exercises = plan.exercises;
  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets, 0),
    [exercises],
  );

  const [exIndex, setExIndex] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [phase, setPhase] = useState<"active" | "rest" | "done">("active");
  const [restKind, setRestKind] = useState<"set" | "exercise">("set");
  const [restLeft, setRestLeft] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);

  const current: PlanExercise | undefined = exercises[exIndex];

  // Fade-in a cada troca de exercício
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [exIndex, fade]);
  const heroTranslate = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  // Contagem regressiva do descanso
  useEffect(() => {
    if (phase !== "rest" || restLeft <= 0) return;
    const id = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, restLeft]);

  const endRest = useCallback(() => {
    if (restKind === "set") {
      setSetNum((n) => n + 1);
    } else {
      setExIndex((i) => i + 1);
      setSetNum(1);
    }
    setPhase("active");
  }, [restKind]);

  useEffect(() => {
    if (phase === "rest" && restLeft === 0) endRest();
  }, [phase, restLeft, endRest]);

  const finishSet = useCallback(() => {
    if (!current) return;
    const isLastSet = setNum >= current.sets;
    const isLastExercise = exIndex >= exercises.length - 1;
    setCompletedSets((c) => c + 1);

    if (!isLastSet) {
      setRestKind("set");
      setRestLeft(REST_BETWEEN_SETS);
      setPhase("rest");
    } else if (!isLastExercise) {
      setRestKind("exercise");
      setRestLeft(REST_BETWEEN_EXERCISES);
      setPhase("rest");
    } else {
      setPhase("done");
    }
  }, [current, setNum, exIndex, exercises.length]);

  const skipExercise = useCallback(() => {
    if (exIndex >= exercises.length - 1) {
      setPhase("done");
    } else {
      setExIndex((i) => i + 1);
      setSetNum(1);
      setPhase("active");
    }
  }, [exIndex, exercises.length]);

  const confirmExit = useCallback(() => {
    Alert.alert("Sair do treino?", "Seu progresso neste treino será perdido.", [
      { text: "Continuar treino", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: onExit },
    ]);
  }, [onExit]);

  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  // ─── Tela de conclusão ──────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.doneTitle}>Treino concluído!</Text>
        <Text style={styles.doneSub}>
          {exercises.length} exercícios · {completedSets} séries
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onExit}>
          <Text style={styles.doneBtnText}>Voltar aos planos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Fase de descanso ───────────────────────────────────────────────────────
  if (phase === "rest") {
    const nextLabel =
      restKind === "set"
        ? `Próxima: série ${setNum + 1} de ${current?.sets}`
        : `Próximo: ${exercises[exIndex + 1]?.exercise?.name ?? "exercício"}`;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onExit={confirmExit} styles={styles} title="Descanso" />
        <View style={styles.center}>
          <Text style={styles.restLabel}>DESCANSO</Text>
          <Text style={styles.restTimer}>{restLeft}s</Text>
          <Text style={styles.restNext}>{nextLabel}</Text>
          <TouchableOpacity style={styles.skipRestBtn} onPress={endRest}>
            <Ionicons name="play-skip-forward" size={18} color={colors.primary} />
            <Text style={styles.skipRestText}>Pular descanso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Fase ativa ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        onExit={confirmExit}
        styles={styles}
        title={`Exercício ${exIndex + 1} de ${exercises.length}`}
      />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={{
            width: "100%",
            alignItems: "center",
            opacity: fade,
            transform: [{ translateY: heroTranslate }],
          }}
        >
          <View style={styles.hero}>
            {current?.exercise?.imageUrl ? (
              <Image source={{ uri: current.exercise.imageUrl }} style={styles.heroImg} />
            ) : (
              <Ionicons name="barbell-outline" size={64} color={colors.text.tertiary} />
            )}
          </View>

          <Text style={styles.exName}>
            {current?.exercise?.name ?? `Exercício #${current?.exerciseId}`}
          </Text>
          {!!current?.exercise?.category && (
            <Text style={styles.exCat}>{current.exercise.category}</Text>
          )}
        </Animated.View>

        <View style={styles.metrics}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {setNum}
              <Text style={styles.metricTotal}>/{current?.sets}</Text>
            </Text>
            <Text style={styles.metricLabel}>Série</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{current?.reps}</Text>
            <Text style={styles.metricLabel}>Repetições</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={skipExercise}>
          <Ionicons name="play-skip-forward-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneSetBtn} onPress={finishSet}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.doneSetText}>Concluir série</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Header compartilhado ─────────────────────────────────────────────────────
const Header = ({
  onExit,
  title,
  styles,
}: {
  onExit: () => void;
  title: string;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close" size={26} color={styles._closeColor.color} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width: 26 }} />
  </View>
);

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    _closeColor: { color: colors.text.primary },
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
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
      color: colors.text.primary,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.surfaceVariant,
      marginHorizontal: 16,
      borderRadius: 6,
      overflow: "hidden",
    },
    progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 6 },
    content: { padding: 20, alignItems: "center" },
    hero: {
      width: "100%",
      height: 220,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: 20,
    },
    heroImg: { width: "100%", height: "100%", resizeMode: "cover" },
    exName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
      textAlign: "center",
    },
    exCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.tertiary,
      marginTop: 2,
      marginBottom: 24,
    },
    metrics: { flexDirection: "row", gap: 16, width: "100%" },
    metricBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 20,
      alignItems: "center",
    },
    metricValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 32,
      color: colors.primary,
    },
    metricTotal: {
      fontFamily: "Poppins_500Medium",
      fontSize: 20,
      color: colors.text.tertiary,
    },
    metricLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 4,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    skipBtn: {
      width: 54,
      height: 54,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    doneSetBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 54,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    doneSetText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
      marginLeft: 8,
    },

    // Descanso
    restLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.tertiary,
      letterSpacing: 2,
    },
    restTimer: {
      fontFamily: "Poppins_700Bold",
      fontSize: 72,
      color: colors.primary,
      marginVertical: 8,
    },
    restNext: {
      fontFamily: "Poppins_500Medium",
      fontSize: 15,
      color: colors.text.secondary,
      marginBottom: 32,
      textAlign: "center",
    },
    skipRestBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    skipRestText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.primary,
      marginLeft: 8,
    },

    // Conclusão
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

export default WorkoutPlayer;
