import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { lightColors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../config/api";

const ErrorBanner = ({ message, styles, colors }: { message: string; styles: any; colors: typeof lightColors }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  React.useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(-8);
    }
  }, [message, opacity, translateY]);

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.errorBanner, { opacity, transform: [{ translateY }] }]}
    >
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={colors.error}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.errorText}>{message}</Text>
    </Animated.View>
  );
};

const friendlyError = (raw: string): string => {
  if (!raw) return "Algo deu errado. Tente novamente.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("credenciais") ||
    lower.includes("invalid") ||
    lower.includes("senha") ||
    lower.includes("email")
  )
    return "E-mail ou senha incorretos.";
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connect")
  )
    return "Sem conexão com o servidor. Verifique sua internet.";
  if (lower.includes("timeout"))
    return "O servidor demorou para responder. Tente novamente.";
  return "Algo deu errado. Tente novamente.";
};

const LoginScreen = () => {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const logoScale = useRef(new Animated.Value(0.8)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(formTranslate, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [formOpacity, formTranslate, logoScale]);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");

    if (!email.trim()) {
      setErrorMsg("Informe seu e-mail.");
      return;
    }
    if (!emailPattern.test(email.trim())) {
      setErrorMsg("Formato de e‑mail inválido.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Informe sua senha.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const raw = err?.message || String(err);
      setErrorMsg(friendlyError(raw));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg("");
    setInfoMsg("");

    if (!email.trim() || !emailPattern.test(email.trim())) {
      setErrorMsg("Digite seu e-mail válido no campo acima para recuperar a senha.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "Não foi possível solicitar a recuperação.");
        return;
      }
      setInfoMsg(
        data.message ||
          "Se o e-mail estiver cadastrado, enviamos as instruções de recuperação."
      );
    } catch {
      setErrorMsg("Sem conexão com o servidor.");
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (v: string) => {
    if (errorMsg) setErrorMsg("");
    if (infoMsg) setInfoMsg("");
    setter(v);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Animated.View
            style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}
          >
            <View style={styles.logoCircle}>
              <Ionicons name="flash" size={32} color="#FFFFFF" />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: formOpacity, alignItems: "center" }}>
            <Text style={styles.title}>BodySync</Text>
            <Text style={styles.subtitle}>Sua melhor versão em movimento</Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.form,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslate }],
            },
          ]}
        >
          <ErrorBanner message={errorMsg} styles={styles} colors={colors} />

          {!!infoMsg && (
            <View style={styles.infoBanner}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.success}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoText}>{infoMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View
              style={[
                styles.inputWrapper,
                emailFocused && styles.inputFocused,
                !!errorMsg && styles.inputError,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={
                  emailFocused ? colors.primary : colors.text.tertiary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={handleFieldChange(setEmail)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputFocused,
                !!errorMsg && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  passwordFocused
                    ? colors.primary
                    : colors.text.tertiary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                placeholder="••••••••"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={handleFieldChange(setPassword)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotWrapper}
            >
              <Text style={styles.forgot}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar na conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: typeof lightColors, isDark: boolean) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: isDark ? colors.background : colors.primary,
    },
    flex: { flex: 1 },
    header: {
      backgroundColor: isDark ? colors.background : colors.primary,
      alignItems: "center",
      paddingTop: 36,
      paddingBottom: 28,
      paddingHorizontal: 24,
    },
    logoWrapper: { marginBottom: 14 },
    logoCircle: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.25)",
      borderWidth: isDark ? 1.5 : 0,
      borderColor: isDark ? colors.primary : "transparent",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    title: {
      fontFamily: "Poppins_700Bold",
      fontSize: 26,
      color: "#FFFFFF",
      textAlign: "center",
      letterSpacing: 0.5,
    },
    subtitle: {
      fontFamily: "Poppins_400Regular",
      fontSize: 13,
      color: isDark ? colors.text.secondary : "rgba(255,255,255,0.9)",
      textAlign: "center",
      marginTop: 2,
    },
    form: {
      flex: 1,
      backgroundColor: colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderTopWidth: isDark ? 1 : 0,
      borderTopColor: colors.border,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
      justifyContent: "center",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorLight,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.error + "40",
    },
    errorText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.error,
      flex: 1,
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.successLight,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.success + "40",
    },
    infoText: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.success,
      flex: 1,
    },
    inputGroup: { marginBottom: 14 },
    label: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      height: 52,
      paddingHorizontal: 14,
    },
    inputFocused: { borderColor: colors.primary },
    inputError: { borderColor: colors.error },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
    },
    inputPassword: { letterSpacing: 1 },
    eyeButton: { padding: 4 },
    forgotWrapper: { alignSelf: "flex-end", marginTop: 8 },
    forgot: {
      fontFamily: "Poppins_500Medium",
      fontSize: 13,
      color: colors.primary,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    loginButtonDisabled: { opacity: 0.6 },
    loginButtonText: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },
    registerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    registerText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.secondary,
    },
    registerLink: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
  });

export default LoginScreen;