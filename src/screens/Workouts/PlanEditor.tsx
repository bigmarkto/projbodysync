import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";
import { EditablePlan, PlanExercise } from "./types";
import ExercisePicker from "./ExercisePicker";

interface Props {
  initial: EditablePlan;
  onSaved: () => void;
  onCancel: () => void;
}

const PlanEditor = ({ initial, onSaved, onCancel }: Props) => {
  const { colors } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState(initial.name);
  const [exercises, setExercises] = useState<PlanExercise[]>(initial.exercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = initial.id === null;

  const updateReps = useCallback((index: number, delta: number) => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, reps: Math.max(1, e.reps + delta) } : e,
      ),
    );
  }, []);

  const updateSets = useCallback((index: number, delta: number) => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, sets: Math.max(1, e.sets + delta) } : e,
      ),
    );
  }, []);

  const remove = useCallback((index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addPicked = useCallback((picked: PlanExercise[]) => {
    setExercises((prev) => {
      const existing = new Set(prev.map((e) => e.exerciseId));
      const news = picked.filter((p) => !existing.has(p.exerciseId));
      return [...prev, ...news];
    });
  }, []);

  const save = useCallback(async () => {
    if (!name.trim()) {
      setError("Dê um nome ao plano.");
      return;
    }
    if (exercises.length === 0) {
      setError("Adicione ao menos um exercício.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        name: name.trim(),
        exercises: exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
        })),
      });
      const res = isNew
        ? await request("/workouts", { method: "POST", body })
        : await request(`/workouts/${initial.id}`, { method: "PUT", body });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Não foi possível salvar o plano.");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  }, [name, exercises, isNew, initial.id, request, onSaved]);

  const confirmCancel = () => {
    Alert.alert("Descartar alterações?", "As mudanças não salvas serão perdidas.", [
      { text: "Continuar editando", style: "cancel" },
      { text: "Descartar", style: "destructive", onPress: onCancel },
    ]);
  };

  const existingIds = exercises.map((e) => e.exerciseId);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={confirmCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? "Novo plano" : "Editar plano"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome do plano</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Treino A - Peito e Tríceps"
          placeholderTextColor={colors.text.tertiary}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Exercícios ({exercises.length})
          </Text>
          <TouchableOpacity style={styles.addLink} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.addLinkText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {exercises.length === 0 && (
          <Text style={styles.emptyHint}>
            Nenhum exercício ainda. Toque em "Adicionar".
          </Text>
        )}

        {exercises.map((ex, index) => (
          <View key={`${ex.exerciseId}-${index}`} style={styles.exCard}>
            <View style={styles.exTop}>
              <View style={styles.thumb}>
                {ex.exercise?.imageUrl ? (
                  <Image source={{ uri: ex.exercise.imageUrl }} style={styles.thumbImg} />
                ) : (
                  <Ionicons name="barbell-outline" size={18} color={colors.text.tertiary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName} numberOfLines={2}>
                  {ex.exercise?.name ?? `Exercício #${ex.exerciseId}`}
                </Text>
                {!!ex.exercise?.category && (
                  <Text style={styles.exCat}>{ex.exercise.category}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => remove(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.steppers}>
              <Stepper
                styles={styles}
                colors={colors}
                label="Séries"
                value={ex.sets}
                onDec={() => updateSets(index, -1)}
                onInc={() => updateSets(index, +1)}
              />
              <Stepper
                styles={styles}
                colors={colors}
                label="Repetições"
                value={ex.reps}
                onDec={() => updateReps(index, -1)}
                onInc={() => updateReps(index, +1)}
              />
            </View>
          </View>
        ))}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>
              {isNew ? "Criar plano" : "Salvar alterações"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addPicked}
        existingIds={existingIds}
      />
    </View>
  );
};

// ─── Stepper +/- ──────────────────────────────────────────────────────────────
interface StepperProps {
  styles: ReturnType<typeof createStyles>;
  colors: typeof lightColors;
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}
const Stepper = ({ styles, colors, label, value, onDec, onInc }: StepperProps) => (
  <View style={styles.stepper}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperControls}>
      <TouchableOpacity style={styles.stepBtn} onPress={onDec}>
        <Ionicons name="remove" size={16} color={colors.text.secondary} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={onInc}>
        <Ionicons name="add" size={16} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  </View>
);

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    headerTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },
    scroll: { flex: 1 },
    label: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 6,
    },
    nameInput: {
      height: 50,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontFamily: "Poppins_400Regular",
      fontSize: 15,
      color: colors.text.primary,
      backgroundColor: colors.surface,
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    sectionTitle: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    addLink: { flexDirection: "row", alignItems: "center" },
    addLinkText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
      marginLeft: 4,
    },
    emptyHint: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.tertiary,
      textAlign: "center",
      paddingVertical: 24,
    },
    exCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    exTop: { flexDirection: "row", alignItems: "center" },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginRight: 12,
    },
    thumbImg: { width: "100%", height: "100%" },
    exName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.primary,
    },
    exCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    steppers: {
      flexDirection: "row",
      marginTop: 12,
      gap: 12,
    },
    stepper: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    stepperLabel: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginBottom: 4,
    },
    stepperControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
    },
    error: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginTop: 12,
      textAlign: "center",
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveBtn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
    disabled: { opacity: 0.6 },
  });

export default PlanEditor;
