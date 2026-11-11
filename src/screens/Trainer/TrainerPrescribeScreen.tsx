import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { useApi } from "../../hooks/useApi";
import { createTrainerApi } from "./trainerService";
import { Student } from "./trainerTypes";

interface ExerciseItem {
  id: string;
  exerciseId: number;
  name: string;
  category: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

interface CatalogExerciseItem {
  id: string;
  exerciseId: number;
  name: string;
  category: string;
}

interface Props {
  student: Student;
  onBack: () => void;
  onSuccess: (studentName: string, planName: string) => void;
}

export const TrainerPrescribeScreen = ({ student, onBack, onSuccess }: Props) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const trainerApi = useMemo(() => createTrainerApi(request), [request]);

  const [planName, setPlanName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);

  // Modal de Adicionar Exercício do Catálogo real da API (busca e paginação server-side)
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("Todos");
  const [catalogCategories, setCatalogCategories] = useState<string[]>(["Todos"]);
  const [catalogItems, setCatalogItems] = useState<CatalogExerciseItem[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    trainerApi
      .getExerciseCategories()
      .then((cats) => setCatalogCategories(["Todos", ...cats]))
      .catch(() => {});
  }, [trainerApi]);

  const loadCatalog = useCallback(
    async (offset = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setCatalogLoading(true);
      setCatalogError(null);
      try {
        const { exercises: apiExs, total } = await trainerApi.getExercises({
          search: catalogSearch.trim() || undefined,
          category: catalogFilter === "Todos" ? undefined : catalogFilter,
          limit: 50,
          offset,
        });
        const mapped = apiExs.map((e: any) => ({
          id: String(e.id),
          exerciseId: Number(e.id),
          name: e.name,
          category: e.category || e.muscles?.[0]?.name || "Geral",
        }));
        setCatalogTotal(total);
        setCatalogItems((prev) => (append ? [...prev, ...mapped] : mapped));
      } catch (e) {
        setCatalogError(
          e instanceof Error ? e.message : "Erro ao carregar catálogo de exercícios."
        );
      } finally {
        setCatalogLoading(false);
        setLoadingMore(false);
      }
    },
    [trainerApi, catalogSearch, catalogFilter]
  );

  useEffect(() => {
    if (!showPickerModal) return;
    const t = setTimeout(() => loadCatalog(0, false), 250);
    return () => clearTimeout(t);
  }, [showPickerModal, loadCatalog]);

  const filteredCatalog = catalogItems;

  const handleAddExerciseFromCatalog = (catalogItem: CatalogExerciseItem) => {
    setFormError(null);
    const newItem: ExerciseItem = {
      id: `ex-${Date.now()}-${Math.random()}`,
      exerciseId: catalogItem.exerciseId,
      name: catalogItem.name,
      category: catalogItem.category,
      sets: 4,
      reps: 10,
      restSeconds: 60,
    };
    setExercises((prev) => [...prev, newItem]);
    setShowPickerModal(false);
  };

  const handleUpdateExercise = (
    id: string,
    field: "sets" | "reps" | "restSeconds",
    delta: number
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== id) return ex;
        const currentVal = ex[field];
        const minVal = field === "restSeconds" ? 15 : 1;
        const step = field === "restSeconds" ? 15 : 1;
        const nextVal = Math.max(minVal, currentVal + delta * step);
        return { ...ex, [field]: nextVal };
      })
    );
  };

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleSaveAndAssign = async () => {
    setFormError(null);
    if (!planName.trim()) {
      setFormError("Por favor, dê um nome ao treino (ex: Treino A - Peito e Costas).");
      return;
    }
    if (exercises.length === 0) {
      setFormError("Adicione pelo menos 1 exercício do catálogo ao plano.");
      return;
    }

    setIsSubmitting(true);
    try {
      await trainerApi.prescribeWorkout({
        studentId: student.id,
        name: planName.trim(),
        exercises: exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
        })),
      });
      onSuccess(student.name, planName.trim());
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a prescrição na API."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedMinutes = exercises.length * 6 + 10;
  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Prescrever Treino</Text>
          <Text style={styles.headerSubtitle}>Para: {student.name}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {!!formError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* Campo de Nome do Treino */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome do Treino</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino C - Ombros & Core"
            placeholderTextColor={colors.text.tertiary}
            value={planName}
            onChangeText={(t) => {
              setFormError(null);
              setPlanName(t);
            }}
          />
        </View>

        {/* Lista de Exercícios Adicionados */}
        <View style={styles.exercisesSectionHeader}>
          <Text style={styles.sectionTitle}>
            Exercícios ({exercises.length})
          </Text>
          <Text style={styles.estTimeText}>~{estimatedMinutes} min estimado</Text>
        </View>

        {exercises.length === 0 ? (
          <View style={styles.emptyExercisesBox}>
            <Ionicons name="barbell-outline" size={28} color={colors.text.tertiary} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyExercisesText}>
              Nenhum exercício adicionado. Escolha do catálogo abaixo para montar o treino.
            </Text>
          </View>
        ) : (
          exercises.map((ex, index) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseCardTop}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardExName}>{ex.name}</Text>
                <Text style={styles.cardExCat}>{ex.category}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveExercise(ex.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Steppers de Séries, Reps e Descanso */}
            <View style={styles.steppersRow}>
              {/* Séries */}
              <View style={styles.stepperBox}>
                <Text style={styles.stepperLabel}>Séries</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "sets", -1)}
                  >
                    <Ionicons name="remove" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{ex.sets}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "sets", 1)}
                  >
                    <Ionicons name="add" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Repetições */}
              <View style={styles.stepperBox}>
                <Text style={styles.stepperLabel}>Reps</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "reps", -1)}
                  >
                    <Ionicons name="remove" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{ex.reps}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "reps", 1)}
                  >
                    <Ionicons name="add" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Descanso */}
              <View style={styles.stepperBox}>
                <Text style={styles.stepperLabel}>Descanso</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "restSeconds", -1)}
                  >
                    <Ionicons name="remove" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{ex.restSeconds}s</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateExercise(ex.id, "restSeconds", 1)}
                  >
                    <Ionicons name="add" size={14} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))
        )}

        {/* Botão para Adicionar Exercício */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => setShowPickerModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.addExerciseText}>Adicionar Exercício do Catálogo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barra Fixa no Rodapé com Ação Principal */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSaveAndAssign}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Salvar e Atribuir ao Aluno</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Catálogo de Exercícios */}
      <Modal visible={showPickerModal} transparent animationType="slide" onRequestClose={() => setShowPickerModal(false)}>
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Catálogo de Exercícios</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Busca no Catálogo */}
            <View style={styles.pickerSearchBar}>
              <Ionicons name="search-outline" size={18} color={colors.text.tertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Buscar exercício..."
                placeholderTextColor={colors.text.tertiary}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
              />
              {catalogSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCatalogSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtro Muscular Dinâmico */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
              {catalogCategories.map((cat) => {
                const active = catalogFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catalogChip, active && styles.catalogChipActive]}
                    onPress={() => setCatalogFilter(cat)}
                  >
                    <Text style={[styles.catalogChipText, active && styles.catalogChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {catalogLoading ? (
                <View style={styles.emptyExercisesBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.emptyExercisesText, { marginTop: 8 }]}>Carregando catálogo...</Text>
                </View>
              ) : catalogError ? (
                <View style={styles.emptyExercisesBox}>
                  <Text style={[styles.emptyExercisesText, { color: colors.error }]}>{catalogError}</Text>
                  <TouchableOpacity onPress={() => loadCatalog(0, false)} style={{ marginTop: 8 }}>
                    <Text style={{ fontFamily: "Poppins_600SemiBold", color: colors.primary }}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredCatalog.length === 0 ? (
                <View style={styles.emptyExercisesBox}>
                  <Text style={styles.emptyExercisesText}>Nenhum exercício encontrado para esta busca.</Text>
                </View>
              ) : (
                <>
                  {filteredCatalog.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.catalogItemRow}
                      onPress={() => handleAddExerciseFromCatalog(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogItemName}>{item.name}</Text>
                        <Text style={styles.catalogItemCat}>{item.category}</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                  {catalogItems.length < catalogTotal && (
                    <TouchableOpacity
                      style={styles.loadMoreBtn}
                      onPress={() => loadCatalog(catalogItems.length, true)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>
                          Carregar mais ({catalogItems.length} de {catalogTotal})
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEF2F2",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error + "40",
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.error,
    },
    emptyExercisesBox: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
      marginBottom: 12,
    },
    emptyExercisesText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
    },
    headerSubtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.primary,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.text.primary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 48,
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.primary,
    },
    exercisesSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      marginTop: 4,
    },
    sectionTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: colors.text.primary,
    },
    estTimeText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 12,
      color: colors.text.tertiary,
    },
    exerciseCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    exerciseCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    orderBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    orderBadgeText: {
      fontFamily: "Poppins_700Bold",
      fontSize: 12,
      color: colors.primary,
    },
    cardExName: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.text.primary,
    },
    cardExCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
    },
    removeBtn: {
      padding: 6,
    },
    steppersRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: isDark ? colors.surfaceVariant : "#F8FAFC",
      borderRadius: 12,
      padding: 10,
    },
    stepperBox: {
      flex: 1,
      alignItems: "center",
    },
    stepperLabel: {
      fontFamily: "Poppins_500Medium",
      fontSize: 10,
      color: colors.text.tertiary,
      marginBottom: 4,
    },
    stepperControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    stepperBtn: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperValue: {
      fontFamily: "Poppins_700Bold",
      fontSize: 13,
      color: colors.text.primary,
      minWidth: 26,
      textAlign: "center",
    },
    addExerciseBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: "dashed",
      backgroundColor: isDark ? colors.surface : "#FFFBF7",
      marginTop: 4,
    },
    addExerciseText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 13,
      color: colors.primary,
    },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 15,
      color: "#FFFFFF",
    },
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    pickerModalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "80%",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    pickerTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 18,
      color: colors.text.primary,
    },
    pickerSearchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? colors.surfaceVariant : "#F1F5F9",
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 12,
    },
    pickerSearchInput: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: colors.text.primary,
    },
    catalogChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: isDark ? colors.surfaceVariant : "#F1F5F9",
    },
    catalogChipActive: {
      backgroundColor: colors.primary,
    },
    catalogChipText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 11,
      color: colors.text.secondary,
    },
    catalogChipTextActive: {
      color: "#FFFFFF",
      fontFamily: "Poppins_600SemiBold",
    },
    catalogItemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    catalogItemName: {
      fontFamily: "Poppins_500Medium",
      fontSize: 14,
      color: colors.text.primary,
    },
    catalogItemCat: {
      fontFamily: "Poppins_400Regular",
      fontSize: 11,
      color: colors.text.tertiary,
      marginTop: 2,
    },
    loadMoreBtn: {
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
    },
    loadMoreText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
  });
