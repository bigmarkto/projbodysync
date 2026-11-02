import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRegister } from "./RegisterContext";
import { lightColors } from "../../theme/colors";
import { API_URL } from "../../config/api";

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  premium: { name: "BodySync Premium", price: "R$29,90" },
  basic: { name: "BodySync Basic", price: "R$49,90" },
  pro: { name: "BodySync Pro", price: "R$99,90" },
  custom: { name: "BodySync Custom", price: "—" },
};

interface Props {
  onPaid: () => void;
  onBack: () => void;
  accessToken: string;
}

export const PaymentScreen = ({ onPaid, onBack, accessToken }: Props) => {
  const { data } = useRegister();
  const plan = PLAN_LABELS[data.subscriptionType] || {
    name: "Plano",
    price: "—",
  };

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleActivate = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payment/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ subscriptionType: data.subscriptionType }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error || "Falha ao ativar plano. Tente novamente.");
        return;
      }
      onPaid();
    } catch {
      setErrorMsg("Sem conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={lightColors.text.primary}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ativação do Plano</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.planCard}>
          <View style={s.planCardTop}>
            <Text style={s.planCardName}>{plan.name}</Text>
            <Ionicons
              name="sparkles-outline"
              size={22}
              color="rgba(255,255,255,0.85)"
            />
          </View>
          <View style={s.planCardBottom}>
            <View>
              <Text style={s.planCardMeta}>Titular</Text>
              <Text style={s.planCardMetaValue}>{data.name || "—"}</Text>
            </View>
            <View>
              <Text style={s.planCardMeta}>Valor mensal</Text>
              <Text style={s.planCardMetaValue}>{plan.price}</Text>
            </View>
          </View>
        </View>

        <View style={s.infoBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#1d4ed8"
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <Text style={s.infoText}>
            Ambiente de demonstração: nenhum dado de cartão de crédito ou
            informação bancária sensível é coletado nesta etapa. Confirme abaixo
            para ativar sua assinatura simulada.
          </Text>
        </View>

        {!!errorMsg && <Text style={s.error}>{errorMsg}</Text>}

        <View style={{ height: 24 }} />
        <TouchableOpacity
          style={[s.payBtn, loading && { opacity: 0.7 }]}
          onPress={handleActivate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={s.payBtnText}>Ativar {plan.name}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: lightColors.text.primary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24 },
  planCard: {
    backgroundColor: lightColors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  planCardName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  planCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planCardMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  planCardMetaValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: lightColors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.info,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 19,
  },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#dc2626",
    marginTop: 12,
  },
  payBtn: {
    backgroundColor: lightColors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
