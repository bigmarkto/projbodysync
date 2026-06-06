import React, { useState, useRef } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { lightColors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const GOOGLE_LOGO =
  "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

const ErrorBanner = ({ message }: { message: string }) => {
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
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.errorBanner, { opacity, transform: [{ translateY }] }]}
    >
      <Ionicons
        name="alert-circle-outline"
        size={16}
        color="#991b1b"
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
  }, []);

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Informe seu e-mail.");
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
      console.error("[LoginScreen] Erro ao fazer login:", raw);
      setErrorMsg(friendlyError(raw));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (v: string) => {
    if (errorMsg) setErrorMsg("");
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
              <Ionicons name="flash" size={32} color="#fff" />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: formOpacity }}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Continue sua jornada fitness</Text>
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
          <ErrorBanner message={errorMsg} />

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
                  emailFocused ? lightColors.primary : lightColors.text.tertiary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={lightColors.text.tertiary}
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
                    ? lightColors.primary
                    : lightColors.text.tertiary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                placeholder="••••••••"
                placeholderTextColor={lightColors.text.tertiary}
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
                  color={lightColors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log(
                  "[LoginScreen] Recuperação de senha solicitada para:",
                  email || "(sem email)",
                );
              }}
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
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou continue com</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={() =>
              console.log(
                "[LoginScreen] Login com Google solicitado (não implementado)",
              )
            }
          >
            <Image
              source={{
                uri: "https://www.google.com/favicon.ico",
              }}
              style={styles.googleLogo}
              resizeMode="contain"
            />
            <Text style={styles.googleButtonText}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lightColors.primary },
  flex: { flex: 1 },
  header: {
    backgroundColor: lightColors.primary,
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoWrapper: { marginBottom: 16 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  form: {
    flex: 1,
    backgroundColor: lightColors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#991b1b",
    flex: 1,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.text.secondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    height: 52,
    paddingHorizontal: 14,
  },
  inputFocused: { borderColor: lightColors.primary },
  inputError: { borderColor: "#fca5a5" },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: lightColors.text.primary,
  },
  inputPassword: { letterSpacing: 1 },
  eyeButton: { padding: 2 },
  forgotWrapper: { alignSelf: "flex-end", marginTop: 8 },
  forgot: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: lightColors.primary,
  },
  loginButton: {
    backgroundColor: lightColors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: lightColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: lightColors.border },
  dividerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: lightColors.text.tertiary,
    marginHorizontal: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
    height: 52,
    marginBottom: 20,
    gap: 10,
  },
  googleLogo: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: lightColors.text.primary,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: lightColors.text.secondary,
  },
  registerLink: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: lightColors.primary,
  },
});

export default LoginScreen;
