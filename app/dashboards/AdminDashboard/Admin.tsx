import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ReactNode, useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// Define types for our menu items
type MenuItemWithRoute = {
  label: string;
  icon: string | ReactNode;
  color: string;
  route: string;
};

type MenuItemWithAction = {
  label: string;
  icon: string | ReactNode;
  color: string;
  action: () => void;
};

type MenuItem = MenuItemWithRoute | MenuItemWithAction;

// Define valid route types (kept for clarity; fallback allows any string)
type ValidRoute =
  | "/dashboards/AdminDashboard/create-hostel"
  | "/dashboards/AdminDashboard/manage-wardens"
  | "/dashboards/AdminDashboard/upload-students"
  | "/dashboards/AdminDashboard/view-students"
  | "/dashboards/AdminDashboard/reports"
  | "/dashboards/AdminDashboard/addDailyRates"
  | "/dashboards/AdminDashboard/campusLocationForm"
  | "/dashboards/AdminDashboard/BulkUploadStudents"
  | "/dashboards/AdminDashboard/AttendanceDashboard"
  | string; // Allow any string as fallback

// --- Reusable in-file hook to show a one-time toast on focus ---
function useFlashToastOnFocus(
  flagKey: string,
  opts: { type?: "success" | "error" | "warning" | "info"; text1?: string; text2?: string; delayMs?: number } = {}
) {
  const { type = "success", text1 = "Success!", text2, delayMs = 50 } = opts;

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        try {
          const flag = await AsyncStorage.getItem(flagKey);
          if (alive && flag === "1") {
            await AsyncStorage.removeItem(flagKey);
            setTimeout(() => {
              Toast.show({ type, text1, ...(text2 ? { text2 } : {}) });
            }, delayMs);
          }
        } catch {
          // no-op
        }
      })();

      return () => {
        alive = false;
      };
    }, [flagKey, type, text1, text2, delayMs])
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Safe area handling
  const insets = useSafeAreaInsets();
  const FOOTER_BAR_HEIGHT = 64; // visual height of footer bar (without inset)
  const footerTotalHeight = FOOTER_BAR_HEIGHT + insets.bottom;

  const handleLogout = () => {
    setLogoutModalVisible(false);
    router.replace("/(tabs)/Admin/admin-login" as any);
  };

  // ✅ Show success toast once when arriving after login
  useFlashToastOnFocus("flash:justLoggedIn", { type: "success", text1: "Login successful 🎉" });

  const menuItems: MenuItem[] = [
    {
      label: "Create Hostel",
      icon: <FontAwesome5 name="building" size={20} color="white" />,
      color: "#FF9E44", // orange
      route: "/dashboards/AdminDashboard/create-hostel",
    },
    {
      label: "Assign Warden",
      icon: <FontAwesome5 name="user-shield" size={20} color="white" />,
      color: "#4CD964", // green
      route: "/dashboards/AdminDashboard/manage-wardens",
    },
    {
      label: "Upload Students",
      icon: <FontAwesome5 name="upload" size={20} color="white" />,
      color: "#5AC8FA", // light blue
      route: "/dashboards/AdminDashboard/upload-students",
    },
    {
      label: "View Students",
      icon: <FontAwesome5 name="users" size={20} color="white" />,
      color: "#FF2D55", // pink/red
      route: "/dashboards/AdminDashboard/view-students",
    },
    {
      label: "Issues",
      icon: <FontAwesome5 name="exclamation-triangle" size={20} color="white" />,
      color: "#FF3B30", // red
      route: "/dashboards/AdminDashboard/reports",
    },
    {
      label: "Daily Rates",
      icon: <FontAwesome5 name="rupee-sign" size={20} color="white" />,
      color: "#34C759", // green (darker)
      route: "/dashboards/AdminDashboard/addDailyRates",
    },
    {
      label: "Location",
      icon: <FontAwesome5 name="map-marked-alt" size={20} color="white" />,
      color: "#FF9500", // amber
      route: "/dashboards/AdminDashboard/campusLocationForm",
    },
    {
      label: "Upload Logins",
      icon: <FontAwesome5 name="user-plus" size={20} color="white" />,
      color: "#007AFF", // blue
      route: "/dashboards/AdminDashboard/BulkUploadStudents",
    },
    {
      label: "Today's Menu",
      icon: <FontAwesome5 name="utensils" size={20} color="white" />,
      color: "#8D6E63", // brown (food-related, unique)
      route: "/dashboards/WardenDashboard/MenuChild",
    },
    {
      label: "Attendace Report",
      icon: <FontAwesome5 name="chart-bar" size={20} color="white" />,
      color: "#AF52DE", // purple
      route: "/dashboards/AdminDashboard/AttendanceDashboard",
    },
    {
      label: "Hostel Assign-Rules",
      icon: <FontAwesome5 name="gavel" size={20} color="white" />,
      color: "#ffd54f", // Indigo  → hostel/building theme
      route: "/dashboards/AdminDashboard/AdminBlockRules",
    },
    {
      label: "Hostel View",
      icon: <FontAwesome5 name="bed" size={20} color="white" />,
      color: "#6366F1", // Indigo  → hostel/building theme
      route: "/dashboards/AdminDashboard/AdminHostelView",
    },
    {
    label: "Face Update to DB",
    icon: <FontAwesome5 name="id-card" size={20} color="white" />, // ✅ better suited icon
    color: "#6366F1", // Indigo
    route: "/dashboards/AdminDashboard/AdminFaceUpdateScreen",
  },
  ];

  const handleNavigation = (item: MenuItem) => {
    if ("route" in item) {
      router.push(item.route as any);
    } else if ("action" in item) {
      item.action();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(20, insets.top) + 40 }]}>
        <Text style={styles.headerTitle}>JNTUACEP</Text>
        <Text style={styles.headerSubtitle}>Hostel Management Dashboard</Text>
      </View>

      <ScrollView
        style={[styles.scrollView, { marginBottom: footerTotalHeight + 8 }]} // leave space for footer + bottom inset
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                  {typeof item.icon === "string" ? (
                    <Text style={styles.iconText}>{item.icon}</Text>
                  ) : (
                    item.icon
                  )}
                </View>
                <Text style={styles.label}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={[styles.fixedFooter, { height: footerTotalHeight, paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.logoutButtonContent}>
            <FontAwesome5 name="sign-out-alt" size={20} color="white" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(20, insets.bottom) }]}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.logoutButtonModal]} onPress={handleLogout}>
                <Text style={styles.logoutButtonTextModal}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#667eea",
    // paddingTop set dynamically via insets
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 15,
    paddingTop: 25,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuItem: {
    width: "30%",
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemContent: {
    alignItems: "center",
    padding: 15,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  iconText: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#2c3e50",
  },
  fixedFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2c3e50",
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#7f8c8d",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    minWidth: "45%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f2f6",
  },
  logoutButtonModal: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    color: "#2c3e50",
    fontWeight: "bold",
  },
  logoutButtonTextModal: {
    color: "white",
    fontWeight: "bold",
  },
});
