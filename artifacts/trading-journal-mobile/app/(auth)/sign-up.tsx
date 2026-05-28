import { useSignUp, useAuth } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn]);

  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as any);
        },
      });
    }
  };

  const isLoading = fetchStatus === "fetching";
  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (needsVerification) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <Feather name="mail" size={32} color="#00FF41" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>We sent a verification code to {email}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="6-digit code"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isLoading && styles.disabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Verify Email</Text>}
        </Pressable>
        <Pressable style={styles.textButton} onPress={() => signUp.verifications.sendEmailCode()}>
          <Text style={styles.textButtonText}>Resend code</Text>
        </Pressable>
        <View nativeID="clerk-captcha" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Feather name="trending-up" size={28} color="#00FF41" />
            <Text style={styles.logoText}>NEXUS</Text>
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking your trading edge</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="trader@example.com"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.fields.emailAddress && <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
          />
          <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#6b7280" />
          </Pressable>
        </View>
        {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            (!email || !password || isLoading) && styles.disabled,
          ]}
          onPress={handleSignUp}
          disabled={!email || !password || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.link}>Sign in</Text>
          </Link>
        </View>
        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 24 },
  header: { marginBottom: 32, alignItems: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  logoText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#00FF41", letterSpacing: 3 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6b7280", textAlign: "center" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#9ca3af", marginBottom: 6 },
  input: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#1f1f1f",
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFFFFF", marginBottom: 14,
  },
  passwordRow: { position: "relative", marginBottom: 14 },
  passwordInput: { marginBottom: 0, paddingRight: 46 },
  eyeButton: { position: "absolute", right: 14, top: 13 },
  primaryButton: {
    backgroundColor: "#00FF41", borderRadius: 8, paddingVertical: 14,
    alignItems: "center", marginTop: 8, marginBottom: 20,
  },
  primaryButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000000" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  textButton: { alignItems: "center", paddingVertical: 10 },
  textButtonText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#00FF41" },
  linkRow: { flexDirection: "row", justifyContent: "center" },
  linkText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6b7280" },
  link: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#00FF41" },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF4444", marginTop: -10, marginBottom: 10 },
});
