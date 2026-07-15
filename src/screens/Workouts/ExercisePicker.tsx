import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { lightColors } from "../../theme/colors";
import { Exercise, PlanExercise } from "./types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (exercises: PlanExercise[]) => void;
  existingIds: number[]; // já no plano (para marcar/travar)
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 12;

const ExercisePicker = ({ visible, onClose, onConfirm, existingIds }: Props) => {
  const { colors } = useTheme();
  const { request } = useApi();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<number, Exercise>>(new Map());

  const load = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        const qs = term ? `?search=${encodeURIComponent(term)}&limit=30` : "?limit=30";
        const res = await request(`/exercises${qs}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.exercises ?? []);
        }
      } catch {
        // silencioso — mantém lista atual
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  // Recarrega ao abrir e com debounce ao digitar
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, visible, load]);

  // Reseta a seleção sempre que reabre
  useEffect(() => {
    if (visible) setSelected(new Map());
  }, [visible]);

  const toggle = (ex: Exercise) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.set(ex.id, ex);
      return next;
    });
  };

  const confirm = () => {
    const picked: PlanExercise[] = [...selected.values()].map((e, i) => ({
      id: 0,
      exerciseId: e.id,
      sets: DEFAULT_SETS,
      reps: DEFAULT_REPS,
      orderIndex: i,
      exercise: {
        id: e.id,
        name: e.name,
        category: e.category,
        imageUrl: e.imageUrl,
        muscles: e.muscles,
      },
    }));
    onConfirm(picked);
    onClose();
  };

  const renderItem = ({ item }: { item: Exercise }) => {
    const already = existingIds.includes(item.id);
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, already && styles.rowDisabled]}
        onPress={() => !already && toggle(item)}
        disabled={already}
        activeOpacity={0.7}
      >
        <View style={styles.thumb}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} />
          ) : (
            <Ionicons name="barbell-outline" size={20} color={colors.text.tertiary} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.category && <Text style={styles.rowCat}>{item.category}</Text>}
        </View>
        {already ? (
          <Text style={styles.added}>No plano</Text>
        ) : (
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={isSelected ? colors.primary : colors.borderHeavy}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Adicionar exercícios</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar exercício..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>Nenhum exercício encontrado.</Text>
            }
          />
        )}

        {selected.size > 0 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>
                Adicionar {selected.size}{" "}
                {selected.size === 1 ? "exercício" : "exercícios"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    title: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: colors.text.primary,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 14,
      height: 46,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      textAlign: "center",
      marginTop: 40,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.tertiary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    rowDisabled: { opacity: 0.45 },
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
    rowInfo: { flex: 1 },
    rowName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.primary,
    },
    rowCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    added: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    confirmBtn: {
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
  });

export default ExercisePicker;
