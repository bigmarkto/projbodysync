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
  const { colors, isDark } = useTheme();
  const { request } = useApi();

  const [status, setStatus] = useState<HydrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  }, [load]);

  const addIntake = useCallback(
    async (amountMl: number) => {
      if (busy || !status) return;
      const previousStatus = status;

      // Optimistic update local imediato (0ms de latência percebida)
      const optimisticConsumed = Math.max(0, status.consumedMl + amountMl);
      const optimisticPct = status.goalMl > 0 ? Math.round((optimisticConsumed / status.goalMl) * 100) : 0;
      const optimisticCups = Math.max(0, Math.round(optimisticConsumed / status.cupSizeMl));

      setStatus({
        ...status,
        consumedMl: optimisticConsumed,
        percentage: optimisticPct,
        cups: {
          ...status.cups,
          consumed: Math.min(status.cups.total, optimisticCups),
        },
      });

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
        // Rollback se falhar
        setStatus(previousStatus);
        setError(e instanceof Error ? e.message : "Erro ao registrar consumo.");
      } finally {
        setBusy(false);
      }
    },
    [busy, status, request],
  );

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
        <TouchableOpacity
          onPress={load}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Tentar carregar hidratação novamente"
        >
          <Text style={styles.retry}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { cups, consumedMl, goalMl, percentage, suggestedGoalMl } = status;
  const usingSuggested = status.customGoalMl == null;
  const progressPercent = Math.min(Math.max(percentage, 0), 100);

  return (
    <View style={styles.card}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={18} color={colors.info} />
          </View>
          <View>
            <Text style={styles.title}>Hidratação diária</Text>
            <Text style={styles.subtitle}>
              {usingSuggested ? "Meta calculada pelo peso" : "Meta personalizada"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{percentage}%</Text>
          </View>
          <TouchableOpacity
            onPress={() => setEditing((v) => !v)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel={editing ? "Fechar ajuste de meta de água" : "Ajustar meta de água"}
            accessibilityState={{ expanded: editing }}
          >
            <Ionicons
              name={editing ? "close" : "options-outline"}
              size={18}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Números e Barra de Progresso Horizontal */}
      <View style={styles.volumeRow}>
        <View>
          <Text style={styles.consumedText}>
            {consumedMl}{" "}
            <Text style={styles.unitText}>ml</Text>
          </Text>
          <Text style={styles.goalText}>Meta: {goalMl} ml</Text>
        </View>
        <View style={styles.cupsBadge}>
          <Ionicons name="pint-outline" size={14} color={colors.info} />
          <Text style={styles.cupsBadgeText}>
            {cups.consumed} / {cups.total} copos
          </Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%` },
          ]}
        />
      </View>

      {/* Fileira de copos interativos */}
      <View style={styles.cupsRow}>
        {Array.from({ length: Math.min(cups.total, 12) }).map((_, i) => {
          const filled = i < cups.consumed;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onCupPress(i)}
              disabled={busy}
              style={styles.cupBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Copo ${i + 1} de ${Math.min(cups.total, 12)}, ${filled ? "consumido" : "vazio"}`}
              accessibilityState={{ selected: filled, disabled: busy }}
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

      {/* Ações rápidas táteis */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.removeBtn, (busy || cups.consumed === 0) && styles.disabled]}
          onPress={() => addIntake(-status.cupSizeMl)}
          disabled={busy || cups.consumed === 0}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${status.cupSizeMl} ml de água`}
          accessibilityState={{ disabled: busy || cups.consumed === 0 }}
        >
          <Ionicons name="remove" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAddBtn, busy && styles.disabled]}
          onPress={() => addIntake(status.cupSizeMl)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Adicionar ${status.cupSizeMl} ml de água`}
          accessibilityState={{ disabled: busy }}
        >
          <Ionicons name="add" size={16} color={isDark ? colors.text.inverse : "#FFFFFF"} />
          <Text style={styles.quickAddText}>{status.cupSizeMl} ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAddSecondary, busy && styles.disabled]}
          onPress={() => addIntake(500)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Adicionar 500 ml de água"
          accessibilityState={{ disabled: busy }}
        >
          <Ionicons name="add" size={16} color={colors.info} />
          <Text style={styles.quickAddSecondaryText}>500 ml</Text>
        </TouchableOpacity>
      </View>

      {/* Editor de meta */}
      {editing && (
        <View style={styles.editor}>
          <Text style={styles.editorLabel}>Ajustar meta de água</Text>
          <TouchableOpacity
            style={[styles.suggestBtn, usingSuggested && styles.suggestBtnActive]}
            onPress={() => saveGoal(null)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ checked: usingSuggested, disabled: busy }}
          >
            <Ionicons
              name={usingSuggested ? "radio-button-on" : "radio-button-off"}
              size={18}
              color={usingSuggested ? colors.info : colors.text.tertiary}
            />
            <Text style={styles.suggestText}>
              Meta sugerida ({suggestedGoalMl} ml)
            </Text>
          </TouchableOpacity>

          <View style={styles.customRow}>
            <TextInput
              style={styles.input}
              placeholder="Ex: 2500"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="numeric"
              value={goalInput}
              onChangeText={setGoalInput}
              accessibilityLabel="Meta personalizada de água em mililitros"
            />
            <TouchableOpacity
              style={[styles.saveBtn, busy && styles.disabled]}
              onPress={() => {
                const n = parseInt(goalInput, 10);
                if (!isNaN(n)) saveGoal(n);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Salvar meta de água"
              accessibilityState={{ disabled: busy }}
            >
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!!error && (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
};

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.infoLight,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: colors.text.primary,
    },
    subtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: -2,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    percentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.infoLight,
    },
    percentText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: colors.info,
    },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    volumeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    consumedText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: colors.text.primary,
      lineHeight: 30,
    },
    unitText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 15,
      color: colors.text.tertiary,
    },
    goalText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    cupsBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 5,
    },
    cupsBadgeText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.text.secondary,
    },
    progressTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceVariant,
      overflow: "hidden",
      marginBottom: 14,
    },
    progressFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: colors.info,
    },
    cupsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      gap: 4,
      marginBottom: 16,
    },
    cupBtn: {
      minWidth: 44,
      minHeight: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    removeBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    quickAddBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? colors.info : "#0369A1",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    quickAddText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: isDark ? colors.text.inverse : "#FFFFFF",
    },
    quickAddSecondary: {
      paddingHorizontal: 14,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.infoLight,
      borderWidth: 1,
      borderColor: colors.info + "40",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    quickAddSecondaryText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.info,
    },
    disabled: {
      opacity: 0.4,
    },
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
      minHeight: 44,
      paddingVertical: 8,
      gap: 8,
    },
    suggestBtnActive: {},
    suggestText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
    },
    customRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      gap: 10,
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
      backgroundColor: colors.surfaceVariant,
    },
    saveBtn: {
      height: 48,
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
    retryBtn: {
      minHeight: 44,
      justifyContent: "center",
      alignSelf: "flex-start",
      marginTop: 4,
    },
    retry: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
  });

export default HydrationCard;