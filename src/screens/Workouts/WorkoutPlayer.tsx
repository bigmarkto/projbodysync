import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { lightColors } from "../../theme/colors";
import { PlanDetail, PlanExercise } from "./types";
import { ConfirmModal } from "../../components/ConfirmModal";

interface Props {
  plan: PlanDetail;
  onExit: () => void;
  onCompleted?: (startedAt: string) => void;
}

const REST_BETWEEN_SETS = 45;
const REST_BETWEEN_EXERCISES = 60;

const WorkoutPlayer = ({ plan, onExit, onCompleted }: Props) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const current: PlanExercise | undefined = exercises[exIndex];

  // Registra a sessão uma única vez ao concluir
  const startedAt = useRef(new Date().toISOString());
  const reported = useRef(false);
  useEffect(() => {
    if (phase === "done" && !reported.current) {
      reported.current = true;
      onCompleted?.(startedAt.current);
    }
  }, [phase, onCompleted]);

  // Fade-in a cada troca de exercício
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [exIndex, fade]);
  const heroTranslate = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  // Anel giratório contínuo no relógio de descanso (idêntico à IA / PreparingScreen)
  const restSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== "rest") return;
    restSpin.setValue(0);
    const spinAnim = Animated.loop(
      Animated.timing(restSpin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinAnim.start();
    return () => spinAnim.stop();
  }, [phase, restSpin]);

  const restSpinDeg = restSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
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
      setRestLeft(current.restSeconds ?? REST_BETWEEN_SETS);
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
    setShowExitConfirm(true);
  }, []);

  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  const exitModal = (
    <ConfirmModal
      visible={showExitConfirm}
      title="Sair do treino?"
      message="Seu progresso neste treino será perdido."
      cancelLabel="Continuar treino"
      confirmLabel="Sair"
      destructive
      onCancel={() => setShowExitConfirm(false)}
      onConfirm={() => {
        setShowExitConfirm(false);
        onExit();
      }}
    />
  );

  // ─── Tela de conclusão ──────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={60} color="#FFFFFF" />
        </View>
        <Text style={styles.doneTitle}>Treino concluído!</Text>
        <Text style={styles.doneSub}>
          {exercises.length} exercícios · {completedSets} séries realizadas
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onExit} activeOpacity={0.88}>
          <Text style={styles.doneBtnText}>Finalizar e voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Fase de descanso ───────────────────────────────────────────────────────
  if (phase === "rest") {
    const nextLabel =
      restKind === "set"
        ? `Próxima: Série ${setNum + 1} de ${current?.sets}`
        : `Próximo: ${exercises[exIndex + 1]?.exercise?.name ?? "exercício"}`;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header onExit={confirmExit} styles={styles} title="Recuperação" />
        <View style={styles.restCenter}>
          <View style={styles.restBadge}>
            <Ionicons name="timer-outline" size={16} color={colors.primary} />
            <Text style={styles.restLabel}>DESCANSO ATIVO</Text>
          </View>

          <View style={styles.restLoaderWrap}>
            <Animated.View
              style={[styles.restRing, { transform: [{ rotate: restSpinDeg }] }]}
            />
            <View style={styles.timerCircle}>
              <Text style={styles.restTimer}>{restLeft}</Text>
              <Text style={styles.restSec}>segundos</Text>
            </View>
          </View>

          <Text style={styles.restNext}>{nextLabel}</Text>

          <TouchableOpacity style={styles.skipRestBtn} onPress={endRest} activeOpacity={0.8}>
            <Ionicons name="play-skip-forward" size={18} color={colors.primary} />
            <Text style={styles.skipRestText}>Pular descanso</Text>
          </TouchableOpacity>
        </View>
        {exitModal}
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

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={styles.categoryChip}>
              <Text style={styles.exCat}>{current.exercise.category}</Text>
            </View>
          )}
        </Animated.View>

        {/* Metrics Grid */}
        <View style={styles.metrics}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {setNum}
              <Text style={styles.metricTotal}>/{current?.sets}</Text>
            </Text>
            <Text style={styles.metricLabel}>Série atual</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{current?.reps}</Text>
            <Text style={styles.metricLabel}>Repetições</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Controls */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={skipExercise} activeOpacity={0.8}>
          <Ionicons name="play-skip-forward-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneSetBtn} onPress={finishSet} activeOpacity={0.88}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.doneSetText}>Concluir série</Text>
        </TouchableOpacity>
      </View>
      {exitModal}
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
    <TouchableOpacity onPress={onExit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.closeBtn}>
      <Ionicons name="close" size={22} color={styles._closeColor.color} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width: 38 }} />
  </View>
);

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    _closeColor: { color: colors.text.primary },
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    restCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
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
      marginBottom: 10,
    },
    progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 6 },
    content: { padding: 20, alignItems: "center" },
    hero: {
      width: "100%",
      height: 220,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    heroImg: { width: "100%", height: "100%", resizeMode: "cover" },
    exName: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
      textAlign: "center",
    },
    categoryChip: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 6,
      marginBottom: 20,
    },
    exCat: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
    },
    metrics: { flexDirection: "row", gap: 14, width: "100%" },
    metricBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 18,
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    metricValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 32,
      color: colors.primary,
    },
    metricTotal: {
      fontFamily: "Poppins_500Medium",
      fontSize: 18,
      color: colors.text.tertiary,
    },
    metricLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 12,
      gap: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    skipBtn: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    doneSetBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primary,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    doneSetText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },

    // Descanso
    restBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      gap: 6,
      marginBottom: 24,
    },
    restLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.primary,
      letterSpacing: 1,
    },
    restLoaderWrap: {
      width: 204,
      height: 204,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    restRing: {
      position: "absolute",
      width: 204,
      height: 204,
      borderRadius: 102,
      borderWidth: 5,
      borderColor: colors.primaryLight,
      borderTopColor: colors.primary,
      borderRightColor: colors.primary,
    },
    timerCircle: {
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    restTimer: {
      fontFamily: "Poppins_700Bold",
      fontSize: 56,
      color: colors.primary,
      lineHeight: 64,
    },
    restSec: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.tertiary,
      marginTop: -4,
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
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      gap: 8,
    },
    skipRestText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },

    // Conclusão
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

export default WorkoutPlayer;