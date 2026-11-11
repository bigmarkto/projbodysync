import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { Student } from "./trainerTypes";
import { TrainerHomeScreen } from "./TrainerHomeScreen";
import { StudentDetailScreen } from "./StudentDetailScreen";
import { TrainerPrescribeScreen } from "./TrainerPrescribeScreen";
import { TrainerAnalyticsScreen } from "./TrainerAnalyticsScreen";
import SettingsScreen from "../SettingsScreen";

export const TrainerMainFlow = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"analytics" | "students" | "settings">("analytics");
  const [subScreen, setSubScreen] = useState<"list" | "detail" | "prescribe">("list");
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [prescribeNotice, setPrescribeNotice] = useState<string | null>(null);

  const handleSelectStudent = (student: Student) => {
    setPrescribeNotice(null);
    setCurrentStudentId(student.id);
    setCurrentStudent(student);
    setActiveTab("students");
    setSubScreen("detail");
  };

  const handleSelectStudentId = (studentId: string) => {
    setPrescribeNotice(null);
    setCurrentStudentId(studentId);
    setCurrentStudent(null);
    setActiveTab("students");
    setSubScreen("detail");
  };

  const handleOpenPrescribe = (student: Student) => {
    setPrescribeNotice(null);
    setCurrentStudentId(student.id);
    setCurrentStudent(student);
    setActiveTab("students");
    setSubScreen("prescribe");
  };

  const handlePrescribeSuccess = (studentName: string, planName: string) => {
    setPrescribeNotice(
      `Plano "${planName}" atribuído para ${studentName}!`
    );
    setSubScreen("detail");
  };

  // Renderizador da tela ativa
  const renderCurrentView = () => {
    if (activeTab === "analytics") {
      return (
        <TrainerAnalyticsScreen
          onGoToStudents={() => {
            setActiveTab("students");
            setSubScreen("list");
          }}
          onSelectStudentId={handleSelectStudentId}
        />
      );
    }

    if (activeTab === "settings") {
      return <SettingsScreen />;
    }

    // Tab "students" (fluxo com sub-telas)
    if (subScreen === "detail" && currentStudentId) {
      return (
        <StudentDetailScreen
          studentId={currentStudentId}
          initialStudent={currentStudent ?? undefined}
          noticeMessage={prescribeNotice}
          onClearNotice={() => setPrescribeNotice(null)}
          onBack={() => {
            setSubScreen("list");
            setPrescribeNotice(null);
          }}
          onPrescribe={handleOpenPrescribe}
          onDisconnected={() => {
            setCurrentStudentId(null);
            setCurrentStudent(null);
            setSubScreen("list");
          }}
        />
      );
    }

    if (subScreen === "prescribe" && currentStudent) {
      return (
        <TrainerPrescribeScreen
          student={currentStudent}
          onBack={() => setSubScreen("detail")}
          onSuccess={handlePrescribeSuccess}
        />
      );
    }

    return (
      <TrainerHomeScreen
        onSelectStudent={handleSelectStudent}
        onPrescribeForStudent={handleOpenPrescribe}
      />
    );
  };

  // Esconder a TabBar flutuante se estiver na tela de prescrever treino (para foco total)
  const isTabBarVisible = subScreen !== "prescribe";

  return (
    <View style={styles.root}>
      {renderCurrentView()}

      {/* TabBar Flutuante do Personal Trainer */}
      {isTabBarVisible && (
        <View
          style={[
            styles.tabBarWrapper,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab("analytics")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "analytics" ? "trending-up" : "trending-up-outline"}
              size={22}
              color={activeTab === "analytics" ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "analytics" ? colors.primary : colors.text.tertiary },
              ]}
            >
              Métricas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => {
              setActiveTab("students");
              setSubScreen("list");
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "students" ? "people" : "people-outline"}
              size={22}
              color={activeTab === "students" ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "students" ? colors.primary : colors.text.tertiary },
              ]}
            >
              Alunos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setActiveTab("settings")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "settings" ? "settings" : "settings-outline"}
              size={22}
              color={activeTab === "settings" ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === "settings" ? colors.primary : colors.text.tertiary },
              ]}
            >
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    marginTop: 3,
  },
});
