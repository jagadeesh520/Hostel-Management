// StudentLogin.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

export default function StudentLogin() {
  const [username, setUsername] = useState(""); // email
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(
    null
  );
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const resetEmailRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter both email and password",
      });
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();

      const response = await fetch(
        "http://192.168.29.83:5000/api/studentAuth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: username.trim().toLowerCase(),
            password,
          }),
        }
      );

      let data: any;
      try {
        data = await response.json();
      } catch {
        Toast.show({
          type: "error",
          text1: "Server Error",
          text2: "Unexpected server response.",
        });
        return;
      }

      if (response.ok) {
        await AsyncStorage.setItem("studentToken", JSON.stringify(data.token));
        if (data?.student?.rollNo) {
          await AsyncStorage.setItem("rollNo", data.student.rollNo);
        }
        if (data?.student) {
          const studentStr = JSON.stringify(data.student);
          await AsyncStorage.setItem("studentInfo", studentStr);
          await SecureStore.setItemAsync("studentInfo", studentStr);
        }

        // ✅ set one-time flash flag and navigate
        await AsyncStorage.setItem("flash:studentLoggedIn", "1");
        router.replace("/dashboards/StudentDashboard/Student");
      } else {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: data?.message || "Invalid credentials",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter your email address",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a valid email address",
      });
      return;
    }

    try {
      setResetLoading(true);
      
      // Try student password reset first
      let response = await fetch(
        "http://192.168.29.83:5000/api/studentAuth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: "success",
          text1: "Password Sent",
          text2: "Your password has been sent to your registered email address",
        });
        setForgotPasswordModalVisible(false);
        setResetEmail("");
      } else {
        // If student reset fails, try admin
        response = await fetch(
          "http://192.168.29.83:5000/api/adminAuth/forgot-password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
          }
        );
        
        const adminData = await response.json();
        
        if (response.ok) {
          Toast.show({
            type: "success",
            text1: "Password Sent",
            text2: "Your password has been sent to your registered email address",
          });
          setForgotPasswordModalVisible(false);
          setResetEmail("");
        } else {
          // If admin reset fails, try warden
          response = await fetch(
            "http://192.168.29.83:5000/api/wardenAuth/forgot-password",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
            }
          );
          
          const wardenData = await response.json();
          
          if (response.ok) {
            Toast.show({
              type: "success",
              text1: "Password Sent",
              text2: "Your password has been sent to your registered email address",
            });
            setForgotPasswordModalVisible(false);
            setResetEmail("");
          } else {
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "No account found with this email address",
            });
          }
        }
      }
    } catch (error) {
      console.error("Password reset error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again later.",
      });
    } finally {
      setResetLoading(false);
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
            <Ionicons name="school-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>Student Portal</Text>
          <Text style={styles.brandSubtitle}>Sign in to continue learning</Text>
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
            <TouchableOpacity 
              activeOpacity={0.7} 
              disabled={loading}
              onPress={() => setForgotPasswordModalVisible(true)}
            >
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
          © {new Date().getFullYear()} Student Portal • All rights reserved
        </Text>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forgotPasswordModalVisible}
        onRequestClose={() => {
          setForgotPasswordModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setForgotPasswordModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter your registered email address and we'll send you your password.
            </Text>
            
            <View style={styles.modalInputContainer}>
              <TextInput
                ref={resetEmailRef}
                style={styles.modalInput}
                placeholder="Email address"
                placeholderTextColor="#9aa0a6"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="send"
                editable={!resetLoading}
                textContentType="emailAddress"
                autoComplete="email"
                importantForAutofill="yes"
                onSubmitEditing={handleForgotPassword}
              />
            </View>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setForgotPasswordModalVisible(false)}
                disabled={resetLoading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton, resetLoading && styles.modalButtonDisabled]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Send Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f3f4f6",
  },
  modalCancelButtonText: {
    color: "#4b5563",
    fontWeight: "600",
  },
  modalSubmitButton: {
    backgroundColor: "#2563eb",
  },
  modalSubmitButtonText: {
    color: "white",
    fontWeight: "600",
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
});