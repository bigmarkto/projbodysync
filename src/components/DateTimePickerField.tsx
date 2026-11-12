import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { lightColors } from "../theme/colors";

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateOnlyLocal(raw?: string | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoPrefix) {
    const y = Number(isoPrefix[1]);
    const m = Number(isoPrefix[2]);
    const d = Number(isoPrefix[3]);
    const candidate = new Date(y, m - 1, d, 12, 0, 0);
    if (
      candidate.getFullYear() === y &&
      candidate.getMonth() === m - 1 &&
      candidate.getDate() === d
    ) {
      return candidate;
    }
    return null;
  }
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) {
    const d = Number(br[1]);
    const m = Number(br[2]);
    const y = Number(br[3]);
    const candidate = new Date(y, m - 1, d, 12, 0, 0);
    if (
      candidate.getFullYear() === y &&
      candidate.getMonth() === m - 1 &&
      candidate.getDate() === d
    ) {
      return candidate;
    }
    return null;
  }
  if (/^\d{4}$/.test(trimmed)) {
    return new Date(Number(trimmed), 0, 1, 12, 0, 0);
  }
  return null;
}

export function formatDateBR(raw?: string | null, short = false): string {
  const d = parseDateOnlyLocal(raw);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  if (short) return `${day}/${month}`;
  return `${day}/${month}/${d.getFullYear()}`;
}

export function parseTimeHHMM(raw?: string | null): Date {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((raw || "").trim());
  if (m) {
    return new Date(1970, 0, 1, Number(m[1]), Number(m[2]), 0);
  }
  return new Date(1970, 0, 1, 7, 0, 0);
}

export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

interface BasePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  forceLight?: boolean;
}

interface DatePickerFieldProps extends BasePickerProps {
  minimumDate?: Date;
  maximumDate?: Date;
}

type TimePickerFieldProps = BasePickerProps;

function PickerShell({
  label,
  error,
  icon = "calendar-outline",
  compact,
  forceLight,
  children,
}: {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  forceLight?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const palette = forceLight ? lightColors : colors;

  return (
    <View style={compact ? styles.groupCompact : styles.group}>
      {!!label && (
        <Text style={[styles.label, { color: palette.text.secondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.row,
          compact && styles.rowCompact,
          {
            backgroundColor: palette.card,
            borderColor: error ? palette.error : palette.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={palette.text.tertiary}
          style={styles.icon}
        />
        {children}
      </View>
      {!!error && (
        <Text style={[styles.error, { color: palette.error }]}>{error}</Text>
      )}
    </View>
  );
}

function IosSpinnerModal({
  visible,
  mode,
  value,
  minimumDate,
  maximumDate,
  forceLight,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: "date" | "time";
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  forceLight?: boolean;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}) {
  const { colors } = useTheme();
  const palette = forceLight ? lightColors : colors;
  const [draft, setDraft] = useState<Date>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <DateTimePicker
            mode={mode}
            value={draft}
            display="spinner"
            is24Hour
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              if (selected) setDraft(selected);
            }}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { borderColor: palette.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.modalBtnText, { color: palette.text.secondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: palette.primary, borderColor: palette.primary },
              ]}
              onPress={() => onConfirm(draft)}
            >
              <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const DatePickerField = ({
  label,
  value,
  onChange,
  placeholder = "Selecione uma data",
  error,
  icon = "calendar-outline",
  minimumDate,
  maximumDate,
  compact,
  forceLight,
}: DatePickerFieldProps) => {
  const { colors, isDark } = useTheme();
  const palette = forceLight ? lightColors : colors;
  const [showNative, setShowNative] = useState(false);

  const parsedDate = useMemo(
    () => parseDateOnlyLocal(value) ?? maximumDate ?? new Date(),
    [value, maximumDate]
  );

  const webValue = useMemo(() => {
    const parsed = parseDateOnlyLocal(value);
    return parsed ? toLocalDateKey(parsed) : "";
  }, [value]);

  const minIso = minimumDate ? toLocalDateKey(minimumDate) : undefined;
  const maxIso = maximumDate ? toLocalDateKey(maximumDate) : undefined;

  if (Platform.OS === "web") {
    return (
      <PickerShell
        label={label}
        error={error}
        icon={icon}
        compact={compact}
        forceLight={forceLight}
      >
        {React.createElement("input", {
          type: "date",
          value: webValue,
          min: minIso,
          max: maxIso,
          "aria-label": label || placeholder,
          onChange: (e: any) => {
            onChange(e?.target?.value ?? "");
          },
          style: {
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            color: webValue ? palette.text.primary : palette.text.tertiary,
            fontFamily: "Poppins_400Regular, system-ui, sans-serif",
            fontSize: 14,
            cursor: "pointer",
            colorScheme: !forceLight && isDark ? "dark" : "light",
          },
        })}
      </PickerShell>
    );
  }

  const displayLabel = formatDateBR(value);

  return (
    <PickerShell
      label={label}
      error={error}
      icon={icon}
      compact={compact}
      forceLight={forceLight}
    >
      <Pressable
        style={styles.nativePressable}
        onPress={() => setShowNative(true)}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
      >
        <Text
          style={[
            styles.nativeText,
            { color: displayLabel ? palette.text.primary : palette.text.tertiary },
          ]}
        >
          {displayLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={palette.text.tertiary} />
      </Pressable>

      {showNative && Platform.OS === "android" && (
        <DateTimePicker
          mode="date"
          display="default"
          value={parsedDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            setShowNative(false);
            if (event.type === "set" && selected) {
              onChange(toLocalDateKey(selected));
            }
          }}
        />
      )}

      {Platform.OS === "ios" && (
        <IosSpinnerModal
          visible={showNative}
          mode="date"
          value={parsedDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          forceLight={forceLight}
          onCancel={() => setShowNative(false)}
          onConfirm={(chosen) => {
            setShowNative(false);
            onChange(toLocalDateKey(chosen));
          }}
        />
      )}
    </PickerShell>
  );
};

export const TimePickerField = ({
  label,
  value,
  onChange,
  placeholder = "Selecione horário (HH:MM)",
  error,
  icon = "time-outline",
  compact,
  forceLight,
}: TimePickerFieldProps) => {
  const { colors, isDark } = useTheme();
  const palette = forceLight ? lightColors : colors;
  const [showNative, setShowNative] = useState(false);

  const parsedTime = useMemo(() => parseTimeHHMM(value), [value]);

  if (Platform.OS === "web") {
    return (
      <PickerShell
        label={label}
        error={error}
        icon={icon}
        compact={compact}
        forceLight={forceLight}
      >
        {React.createElement("input", {
          type: "time",
          value: /^\d{2}:\d{2}$/.test(value) ? value : "",
          "aria-label": label || placeholder,
          onChange: (e: any) => {
            onChange(e?.target?.value ?? "");
          },
          style: {
            flex: 1,
            width: "100%",
            height: "100%",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            color: value ? palette.text.primary : palette.text.tertiary,
            fontFamily: "Poppins_400Regular, system-ui, sans-serif",
            fontSize: 14,
            cursor: "pointer",
            colorScheme: !forceLight && isDark ? "dark" : "light",
          },
        })}
      </PickerShell>
    );
  }

  return (
    <PickerShell
      label={label}
      error={error}
      icon={icon}
      compact={compact}
      forceLight={forceLight}
    >
      <Pressable
        style={styles.nativePressable}
        onPress={() => setShowNative(true)}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
      >
        <Text
          style={[
            styles.nativeText,
            { color: value ? palette.text.primary : palette.text.tertiary },
          ]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={palette.text.tertiary} />
      </Pressable>

      {showNative && Platform.OS === "android" && (
        <DateTimePicker
          mode="time"
          display="default"
          value={parsedTime}
          is24Hour
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            setShowNative(false);
            if (event.type === "set" && selected) {
              onChange(formatTimeHHMM(selected));
            }
          }}
        />
      )}

      {Platform.OS === "ios" && (
        <IosSpinnerModal
          visible={showNative}
          mode="time"
          value={parsedTime}
          forceLight={forceLight}
          onCancel={() => setShowNative(false)}
          onConfirm={(chosen) => {
            setShowNative(false);
            onChange(formatTimeHHMM(chosen));
          }}
        />
      )}
    </PickerShell>
  );
};

const styles = StyleSheet.create({
  group: { marginBottom: 14 },
  groupCompact: { marginBottom: 0 },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 14,
  },
  rowCompact: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 10 },
  nativePressable: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nativeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
});
