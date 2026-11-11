import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { createTrainerApi } from "./Trainer/trainerService";
import { MyTrainerData, TrainerLookupData, getInitials } from "./Trainer/trainerTypes";

const SettingsScreen = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { request } = useApi();
  const trainerApi = useMemo(() => createTrainerApi(request), [request]);

  const isStudent = user?.role === "comum";
  const isProfessor = user?.role === "professor";

  const [inviteCode, setInviteCode] = useState("");
  const [myTrainer, setMyTrainer] = useState<MyTrainerData | null>(null);
  const [loadingTrainer, setLoadingTrainer] = useState(isStudent);
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [trainerSuccess, setTrainerSuccess] = useState<string | null>(null);

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [pendingLookup, setPendingLookup] = useState<TrainerLookupData | null>(null);
  const [isConfirmingConnect, setIsConfirmingConnect] = useState(false);

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const loadMyTrainer = useCallback(async () => {
    if (!isStudent) return;
    setLoadingTrainer(true);
    try {
      const data = await trainerApi.getMyTrainer();
      setMyTrainer(data);
    } catch {
      // silencioso na carga inicial se ainda não houver vínculo
    } finally {
      setLoadingTrainer(false);
    }
  }, [isStudent, trainerApi]);

  useEffect(() => {
    loadMyTrainer();
  }, [loadMyTrainer]);

  const handleLookupTrainer = async () => {
    setTrainerError(null);
    setTrainerSuccess(null);
    if (!inviteCode.trim()) {
      setTrainerError("Digite o código de convite do seu Personal Trainer.");
      return;
    }

    setIsLookingUp(true);
    try {
      const found = await trainerApi.lookupTrainer(inviteCode.trim());
      setPendingLookup(found);
    } catch (err) {
      setTrainerError(
        err instanceof Error ? err.message : "Código de treinador inválido."
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmConnect = async () => {
    if (!pendingLookup) return;
    setIsConfirmingConnect(true);
    setTrainerError(null);
    try {
      const res = await trainerApi.connectStudent(pendingLookup.inviteCode);
      setPendingLookup(null);
      setInviteCode("");
      setTrainerSuccess(res.message);
      await loadMyTrainer();
    } catch (err) {
      setPendingLookup(null);
      setTrainerError(
        err instanceof Error ? err.message : "Não foi possível confirmar o vínculo."
      );
    } finally {
      setIsConfirmingConnect(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!myTrainer?.trainer?.trainerId) return;
    setIsDisconnecting(true);
    setTrainerError(null);
    try {
      await trainerApi.disconnect(myTrainer.trainer.trainerId);
      setShowDisconnectModal(false);
      setMyTrainer({ connected: false, trainer: null });
      setTrainerSuccess("Você se desvinculou do Personal Trainer. Seu histórico foi mantido.");
    } catch (err) {
      setShowDisconnectModal(false);
      setTrainerError(
        err instanceof Error ? err.message : "Erro ao desvincular Personal Trainer."
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Configurações
        </Text>

        {user && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.profileHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{getInitials(user.name, "BS")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  {user.name}
                </Text>
                <Text style={[styles.cardBody, { color: colors.text.secondary }]}>
                  {user.email}
                </Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isProfessor
                      ? colors.primaryLight
                      : colors.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: isProfessor ? colors.primary : colors.text.secondary },
                  ]}
                >
                  {isProfessor ? "Personal" : "Aluno"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Conectar ou Gerenciar Personal Trainer (exclusivo para alunos) */}
        {isStudent && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Ionicons name="barbell" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Meu Personal Trainer
              </Text>
            </View>

            {!!trainerError && (
              <View style={[styles.feedbackBox, { backgroundColor: colors.error + "18" }]}>
                <Text style={[styles.feedbackText, { color: colors.error }]}>{trainerError}</Text>
              </View>
            )}

            {!!trainerSuccess && (
              <View style={[styles.feedbackBox, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.feedbackText, { color: colors.success }]}>{trainerSuccess}</Text>
              </View>
            )}

            {loadingTrainer ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : myTrainer?.connected && myTrainer.trainer ? (
              <View style={[styles.connectedBox, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarSmallText}>{getInitials(myTrainer.trainer.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text.primary, fontSize: 14 }]}>
                      {myTrainer.trainer.name}
                    </Text>
                    <Text style={[styles.cardBody, { color: colors.text.secondary, fontSize: 12 }]}>
                      {myTrainer.trainer.inviteCode
                        ? `Código: ${myTrainer.trainer.inviteCode}`
                        : myTrainer.trainer.email}
                    </Text>
                  </View>
                  <View style={[styles.activeTag, { backgroundColor: colors.successLight }]}>
                    <Text style={[styles.activeTagText, { color: colors.success }]}>Ativo</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.disconnectBtn, { borderColor: colors.error }]}
                  onPress={() => setShowDisconnectModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="unlink-outline" size={15} color={colors.error} style={{ marginRight: 6 }} />
                  <Text style={[styles.disconnectBtnText, { color: colors.error }]}>
                    Desvincular Personal
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.cardBody, { color: colors.text.secondary, marginBottom: 12 }]}>
                  Digite o código fornecido pelo seu treinador para sincronizar suas fichas e treinos:
                </Text>

                <View style={styles.inviteInputRow}>
                  <TextInput
                    style={[
                      styles.inviteInput,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.border,
                        color: colors.text.primary,
                      },
                    ]}
                    placeholder="Ex: BS-8492"
                    placeholderTextColor={colors.text.tertiary}
                    value={inviteCode}
                    onChangeText={(t) => {
                      setTrainerError(null);
                      setTrainerSuccess(null);
                      setInviteCode(t.toUpperCase());
                    }}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={[
                      styles.connectBtn,
                      { backgroundColor: colors.primary },
                      isLookingUp && { opacity: 0.7 },
                    ]}
                    onPress={handleLookupTrainer}
                    disabled={isLookingUp}
                    activeOpacity={0.85}
                  >
                    {isLookingUp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.connectBtnText}>Buscar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        <View
          style={[
            styles.card,
            styles.rowCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Aparência
            </Text>
            <Text style={[styles.cardBody, { color: colors.text.secondary }]}>
              {isDark ? "Tema Escuro" : "Tema Claro"}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.borderHeavy, true: colors.primary }}
            thumbColor={isDark ? colors.primary : colors.background}
          />
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.error }]}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.error}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Sair da conta
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Confirmação de Vínculo com Personal Trainer */}
      <Modal
        visible={!!pendingLookup}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingLookup(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Confirmar Personal Trainer
            </Text>
            <Text style={[styles.modalBody, { color: colors.text.secondary }]}>
              Deseja conectar sua conta ao acompanhamento de{" "}
              <Text style={{ fontFamily: "Poppins_700Bold", color: colors.text.primary }}>
                {pendingLookup?.name}
              </Text>{" "}
              (código {pendingLookup?.inviteCode})? Ele poderá visualizar seu histórico de treinos e prescrever novas fichas.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setPendingLookup(null)}
                disabled={isConfirmingConnect}
              >
                <Text style={[styles.modalCancelText, { color: colors.text.primary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: colors.primary },
                  isConfirmingConnect && { opacity: 0.7 },
                ]}
                onPress={handleConfirmConnect}
                disabled={isConfirmingConnect}
              >
                {isConfirmingConnect ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Desvínculo */}
      <Modal
        visible={showDisconnectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisconnectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Desvincular Personal Trainer?
            </Text>
            <Text style={[styles.modalBody, { color: colors.text.secondary }]}>
              Deseja encerrar o acompanhamento com {myTrainer?.trainer?.name}? Seus treinos já prescritos serão mantidos no seu histórico.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowDisconnectModal(false)}
                disabled={isDisconnecting}
              >
                <Text style={[styles.modalCancelText, { color: colors.text.primary }]}>Manter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: colors.error },
                  isDisconnecting && { opacity: 0.7 },
                ]}
                onPress={handleConfirmDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Desvincular</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  cardBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  feedbackBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  feedbackText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  connectedBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  disconnectBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  inviteInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  inviteInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    letterSpacing: 1.5,
  },
  connectBtn: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    marginBottom: 8,
  },
  modalBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});

export default SettingsScreen;
