import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRegister } from "./RegisterContext";
import { StepHeader, FieldInput, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";
import DateTimePicker from "@react-native-community/datetimepicker";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIME_SLOTS = ["Manhã", "Tarde", "Noite"];
const TIME_PRESETS: Record<string, string> = {
  Manhã: "07:00",
  Tarde: "14:00",
  Noite: "19:00",
};

interface Props {
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
  currentStep: number;
}

export const Step4Schedule = ({ onNext, onBack, totalSteps, currentStep }: Props) => {
  const { data, setField } = useRegister();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showHydrationPicker, setShowHydrationPicker] = useState(false);

  const toggleDay = (idx: number) => {
    const days = data.workoutDays.includes(idx)
      ? data.workoutDays.filter((d) => d !== idx)
      : [...data.workoutDays, idx];
    setField("workoutDays", days);
  };

  const selectPreset = (label: string) => {
    setSelectedPreset(label);
    setField("workoutTime", TIME_PRESETS[label]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (data.workoutDays.length === 0) e.days = "Selecione ao menos 1 dia.";
    if (!data.workoutTime) e.workoutTime = "Informe o horário dos treinos.";
    if (data.hydrationReminder && !data.hydrationTime)
      e.hydrationTime = "Informe o horário do lembrete de água.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <SafeAreaView style={s.safe}>
      <StepHeader current={currentStep} total={totalSteps} label="Agenda e hidratação" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Agenda e hidratação</Text>

        {/* Dias da semana */}
        <Text style={s.sectionLabel}>Dias de treino</Text>
        <View style={s.daysRow}>
          {DAYS.map((d, i) => {
            const selected = data.workoutDays.includes(i);
            return (
              <TouchableOpacity
                key={i}
                style={[s.dayBtn, selected && s.dayBtnSelected]}
                onPress={() => {
                  toggleDay(i);
                  setErrors((e) => ({ ...e, days: "" }));
                }}
              >
                <Text style={[s.dayLabel, selected && s.dayLabelSelected]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!errors.days && <Text style={s.error}>{errors.days}</Text>}

        {/* Presets de horário */}
        <Text style={s.sectionLabel}>Horários preferidos</Text>
        <View style={s.presetRow}>
          {TIME_SLOTS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.presetChip, selectedPreset === t && s.presetChipSelected]}
              onPress={() => selectPreset(t)}
            >
              <Ionicons
                name={t === "Manhã" ? "sunny-outline" : t === "Tarde" ? "partly-sunny-outline" : "moon-outline"}
                size={14}
                color={selectedPreset === t ? lightColors.primary : lightColors.text.tertiary}
                style={{ marginRight: 4 }}
              />
              <Text style={[s.presetText, selectedPreset === t && s.presetTextSelected]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horário manual (time picker) */}
        <Text style={s.sectionLabel}>Horário exato</Text>
        <TouchableOpacity style={s.timePickerBtn} onPress={() => setShowPicker(true)}>
          <Ionicons name="time-outline" size={18} color={lightColors.text.tertiary} style={{ marginRight: 10 }} />
          <Text style={s.timePickerText}>{data.workoutTime || "Selecione horário (HH:MM)"}</Text>
        </TouchableOpacity>
        {showPicker && (
          <Modal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={s.modalBackdrop}>
              <View style={s.modalContainer}>
                <DateTimePicker
                  mode="time"
                  value={data.workoutTime ? new Date(1970,0,1,parseInt(data.workoutTime.split(":")[0]),parseInt(data.workoutTime.split(":")[1])) : new Date()}
                  is24Hour={true}
                  display="spinner"
                  onChange={(_, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) {
                      const hrs = selectedDate.getHours().toString().padStart(2, "0");
                      const mins = selectedDate.getMinutes().toString().padStart(2, "0");
                      const timeStr = `${hrs}:${mins}`;
                      setField("workoutTime", timeStr);
                      setErrors((e) => ({ ...e, workoutTime: "" }));
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Hidratação */}
        <View style={s.hydrationRow}>
          <View style={s.hydrationLeft}>
            <Ionicons name="water-outline" size={20} color={lightColors.primary} style={{ marginRight: 10 }} />
            <Text style={s.hydrationLabel}>Ser lembrado de beber água</Text>
          </View>
          <Switch
            value={data.hydrationReminder}
            onValueChange={(v) => setField("hydrationReminder", v)}
            trackColor={{ false: lightColors.border, true: lightColors.primary }}
            thumbColor="#fff"
          />
        </View>

        {data.hydrationReminder && (
          <>
            <Text style={s.sectionLabel}>Horário do lembrete</Text>
            <TouchableOpacity style={s.timePickerBtn} onPress={() => setShowHydrationPicker(true)}>
              <Ionicons name="alarm-outline" size={18} color={lightColors.text.tertiary} style={{ marginRight: 10 }} />
              <Text style={s.timePickerText}>{data.hydrationTime || "Selecione horário (HH:MM)"}</Text>
            </TouchableOpacity>
            {showHydrationPicker && (
                          <Modal
                            visible={showHydrationPicker}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowHydrationPicker(false)}
                          >
                            <View style={s.modalBackdrop}>
                              <View style={s.modalContainer}>
                                <DateTimePicker
                                  mode="time"
                                  value={data.hydrationTime ? new Date(1970,0,1,parseInt(data.hydrationTime.split(":")[0]),parseInt(data.hydrationTime.split(":")[1])) : new Date()}
                                  is24Hour={true}
                                  display="spinner"
                                  onChange={(_, selectedDate) => {
                                    setShowHydrationPicker(false);
                                    if (selectedDate) {
                                      const hrs = selectedDate.getHours().toString().padStart(2, "0");
                                      const mins = selectedDate.getMinutes().toString().padStart(2, "0");
                                      const timeStr = `${hrs}:${mins}`;
                                      setField("hydrationTime", timeStr);
                                      setErrors((e) => ({ ...e, hydrationTime: "" }));
                                    }
                                  }}
                                />
                              </View>
                            </View>
                          </Modal>
                        )}
          </>
        )}

        <View style={{ height: 24 }} />
        <ContinueButton onPress={() => { if (validate()) onNext(); }} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: lightColors.text.primary,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnSelected: {
    backgroundColor: lightColors.primary,
    borderColor: lightColors.primary,
  },
  dayLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: lightColors.text.tertiary,
  },
  dayLabelSelected: { color: "#fff" },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
  },
  presetChipSelected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  presetText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  presetTextSelected: { color: lightColors.primary },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    marginBottom: 16,
  },
  timePickerText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
  },
  hydrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: lightColors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: lightColors.border,
    marginBottom: 16,
  },
  hydrationLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  hydrationLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: lightColors.text.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    padding: 16,
    minWidth: '80%',
  },
});
