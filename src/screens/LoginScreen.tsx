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
import { fetchWithApiFallback } from "../config/api";

const ErrorBanner = ({
  message,
  styles,
  colors,
  reduceMotion,
}: {
  message: string;
  styles: any;
  colors: typeof lightColors;
  reduceMotion: boolean;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  React.useEffect(() => {
    if (message) {
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
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
  }, [message, opacity, translateY, reduceMotion]);

  if (!message) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
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

const CONNECTION_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.";

export const friendlyError = (raw: string): string => {
  if (!raw) return "Não foi possível entrar. Verifique seus dados e tente novamente.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("credenciais") ||
    lower.includes("invalid") ||
    lower.includes("senha") ||
    lower.includes("email")
  )
    return "E-mail ou senha incorretos. Confira os dados ou toque em 'Esqueci minha senha'.";
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connect") ||
    lower.includes("conexão") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("abort") ||
    lower.includes("demorou")
  )
    return CONNECTION_ERROR_MESSAGE;
  return "Não foi possível entrar agora. Tente novamente em instantes.";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmailField = (val: string): string => {
  const clean = val.trim();
  if (!clean) return "Digite seu endereço de e-mail para entrar.";
  if (!EMAIL_PATTERN.test(clean))
    return "Digite um e-mail válido no formato seu@email.com.";
  return "";
};

const validatePasswordField = (val: string): string => {
  if (!val.trim()) return "Digite sua senha de acesso.";
  return "";
};

const LoginScreen = () => {
  const { login } = useAuth();
  const { colors, isDark, toggleTheme, reduceMotion } = useTheme();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const logoScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.8)).current;
  const formOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const formTranslate = useRef(new Animated.Value(reduceMotion ? 0 : 30)).current;

  React.useEffect(() => {
    if (reduceMotion) {
      logoScale.setValue(1);
      formOpacity.setValue(1);
      formTranslate.setValue(0);
      return;
    }
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
  }, [formOpacity, formTranslate, logoScale, reduceMotion]);

  const handleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");

    const eErr = validateEmailField(email);
    const pErr = validatePasswordField(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

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

    const eErr = validateEmailField(email);
    if (eErr) {
      setEmailError("Digite seu e-mail válido acima para enviarmos o link de recuperação.");
      return;
    }

    try {
      const res = await fetchWithApiFallback("/auth/forgot-password", {
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
      setErrorMsg(CONNECTION_ERROR_MESSAGE);
    }
  };

  const handleEmailChange = (v: string) => {
    if (errorMsg) setErrorMsg("");
    if (infoMsg) setInfoMsg("");
    setEmail(v);
    if (emailError && !validateEmailField(v)) {
      setEmailError("");
    }
  };

  const handlePasswordChange = (v: string) => {
    if (errorMsg) setErrorMsg("");
    if (infoMsg) setInfoMsg("");
    setPassword(v);
    if (passwordError && !validatePasswordField(v)) {
      setPasswordError("");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
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
          <ErrorBanner
            message={errorMsg}
            styles={styles}
            colors={colors}
            reduceMotion={reduceMotion}
          />

          {!!infoMsg && (
            <View style={styles.infoBanner} accessibilityLiveRegion="polite">
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
                (!!emailError || !!errorMsg) && styles.inputError,
                isLoading && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={
                  emailError
                    ? colors.error
                    : emailFocused
                      ? colors.primary
                      : colors.text.tertiary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                editable={!isLoading}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  setEmailError(validateEmailField(email));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="E-mail"
              />
            </View>
            {!!emailError && (
              <View style={styles.fieldErrorRow} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.fieldErrorText}>{emailError}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputFocused,
                (!!passwordError || !!errorMsg) && styles.inputError,
                isLoading && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  passwordError
                    ? colors.error
                    : passwordFocused
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
                editable={!isLoading}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false);
                  setPasswordError(validatePasswordField(password));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accessibilityLabel="Senha"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                disabled={isLoading}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                accessibilityState={{ disabled: isLoading }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            {!!passwordError && (
              <View style={styles.fieldErrorRow} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.fieldErrorText}>{passwordError}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={isLoading}
              style={styles.forgotWrapper}
              accessibilityRole="button"
              accessibilityLabel="Esqueci minha senha"
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
            accessibilityRole="button"
            accessibilityLabel="Entrar na conta"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Entrando...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Entrar na conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={isLoading}
              style={styles.registerLinkBtn}
              accessibilityRole="button"
              accessibilityLabel="Cadastre-se"
            >
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
      position: "relative",
    },
    themeToggleBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.22)",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : "transparent",
      alignItems: "center",
      justifyContent: "center",
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
      paddingLeft: 14,
      paddingRight: 6,
    },
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: colors.surface,
    },
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
      backgroundColor: colors.errorLight,
    },
    inputDisabled: {
      backgroundColor: colors.disabled,
      opacity: 0.65,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontFamily: "Poppins_400Regular",
      fontSize: 14,
      color: colors.text.primary,
      height: "100%",
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
    },
    inputPassword: { letterSpacing: 1 },
    eyeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    fieldErrorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 5,
    },
    fieldErrorText: {
      fontFamily: "Poppins_400Regular",
      fontSize: 12,
      color: colors.error,
      flex: 1,
    },
    forgotWrapper: {
      alignSelf: "flex-end",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 4,
      marginTop: 2,
    },
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
    loginButtonDisabled: { opacity: 0.65 },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
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
    registerLinkBtn: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    registerLink: {
      fontFamily: "Poppins_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
  });

export default LoginScreen;
