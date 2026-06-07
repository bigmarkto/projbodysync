import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RegisterProvider, useRegister } from './RegisterContext';
import { Step1PersonalData } from './Step1PersonalData';
import { Step2Subscription } from './Step2Subscription';
import { Step3PhysicalData } from './Step3PhysicalData';
import { Step4Schedule } from './Step4Schedule';
import { Step5Modalities } from './Step5Modalities';
import { Step6Frequency } from './Step6Frequency';
import { Step7Confirmation } from './Step7Confirmation';
import { PaymentScreen } from './PaymentScreen';
import { View, Text, StyleSheet } from 'react-native';
import { lightColors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { useRegisterApi } from '../../hooks/useRegister';

const RegisterFlow = ({ accessToken }: { accessToken: string }) => {
  const { data } = useRegister();
  const navigation = useNavigation<any>();
  const [stepIdx, setStepIdx] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isPersonal = data.role === 'personal';
  const total = isPersonal ? 2 : 7;

  const goNext = () => setStepIdx((i) => i + 1);
  const goBack = () => setStepIdx((i) => (i > 0 ? i - 1 : 0));

  const { register } = useRegisterApi();

  const handleConfirm = async () => {
    try {
      console.log('POST /auth/register', data);
      setLog((prev) => [...prev, `POST /auth/register (payload from context)`]);
      const { res, json } = await register(data);
      console.log('Response', json);
      setLog((prev) => [...prev, `Response ${JSON.stringify(json)}`]);
      if (!res.ok) {
        setErrors((e) => ({ ...e, submit: json.error || 'Falha no cadastro' }));
        return;
      }
    } catch (e) {
      console.error(e);
      setLog((prev) => [...prev, `Error ${e}`]);
      setErrors((e) => ({ ...e, submit: 'Erro ao conectar ao servidor' }));
      return;
    }
    if (data.subscriptionType && data.subscriptionType !== 'free') {
      setShowPayment(true);
    } else {
      navigation.navigate('Login');
    }
  };

  if (showPayment) {
    return (
      <PaymentScreen
        accessToken={accessToken ?? ''}
        onPaid={() => setShowPayment(false)}
        onBack={() => setShowPayment(false)}
      />
    );
  }

  const steps = isPersonal
    ? [
        <Step1PersonalData
          key="s1"
          totalSteps={total}
          currentStep={1}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step7Confirmation
          key="s7"
          totalSteps={total}
          currentStep={2}
          onConfirm={handleConfirm}
          onBack={goBack}
          onEdit={(s) => setStepIdx(s - 1)}
          isPersonal={true}
        />,
      ]
    : [
        <Step1PersonalData
          key="s1"
          totalSteps={total}
          currentStep={1}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step2Subscription
          key="s2"
          totalSteps={total}
          currentStep={2}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step3PhysicalData
          key="s3"
          totalSteps={total}
          currentStep={3}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step4Schedule
          key="s4"
          totalSteps={total}
          currentStep={4}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step5Modalities
          key="s5"
          totalSteps={total}
          currentStep={5}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step6Frequency
          key="s6"
          totalSteps={total}
          currentStep={6}
          onNext={goNext}
          onBack={goBack}
        />,
        <Step7Confirmation
          key="s7"
          totalSteps={total}
          currentStep={7}
          onConfirm={handleConfirm}
          onBack={goBack}
          onEdit={(s) => setStepIdx(s - 1)}
          isPersonal={false}
        />,
      ];

  return (
    <>
      {steps[stepIdx]}
      {log.length > 0 && (
        <View style={s.logContainer}>
          {log.map((l, i) => (
            <Text key={i} style={s.logText}>
              {l}
            </Text>
          ))}
        </View>
      )}
      {errors.submit && <Text style={s.errorText}>{errors.submit}</Text>}
    </>
  );
};

const RegisterScreen = () => {
  const { accessToken } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: lightColors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 40 }}>
        <Text style={{ marginLeft: 12, fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: lightColors.text.primary }}>
          Cadastro
        </Text>
      </View>
      <RegisterProvider>
        <RegisterFlow accessToken={accessToken ?? ''} />
      </RegisterProvider>
    </View>
  );
};

const s = StyleSheet.create({
  logContainer: {
    padding: 12,
    backgroundColor: lightColors.surface,
    margin: 12,
    borderRadius: 8,
  },
  logText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: lightColors.text.secondary,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#dc2626',
    marginTop: 8,
    marginHorizontal: 12,
  },
});

export default RegisterScreen;
