import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: () => {
          router.replace("/(tabs)/Admin/admin-login");
        },
      },
    ]);
  };

  const menuItems = [
    {
      label: "Create Hostel",
      icon: "🏠",
      color: "#FFD700",
      route: "/dashboards/AdminDashboard/create-hostel",
    },
    {
      label: "Manage Wardens",
      icon: "👮",
      color: "#90EE90",
      route: "/dashboards/AdminDashboard/manage-wardens",
    },
    {
      label: "Upload Students",
      icon: "📤",
      color: "#ADD8E6",
      route: "/dashboards/AdminDashboard/upload-students",
    },
    {
      label: "View Students",
      icon: "📄",
      color: "#FFB6C1",
      route: "/dashboards/AdminDashboard/view-students",
    },
    {
      label: "Issues",
      icon: (
        <FontAwesome5 name="exclamation-triangle" size={24} color="white" />
      ), // Updated icon
      color: "#dc3545", // Red (represents errors/issues)
      route: "/dashboards/AdminDashboard/reports",
    },
    {
      label: "Daily Rates",
      icon: <FontAwesome5 name="rupee-sign" size={24} color="white" />,
      color: "#20B2AA", // LightSeaGreen
      route: "/dashboards/AdminDashboard/addDailyRates",
    },
    {
      label: "Location",
      icon: <FontAwesome5 name="map-marked-alt" size={24} color="white" />,
      color: "#FFA500", // Orange
      route: "/dashboards/AdminDashboard/campusLocationForm",
    },
    {
      label: "Upload Logins",
      icon: <FontAwesome5 name="user-circle" size={24} color="white" />, // changed icon
      color: "#1E90FF", // Orange
      route: "/dashboards/AdminDashboard/BulkUploadStudents",
    },
    {
      label: "Reports",
      icon: "📊",
      color: "#BA55D3", // Purple
      route: "/dashboards/AdminDashboard/AttendanceDashboard",
    },
    {
      label: "Logout",
      icon: "🔓", // You can use 🔓 or ❌ or 🔚 too
      color: "#FF6347", // Tomato red
      action: handleLogout, // No route, use action instead
    },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>JNTUACEP</Text>
      <Text style={styles.subHeader}>Hostel Management Dashboard</Text>

      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if ("route" in item) {
                  router.push(item.route);
                } else if (
                  "action" in item &&
                  typeof item.action === "function"
                ) {
                  item.action();
                }
              }}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: item.color }]}
              >
                <Text style={styles.iconText}>{item.icon}</Text>
              </View>
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 30,
  },
  gridContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  menuItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  iconText: {
    fontSize: 26,
  },
  label: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
