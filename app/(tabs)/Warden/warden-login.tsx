import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const BASE_URL = "http://192.168.29.83:5000"; // Replace with actual backend URL

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please enter both email and password");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.message?.toLowerCase().includes("not found")) {
          Alert.alert("User Not Found", "No account found with that email.");
        } else if (data?.message?.toLowerCase().includes("invalid")) {
          Alert.alert(
            "Wrong Password",
            "Please check your password and try again."
          );
        } else {
          Alert.alert("Login Failed", data?.message || "Wrong credentials");
        }
        return;
      }

      await AsyncStorage.setItem("wardenToken", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));

      // Navigate to Warden Dashboard
      router.replace("/dashboards/WardenDashboard/Warden");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.loginBox}>
        <Text style={styles.title}>Warden Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!passwordVisible}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons
              name={passwordVisible ? "eye-off" : "eye"}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e6f0fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loginBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: "#2c3e50",
  },
  input: {
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  loginButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 16,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: 12,
  },
});
