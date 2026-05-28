import { useSignIn, useAuth, useSSO } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
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
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mfaCode, setMfaCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn]);

  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as any);
        },
      });
    }
  };

  const handleMfaVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: mfaCode });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl("/") as any);
        },
      });
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl("/") as any);
          },
        });
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  }, []);

  const isLoading = fetchStatus === "fetching";

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Enter the code sent to your email</Text>
        <TextInput
          style={styles.input}
          value={mfaCode}
          onChangeText={setMfaCode}
          placeholder="6-digit code"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, isLoading && styles.disabled]}
          onPress={handleMfaVerify}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
        </Pressable>
        <Pressable style={styles.textButton} onPress={() => signIn.mfa.sendEmailCode()}>
          <Text style={styles.textButtonText}>Resend code</Text>
        </Pressable>
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your trading terminal</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]} onPress={handleGoogleSignIn}>
          <Feather name="globe" size={18} color="#fff" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
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
          autoComplete="email"
        />
        {errors.fields.identifier && <Text style={styles.error}>{errors.fields.identifier.message}</Text>}

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
          onPress={handleSignIn}
          disabled={!email || !password || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>No account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.link}>Create one</Text>
          </Link>
        </View>
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
  googleButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#1f1f1f",
    borderRadius: 8, paddingVertical: 14, marginBottom: 20,
  },
  googleButtonText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1f1f1f" },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6b7280" },
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
