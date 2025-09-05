import { useColorScheme } from "@/hooks/useColorScheme";
import { ClerkProvider } from "@clerk/clerk-expo";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

// Required to persist Clerk session securely
const tokenCache = {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
};

// ---- Custom Toasts (Success / Error / Warning / Info) ----
const makeToast =
  (accentColor: string, titleColor: string) =>
  (props: any) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginHorizontal: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      {/* Left accent bar */}
      <View
        style={{
          width: 6,
          height: "100%",
          borderRadius: 6,
          backgroundColor: accentColor,
          marginRight: 12,
        }}
      />

      {/* Texts */}
      <View style={{ flex: 1, paddingRight: 8 }}>
        {!!props.text1 && (
          <Text
            numberOfLines={2}
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: titleColor,
              marginBottom: props.text2 ? 3 : 0,
            }}
          >
            {props.text1}
          </Text>
        )}
        {!!props.text2 && (
          <Text numberOfLines={4} style={{ fontSize: 13, color: "#374151" }}>
            {props.text2}
          </Text>
        )}
      </View>

      {/* Close (×) */}
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ paddingHorizontal: 4, paddingVertical: 2 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#6b7280" }}>×</Text>
      </TouchableOpacity>
    </View>
  );

const toastConfig = {
  success: makeToast("#16a34a", "#16a34a"), // green
  error: makeToast("#dc2626", "#dc2626"),   // red
  warning: makeToast("#f59e0b", "#f59e0b"), // amber
  info: makeToast("#3b82f6", "#2563eb"),    // blue
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) return null;

  return (
    <ClerkProvider
      publishableKey="pk_test_c2hhcnAta29hbGEtNTUuY2xlcmsuYWNjb3VudHMuZGV2JA"
      tokenCache={tokenCache}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {[
            { name: "dashboards/AdminDashboard/Admin", title: "Admin Dashboard" },
            { name: "dashboards/AdminDashboard/create-hostel", title: "Create Hostel" },
            { name: "dashboards/AdminDashboard/manage-wardens", title: "Assign Warden" },
            { name: "dashboards/AdminDashboard/upload-students", title: "Upload Student Details" },
            { name: "dashboards/AdminDashboard/view-students", title: "View Student Details" },
            { name: "dashboards/AdminDashboard/reports", title: "Reports" },
            { name: "dashboards/AdminDashboard/campusLocationForm", title: "Location" },
            { name: "dashboards/AdminDashboard/BulkUploadStudents", title: "Student Login Details" },
            { name: "dashboards/AdminDashboard/AttendanceDashboard", title: "Attendance Dashboard" },
            { name: "dashboards/AdminDashboard/addDailyRates", title: "Daily Mess Rates" },
            { name: "dashboards/AdminDashboard/AdminBlockRules", title: "Block Assignment" },
            { name: "dashboards/AdminDashboard/AdminHostelView", title: "Admin Hostel View" },
            { name: "dashboards/AdminDashboard/AdminFaceUpdateScreen", title: "Face Update" },
            { name: "dashboards/WardenDashboard/WardenDashbord", title: "Warden Dashboard" },
            { name: "dashboards/WardenDashboard/WardenTickets", title: "Assigned Tickets" },
            { name: "dashboards/WardenDashboard/StudentListScreen", title: "Take Attendance" },
            { name: "dashboards/WardenDashboard/AddMenu", title: "Add Menu" },
            { name: "dashboards/WardenDashboard/MenuChild", title: "Menu Details" },
            { name: "dashboards/WardenDashboard/BlocksChild", title: "Block Details" },
            { name: "dashboards/WardenDashboard/AttendanceChild", title: "Attendance" },
            { name: "dashboards/WardenDashboard/CreateIssue", title: "Create Request to Admin" },
            { name: "dashboards/WardenDashboard/StudentList", title: "Take Attendance" },
            { name: "dashboards/WardenDashboard/WardenHostelView", title: "Warden Hostel View" },
            { name: "dashboards/WardenDashboard/WardenLeaveDashboard", title: "Leave Request" },
            { name: "dashboards/WardenDashboard/WardenAddFloor", title: "Rooms Allot" },
            { name: "dashboards/StudentDashboard/Student", title: "Student Dashboard" },
            { name: "dashboards/StudentDashboard/TimesheetScreen", title: "Timesheet" },
            { name: "dashboards/StudentDashboard/RaiseTicket", title: "Raise a Ticket" },
            { name: "dashboards/StudentDashboard/MyProfile", title: "My Profile" },
            { name: "dashboards/StudentDashboard/BlogScreen", title: "Student Blog" },
            { name: "dashboards/StudentDashboard/AttendanceScanner", title: "Self Check-In" },
            { name: "dashboards/StudentDashboard/LeaveApply", title: "Apply Leave" },
            { name: "dashboards/StudentDashboard/StudentHostelView", title: "Room Booking" },
          ].map((screen) => (
            <Stack.Screen
              key={screen.name}
              name={screen.name}
              options={{
                title: screen.title,
                headerStyle: { backgroundColor: "#6200ee" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "bold", fontSize: 20, fontFamily: "SpaceMono" },
                headerTitleAlign: "center",
              }}
            />
          ))}
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* Global Toast host (persists across Tabs and Dashboards) */}
        <Toast
          config={toastConfig}
          position="top"
          topOffset={Platform.select({ ios: 60, android: 50, default: 50 })}
          visibilityTime={3000}
        />

        <StatusBar backgroundColor="#6200ee" style="light" translucent={false} />
      </ThemeProvider>
    </ClerkProvider>
  );
}
