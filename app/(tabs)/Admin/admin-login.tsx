// AdminLogin.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(
    null
  );

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const parseJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      // try text fallback
      try {
        const text = await res.text();
        return { message: text || "Unexpected server response." };
      } catch {
        return { message: "Unexpected server response." };
      }
    }
  };

  // If you can, install expo-secure-store and uncomment these:
  // import * as SecureStore from "expo-secure-store";

  const saveToken = async (key: string, value: string) => {
    try {
      // if (SecureStore) return await SecureStore.setItemAsync(key, value);
      return await AsyncStorage.setItem(key, value);
    } catch {}
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter email and password.",
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      setLoading(true);
      Keyboard.dismiss();

      const response = await fetch("http://192.168.29.83:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim().toLowerCase(),
          password,
        }),
        signal: controller.signal,
      });

      const data: any = await parseJsonSafe(response);

      if (response.ok && data?.token) {
        const role = String(data?.user?.role || "").toLowerCase();

        if (role !== "admin") {
          // ❌ Do NOT store token, do NOT navigate
          Toast.show({
            type: "error",
            text1: "Access Denied",
            text2: "Please sign in with an Admin account.",
          });
          return;
        }

        // ✅ Admin only: store token under an admin-specific key
        await saveToken("adminToken", data.token);
        await AsyncStorage.setItem("adminUser", JSON.stringify(data.user));
        await AsyncStorage.setItem("flash:justLoggedIn", "1");

        Toast.show({ type: "success", text1: "Login successful 🎉" });
        router.replace({
          pathname: "/dashboards/AdminDashboard/Admin",
          params: { justLoggedIn: "1" },
        });
        return;
      }

      if (response.status === 401) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: "Invalid credentials",
        });
      } else if (response.status === 403) {
        Toast.show({
          type: "error",
          text1: "Access Denied",
          text2: data?.message || "Not authorized.",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: data?.message || "Something went wrong",
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        Toast.show({
          type: "error",
          text1: "Timeout",
          text2: "Server took too long to respond.",
        });
      } else {
        console.error("Login error:", err);
        Toast.show({
          type: "error",
          text1: "Network Error",
          text2: "Unable to connect to the server.",
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>Admin Console</Text>
          <Text style={styles.brandSubtitle}>
            Sign in to manage your campus
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Helloo..👋</Text>
          <Text style={styles.cardSubtitle}>Please sign in to continue</Text>

          {/* Email */}
          <Pressable
            onPress={() => emailRef.current?.focus()}
            style={[
              styles.inputWrap,
              focusedInput === "email" && styles.inputWrapFocused,
            ]}
          >
            <Ionicons
              name="mail"
              size={20}
              color={focusedInput === "email" ? "#2563eb" : "#8a8a8a"}
              style={styles.inputIcon}
              pointerEvents="none"
            />
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9aa0a6"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onFocus={() => setFocusedInput("email")}
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
              blurOnSubmit={false}
              textContentType="emailAddress"
              autoComplete="email"
              importantForAutofill="yes"
            />
          </Pressable>

          {/* Password */}
          <Pressable
            onPress={() => passwordRef.current?.focus()}
            style={[
              styles.inputWrap,
              styles.inputWrapWithButton,
              focusedInput === "password" && styles.inputWrapFocused,
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={20}
              color={focusedInput === "password" ? "#2563eb" : "#8a8a8a"}
              style={styles.inputIcon}
              pointerEvents="none"
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={!loading ? handleLogin : undefined}
              onFocus={() => setFocusedInput("password")}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              importantForAutofill="yes"
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible((v) => !v)}
              style={styles.trailingButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={loading}
            >
              <Ionicons
                name={passwordVisible ? "eye-off" : "eye"}
                size={22}
                color="#6b7280"
              />
            </TouchableOpacity>
          </Pressable>

          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <Ionicons name="lock-closed-outline" size={14} color="#9aa0a6" />
              <Text style={styles.helperText}> Your data is secured</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} disabled={loading}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          © {new Date().getFullYear()} Campus Admin • All rights reserved
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_BG = "rgba(255,255,255,0.9)";
const BORDER = "rgba(0,0,0,0.06)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eaf1ff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  brandTitle: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#475569",
  },
  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 18,
  },
  inputWrap: {
    position: "relative",
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(250, 250, 255, 0.9)",
    borderRadius: 14,
    paddingLeft: 46,
    paddingRight: 14,
    justifyContent: "center",
    marginBottom: 12,
  },
  inputWrapWithButton: {
    paddingRight: 44,
  },
  inputWrapFocused: {
    borderColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  inputIcon: {
    position: "absolute",
    left: 14,
  },
  input: {
    fontSize: 16,
    color: "#111827",
  },
  trailingButton: {
    position: "absolute",
    right: 12,
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBetween: {
    marginTop: 4,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  helperText: {
    color: "#9aa0a6",
    fontSize: 12,
    marginLeft: 6,
  },
  linkText: {
    color: "#2563eb",
    fontSize: 12.5,
    fontWeight: "600",
  },
  loginButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerText: {
    marginTop: 16,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});
