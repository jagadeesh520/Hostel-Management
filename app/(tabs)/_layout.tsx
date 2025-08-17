import { HapticTab } from "@/components/HapticTab";
import Header from "@/components/ui/Header";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "react-native/Libraries/NewAppScreen";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? "light"].tint;

  return (
    <SafeAreaProvider>
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
