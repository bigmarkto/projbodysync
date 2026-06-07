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
import { FieldInput, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";

// TODO: Integração real de pagamento não está disponível na API atual.
// A API possui apenas POST /payment/subscribe que simula a ativação.
// Para integração real, conectar com Stripe ou MercadoPago no backend
// e substituir o handlePay abaixo pela chamada real ao gateway.

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
  const plan = PLAN_LABELS[data.subscriptionType] || { name: "Plano", price: "—" };

  const [method, setMethod] = useState<"card" | "pix" | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    if (!method) {
      setErrors({ method: "Selecione um método de pagamento." });
      return false;
    }
    if (method === "card") {
      const e: Record<string, string> = {};
      if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "Número inválido.";
      if (!cardName.trim()) e.cardName = "Informe o nome do titular.";
      if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "Use MM/AA.";
      if (cvv.length < 3) e.cvv = "CVV inválido.";
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // TODO: substituir por gateway real (Stripe/MercadoPago)
      // Esta chamada apenas simula a ativação no backend atual
      const res = await fetch("http://localhost:3000/api/payment/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ subscriptionType: data.subscriptionType }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrors({ method: d.error || "Falha no pagamento. Tente novamente." });
        return;
      }
      onPaid();
    } catch {
      setErrors({ method: "Sem conexão com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);

  const formatExpiry = (v: string) => {
    const clean = v.replace(/\D/g, "");
    return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2, 4)}` : clean;
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={lightColors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pagamento</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card do plano */}
        <View style={s.planCard}>
          <View style={s.planCardTop}>
            <Text style={s.planCardName}>{plan.name}</Text>
            <Ionicons name="card-outline" size={22} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={s.planCardNumber}>•••• •••• •••• ••••</Text>
          <View style={s.planCardBottom}>
            <View>
              <Text style={s.planCardMeta}>Titular</Text>
              <Text style={s.planCardMetaValue}>{data.name || "—"}</Text>
            </View>
            <View>
              <Text style={s.planCardMeta}>Vencimento</Text>
              <Text style={s.planCardMetaValue}>{expiry || "MM/AA"}</Text>
            </View>
            <View>
              <Text style={s.planCardMeta}>Total</Text>
              <Text style={s.planCardMetaValue}>{plan.price}</Text>
            </View>
          </View>
        </View>

        {/* Métodos */}
        <Text style={s.sectionLabel}>Método de pagamento</Text>
        <TouchableOpacity
          style={[s.methodCard, method === "card" && s.methodSelected]}
          onPress={() => setMethod("card")}
        >
          <Ionicons name="card-outline" size={20} color={method === "card" ? lightColors.primary : lightColors.text.secondary} style={{ marginRight: 10 }} />
          <Text style={[s.methodLabel, method === "card" && s.methodLabelSelected]}>
            Visa, Mastercard, Elo
          </Text>
          {method === "card" && <Ionicons name="checkmark-circle" size={18} color={lightColors.primary} style={{ marginLeft: "auto" }} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.methodCard, method === "pix" && s.methodSelected]}
          onPress={() => setMethod("pix")}
        >
          <Ionicons name="qr-code-outline" size={20} color={method === "pix" ? lightColors.primary : lightColors.text.secondary} style={{ marginRight: 10 }} />
          <Text style={[s.methodLabel, method === "pix" && s.methodLabelSelected]}>
            Pagamento instantâneo
          </Text>
          {method === "pix" && <Ionicons name="checkmark-circle" size={18} color={lightColors.primary} style={{ marginLeft: "auto" }} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.methodCard, s.methodCardDisabled]}
          activeOpacity={1}
        >
          <Ionicons name="time-outline" size={20} color={lightColors.text.tertiary} style={{ marginRight: 10 }} />
          <Text style={s.methodLabelDisabled}>Vence em 3 dias úteis</Text>
          <View style={s.comingSoon}>
            <Text style={s.comingSoonText}>Em breve</Text>
          </View>
        </TouchableOpacity>

        {!!errors.method && <Text style={s.error}>{errors.method}</Text>}

        {/* Campos do cartão */}
        {method === "card" && (
          <View style={{ marginTop: 8 }}>
            <FieldInput
              label="Número do cartão"
              placeholder="0000 0000 0000 0000"
              leftIcon="card-outline"
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCard(v))}
              error={errors.cardNumber}
              keyboardType="numeric"
              maxLength={19}
            />
            <FieldInput
              label="Nome do titular"
              placeholder="Como no cartão"
              leftIcon="person-outline"
              value={cardName}
              onChangeText={setCardName}
              error={errors.cardName}
              autoCapitalize="characters"
            />
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="Validade"
                  placeholder="MM/AA"
                  value={expiry}
                  onChangeText={(v) => setExpiry(formatExpiry(v))}
                  error={errors.expiry}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <FieldInput
                  label="CVV"
                  placeholder="•••"
                  value={cvv}
                  onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                  error={errors.cvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}

        {method === "pix" && (
          <View style={s.pixBox}>
            <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" style={{ marginRight: 8 }} />
            <Text style={s.pixText}>
              {/* TODO: Integrar geração de QR Code Pix no backend */}
              O QR Code Pix será gerado após a confirmação. Esta funcionalidade requer integração com gateway de pagamento.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
        <TouchableOpacity
          style={[s.payBtn, loading && { opacity: 0.7 }]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.payBtnText}>Pagar {plan.price}</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 32 }} />
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
    marginBottom: 16,
  },
  planCardName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  planCardNumber: {
    fontFamily: "Poppins_500Medium",
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 3,
    marginBottom: 20,
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
    fontSize: 13,
    color: "#fff",
  },
  sectionLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
    marginBottom: 10,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    padding: 14,
    marginBottom: 10,
  },
  methodSelected: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primaryLight,
  },
  methodCardDisabled: { opacity: 0.5 },
  methodLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: lightColors.text.secondary,
  },
  methodLabelSelected: { color: lightColors.primary },
  methodLabelDisabled: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: lightColors.text.tertiary,
  },
  comingSoon: {
    marginLeft: "auto",
    backgroundColor: lightColors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: lightColors.text.tertiary,
  },
  error: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 8,
  },
  row: { flexDirection: "row" },
  pixBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: lightColors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.info,
    padding: 14,
    marginTop: 8,
  },
  pixText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 18,
  },
  payBtn: {
    backgroundColor: lightColors.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: lightColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
