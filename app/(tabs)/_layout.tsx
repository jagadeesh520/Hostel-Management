import { HapticTab } from "@/components/HapticTab";
import Header from "@/components/ui/Header";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Replaced import from internal RN path:
 *   import { Colors } from "react-native/Libraries/NewAppScreen";
 *
 * Using our own small color tokens is more robust across RN/Expo versions.
 */
const Colors = {
  light: {
    background: "#ffffff",
    text: "#111827",
    border: "#E5E7EB",
    card: "#ffffff",
    tint: "#6a4cff", // used for active tab tint in light mode
  },
  dark: {
    background: "#0b1220",
    text: "#f8fafc",
    border: "#374151",
    card: "#0f1724",
    tint: "#8b5cf6", // used for active tab tint in dark mode
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const tintColor = Colors[colorScheme === "dark" ? "dark" : "light"].tint;

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Colors[colorScheme === "dark" ? "dark" : "light"].background }}>
      <Tabs
        screenOptions={{
          header: () => <Header />,
          tabBarActiveTintColor: tintColor,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="Admin/admin-login"
          options={{
            title: "Admin Login",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Warden/warden-login"
          options={{
            title: "Warden Login",
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="id-badge" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="Student/student-login"
          options={{
            title: "Student Login",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="school" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null, // 👈 hides it from showing as a tab
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
