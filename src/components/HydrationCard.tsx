import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { useApi } from "../hooks/useApi";
import { lightColors } from "../theme/colors";

// ─── Tipo espelhando GET /hydration ──────────────────────────────────────────
interface HydrationStatus {
  date: string;
  consumedMl: number;
  goalMl: number;
  suggestedGoalMl: number;
  customGoalMl: number | null;
  cupSizeMl: number;
  cups: { consumed: number; total: number };
  percentage: number;
}

const HydrationCard = () => {
  const { colors } = useTheme();
  const { request } = useApi();

  const [status, setStatus] = useState<HydrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const styles = useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await request("/hydration");
      if (!res.ok) throw new Error("Não foi possível carregar a hidratação.");
      const data: HydrationStatus = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar hidratação.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registra consumo (delta em ml, pode ser negativo)
  const addIntake = useCallback(
    async (amountMl: number) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await request("/hydration", {
          method: "POST",
          body: JSON.stringify({ amountMl }),
        });
        if (!res.ok) throw new Error("Não foi possível registrar.");
        setStatus(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao registrar.");
      } finally {
        setBusy(false);
      }
    },
    [busy, request],
  );

  // Salva meta (número em ml, ou null para voltar à sugerida)
  const saveGoal = useCallback(
    async (goalMl: number | null) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await request("/hydration/goal", {
          method: "PUT",
          body: JSON.stringify({ goalMl }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Não foi possível salvar a meta.");
        }
        setStatus(await res.json());
        setEditing(false);
        setGoalInput("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar a meta.");
      } finally {
        setBusy(false);
      }
    },
    [busy, request],
  );

  // Toque num copo: preenche até ele, ou reduz se já estiver cheio
  const onCupPress = useCallback(
    (index: number) => {
      if (!status) return;
      const current = status.cups.consumed;
      const target = current > index ? index : index + 1;
      const delta = (target - current) * status.cupSizeMl;
      if (delta !== 0) addIntake(delta);
    },
    [status, addIntake],
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>
          {error ?? "Hidratação indisponível."}
        </Text>
        <TouchableOpacity onPress={load}>
          <Text style={styles.retry}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { cups, consumedMl, goalMl, percentage, suggestedGoalMl } = status;
  const usingSuggested = status.customGoalMl == null;

  return (
    <View style={styles.card}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="water-outline" size={18} color={colors.info} />
          <Text style={styles.title}>Hidratação diária</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.percentage}>{percentage}%</Text>
          <TouchableOpacity
            onPress={() => setEditing((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 10 }}
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Copo + números */}
      <View style={styles.body}>
        <View style={styles.glass}>
          <View style={[styles.glassFill, { height: `${percentage}%` }]} />
        </View>
        <View style={styles.info}>
          <Text style={styles.consumedCups}>
            {cups.consumed}
            <Text style={styles.totalCups}> / {cups.total} copos</Text>
          </Text>
          <Text style={styles.mlText}>
            {consumedMl} ml de {goalMl} ml consumidos
          </Text>
          {usingSuggested && (
            <Text style={styles.hint}>Meta sugerida pelo seu peso</Text>
          )}
        </View>
      </View>

      {/* Fileira de copos */}
      <View style={styles.cupsRow}>
        {Array.from({ length: cups.total }).map((_, i) => {
          const filled = i < cups.consumed;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onCupPress(i)}
              disabled={busy}
              style={styles.cupBtn}
            >
              <Ionicons
                name={filled ? "water" : "water-outline"}
                size={20}
                color={filled ? colors.info : colors.borderHeavy}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ações rápidas */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.removeBtn, (busy || cups.consumed === 0) && styles.disabled]}
          onPress={() => addIntake(-status.cupSizeMl)}
          disabled={busy || cups.consumed === 0}
        >
          <Ionicons name="remove" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, busy && styles.disabled]}
          onPress={() => addIntake(status.cupSizeMl)}
          disabled={busy}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            Adicionar copo ({status.cupSizeMl} ml)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editor de meta */}
      {editing && (
        <View style={styles.editor}>
          <Text style={styles.editorLabel}>Meta diária de água</Text>
          <TouchableOpacity
            style={[styles.suggestBtn, usingSuggested && styles.suggestBtnActive]}
            onPress={() => saveGoal(null)}
            disabled={busy}
          >
            <Ionicons
              name={usingSuggested ? "radio-button-on" : "radio-button-off"}
              size={16}
              color={usingSuggested ? colors.primary : colors.text.tertiary}
            />
            <Text style={styles.suggestText}>
              Usar meta sugerida ({suggestedGoalMl} ml)
            </Text>
          </TouchableOpacity>

          <View style={styles.customRow}>
            <TextInput
              style={styles.input}
              placeholder="Meta personalizada (ml)"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
              value={goalInput}
              onChangeText={setGoalInput}
            />
            <TouchableOpacity
              style={[styles.saveBtn, busy && styles.disabled]}
              onPress={() => {
                const n = parseInt(goalInput, 10);
                if (!isNaN(n)) saveGoal(n);
              }}
              disabled={busy}
            >
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    titleRow: { flexDirection: "row", alignItems: "center" },
    title: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
      marginLeft: 8,
    },
    headerRight: { flexDirection: "row", alignItems: "center" },
    percentage: {
      fontFamily: "Poppins_700Bold",
      fontSize: 15,
      color: colors.info,
    },

    body: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    glass: {
      width: 52,
      height: 68,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.info + "55",
      backgroundColor: colors.infoLight,
      overflow: "hidden",
      justifyContent: "flex-end",
      marginRight: 16,
    },
    glassFill: { width: "100%", backgroundColor: colors.info + "AA" },
    info: { flex: 1 },
    consumedCups: {
      fontFamily: "Poppins_700Bold",
      fontSize: 22,
      color: colors.text.primary,
    },
    totalCups: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.tertiary,
    },
    mlText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    hint: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: 2,
    },

    cupsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 14,
    },
    cupBtn: {
      width: `${100 / 8}%`,
      alignItems: "center",
      paddingVertical: 6,
    },

    actions: { flexDirection: "row", alignItems: "center" },
    removeBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    addBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.info,
    },
    addBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#FFFFFF",
      marginLeft: 6,
    },
    disabled: { opacity: 0.5 },

    editor: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    editorLabel: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
      marginBottom: 10,
    },
    suggestBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    suggestBtnActive: {},
    suggestText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      marginLeft: 8,
    },
    customRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    input: {
      flex: 1,
      height: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
      marginRight: 10,
    },
    saveBtn: {
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: "#FFFFFF",
    },

    errorText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.error,
      marginTop: 10,
    },
    retry: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
      marginTop: 6,
    },
  });

export default HydrationCard;
