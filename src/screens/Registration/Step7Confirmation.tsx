import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRegister } from "./RegisterContext";
import { StepHeader, ContinueButton } from "./components";
import { lightColors } from "../../theme/colors";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  onConfirm: () => void;
  onBack: () => void;
  onEdit: (step: number) => void;
  totalSteps: number;
  currentStep: number;
  isPersonal?: boolean;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={r.row}>
    <Text style={r.label}>{label}</Text>
    <Text style={r.value}>{value}</Text>
  </View>
);

const r = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  label: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: lightColors.text.secondary,
    flex: 1,
  },
  value: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.primary,
    flex: 1,
    textAlign: "right",
  },
});

const Section = ({
  title,
  onEdit,
  step,
  children,
}: {
  title: string;
  onEdit: (s: number) => void;
  step: number;
  children: React.ReactNode;
}) => (
  <View style={sec.box}>
    <View style={sec.header}>
      <Text style={sec.title}>{title}</Text>
      <TouchableOpacity onPress={() => onEdit(step)} style={sec.editBtn}>
        <Ionicons name="create-outline" size={14} color={lightColors.primary} style={{ marginRight: 4 }} />
        <Text style={sec.editText}>Alterar</Text>
      </TouchableOpacity>
    </View>
    {children}
  </View>
);

const sec = StyleSheet.create({
  box: {
    backgroundColor: lightColors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: lightColors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editBtn: { flexDirection: "row", alignItems: "center" },
  editText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.primary,
  },
});

const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
  nao_binario: "Prefiro não dizer",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  premium: "Premium — R$29,90/mês",
  basic: "Basic — R$49,90/mês",
  pro: "Pro — R$99,90/mês",
  custom: "Custom",
};

const EXP_LABELS: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const MODALITY_LABELS: Record<string, string> = {
  musculacao: "Musculação",
  calistenia: "Calistenia",
};

export const Step7Confirmation = ({
  onConfirm,
  onBack,
  onEdit,
  totalSteps,
  currentStep,
  isPersonal = false,
}: Props) => {
  const { data } = useRegister();

  const workoutDaysStr =
    data.workoutDays.length > 0
      ? data.workoutDays.map((d) => DAY_NAMES[d]).join(", ")
      : "—";

  const modalitiesStr =
    data.modalities.length > 0
      ? data.modalities.map((m) => MODALITY_LABELS[m] || m).join(", ")
      : "—";

  const planIsFree = data.subscriptionType === "free";

  return (
    <SafeAreaView style={s.safe}>
      <StepHeader current={currentStep} total={totalSteps} label="Confirmação" onBack={onBack} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Confirme seus dados</Text>
        <Text style={s.subtitle}>Revise as informações antes de finalizar.</Text>

        <Section title="Dados pessoais" onEdit={onEdit} step={1}>
          <Row label="Nome" value={data.name} />
          <Row label="E-mail" value={data.email} />
          <Row label="Nascimento" value={data.birthYear} />
          <Row label="Sexo" value={GENDER_LABELS[data.gender] || data.gender} />
          <Row label="Tipo" value={data.role === "comum" ? "Usuário Comum" : "Personal Trainer"} />
        </Section>

        <Section title="Plano" onEdit={onEdit} step={2}>
          <Text style={[s.planText, { color: lightColors.primary }]}>
            {PLAN_LABELS[data.subscriptionType] || data.subscriptionType}
          </Text>
        </Section>

        {!isPersonal && (
          <>
            <Section title="Físico e Treino" onEdit={onEdit} step={3}>
              <Row label="Peso / Altura" value={`${data.weightKg} kg / ${data.heightCm} cm`} />
              <Row label="Meta de peso" value={`${data.desiredWeightKg} kg`} />
              <Row label="Modalidades" value={modalitiesStr} />
              <Row label="Frequência" value={EXP_LABELS[data.experienceLevel] || data.experienceLevel} />
            </Section>

            <Section title="Agenda e Hidratação" onEdit={onEdit} step={4}>
              <Row label="Dias de treino" value={workoutDaysStr} />
              <Row label="Horário" value={data.workoutTime || "—"} />
              <Row
                label="Lembrete água"
                value={data.hydrationReminder ? `Sim — ${data.hydrationTime}` : "Não"}
              />
            </Section>
          </>
        )}

        {planIsFree ? (
          <View style={s.freeNote}>
            <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" style={{ marginRight: 8 }} />
            <Text style={s.freeNoteText}>
              Você escolheu o plano <Text style={{ fontFamily: "Poppins_700Bold" }}>Free</Text>. Nenhum pagamento será necessário.
            </Text>
          </View>
        ) : (
          <View style={s.payNote}>
            <Ionicons name="card-outline" size={16} color={lightColors.primary} style={{ marginRight: 8 }} />
            <Text style={s.payNoteText}>
              Na próxima etapa você preencherá os dados de pagamento para ativar o plano{" "}
              <Text style={{ fontFamily: "Poppins_700Bold" }}>
                {PLAN_LABELS[data.subscriptionType]}
              </Text>.
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.editAll} onPress={() => onEdit(1)}>
          <Ionicons name="create-outline" size={16} color={lightColors.primary} style={{ marginRight: 6 }} />
          <Text style={s.editAllText}>Alterar qualquer informação</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
        <ContinueButton
          label={planIsFree ? "Confirmar e criar conta →" : "Confirmar e pagar →"}
          onPress={onConfirm}
        />
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
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: lightColors.text.secondary,
    marginBottom: 20,
  },
  planText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
  freeNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: lightColors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.info,
    padding: 14,
    marginBottom: 14,
  },
  freeNoteText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 19,
  },
  payNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: lightColors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.primary + "40",
    padding: 14,
    marginBottom: 14,
  },
  payNoteText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: lightColors.text.primary,
    lineHeight: 19,
  },
  editAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  editAllText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: lightColors.primary,
  },
});
