import { useColorScheme } from "@/hooks/useColorScheme";
import { ClerkProvider } from "@clerk/clerk-expo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
//import "../scripts/backgroundLocation";

// Required to persist Clerk session securely
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      // handle error
    }
  },
};

//const LOCATION_TASK_NAME = "background-location-task";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

 /*  useEffect(() => {
    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 60000, // every 1 minute
          distanceInterval: 50, // every 50 meters
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Location Tracking",
            notificationBody: "Your location is being used for attendance.",
          },
        });
      }
    };

    startLocationUpdates();
  }, []); */

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey="pk_test_c2hhcnAta29hbGEtNTUuY2xlcmsuYWNjb3VudHMuZGV2JA"
      tokenCache={tokenCache}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {[
            {
              name: "dashboards/AdminDashboard/Admin",
              title: "Admin Dashboard",
            },
            {
              name: "dashboards/AdminDashboard/create-hostel",
              title: "Create Hostel",
            },
            {
              name: "dashboards/AdminDashboard/manage-wardens",
              title: "Warden Assign",
            },
            {
              name: "dashboards/AdminDashboard/upload-students",
              title: "Upload Student Details",
            },
            {
              name: "dashboards/AdminDashboard/view-students",
              title: "View Student Details",
            },
            {
              name: "dashboards/AdminDashboard/reports",
              title: "Reports",
            },
            {
              name: "dashboards/AdminDashboard/campusLocationForm",
              title: "Location",
            },
            {
              name: "dashboards/AdminDashboard/BulkUploadStudents",
              title: "Student Login Details",
            },
            {
              name: "dashboards/AdminDashboard/AttendanceDashboard",
              title: "Attendance Dashboard",
            },
            {
              name: "dashboards/AdminDashboard/addDailyRates",
              title: "Daily Mess Rates",
            },
            {
              name: "dashboards/WardenDashboard/Warden",
              title: "Warden Dashboard",
            },
            {
              name: "dashboards/WardenDashboard/StudentListScreen",
              title: "Take Attendance",
            },
            {
              name: "dashboards/WardenDashboard/StudentList",
              title: "Take Attendance",
            },
            {
              name: "dashboards/StudentDashboard/Student",
              title: "Student Dashboard",
            },
            {
              name: "dashboards/StudentDashboard/TimesheetScreen",
              title: "Timesheet",
            },
            {
              name: "dashboards/StudentDashboard/RaiseTicket",
              title: "Raise a Ticket",
            },
            {
              name: "dashboards/StudentDashboard/MyProfile",
              title: "My Profile",
            },
            {
              name: "dashboards/StudentDashboard/BlogScreen",
              title: "Student Blog",
            },
            {
              name: "dashboards/StudentDashboard/AttendanceScanner",
              title: "Self Check-In",
            },
          ].map((screen) => (
            <Stack.Screen
              key={screen.name}
              name={screen.name}
              options={{
                title: screen.title,
                headerStyle: {
                  backgroundColor: "#6200ee",
                },
                headerTintColor: "#fff",
                headerTitleStyle: {
                  fontWeight: "bold",
                  fontSize: 20,
                  fontFamily: "SpaceMono",
                },
                headerTitleAlign: "center" as const,
              }}
            />
          ))}

          <Stack.Screen name="+not-found" />
        </Stack>

        <StatusBar backgroundColor="#6200ee" style="light" translucent={false} />
      </ThemeProvider>
    </ClerkProvider>
  );
}
