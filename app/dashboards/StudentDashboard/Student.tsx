import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface Student {
  _id: string;
  studentName: string;
  rollNo: string;
  gender: string;
  year: string;
  roomNo: string;
  blockName: string;
  collegeName: string;
  faceImage: string;
}

interface Stat {
  id: string;
  value: string;
  label: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress: () => void;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [imageError, setImageError] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const FOOTER_BAR_HEIGHT = 64; // visual height of footer bar (without inset)
  const footerTotalHeight = FOOTER_BAR_HEIGHT + insets.bottom;

  const handleLogout = () => {
    setLogoutModalVisible(false);
    router.replace("/(tabs)/Admin/admin-login" as any);
  };

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const flag = await AsyncStorage.getItem("flash:studentLoggedIn");
        if (alive && flag === "1") {
          await AsyncStorage.removeItem("flash:studentLoggedIn");
          // tiny delay ensures layout/header are ready
          setTimeout(() => {
            Toast.show({ type: "success", text1: "Login successful 🎉" });
          }, 50);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  useEffect(() => {
    const fetchStudent = async () => {
      const token = await AsyncStorage.getItem("studentToken");
      const rollNo = await AsyncStorage.getItem("rollNo");

      if (token?.trim() && rollNo?.trim()) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/studentAuth/roll/${rollNo}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            await AsyncStorage.setItem("gender", data.gender);
            setStudent(data);
          } else {
            console.log("Failed to fetch student:", res.status);
          }
        } catch (err) {
          console.error("Error fetching student data:", err);
        }
      } else {
        console.warn("Missing token or rollNo");
      }
    };

    fetchStudent();
  }, []);

  const stats: Stat[] = [
    { id: "1", value: student?.year || "-", label: "Year" },
    { id: "2", value: student?.roomNo || "-", label: "Room No" },
    { id: "3", value: student?.blockName || "-", label: "Block" },
  ];

  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: "Time Sheet",
      icon: "calendar",
      color: "#4cafef",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/TimesheetScreen"),
    },
    {
      id: "2",
      title: "Self Check-In",
      icon: "camera",
      color: "#4db6ac",
      onPress: async () => {
        if (!student) {
          Alert.alert("Error", "Student data not loaded yet.");
          return;
        }
        await AsyncStorage.setItem("currentStudent", JSON.stringify(student));
        router.push("/dashboards/StudentDashboard/AttendanceScanner");
      },
    },
    {
      id: "3",
      title: "Raise Ticket",
      icon: "chat-processing",
      color: "#ff8a65",
      onPress: () => router.push("/dashboards/StudentDashboard/RaiseTicket"),
    },
    {
      id: "4",
      title: "My Profile",
      icon: "account-circle",
      color: "#9575cd",
      onPress: () => router.push("/dashboards/StudentDashboard/MyProfile"),
    },
    {
      id: "5",
      title: "Blog",
      icon: "notebook-edit",
      color: "#f06292",
      onPress: () => router.push("/dashboards/StudentDashboard/BlogScreen"),
    },
    {
      id: "6",
      title: "Today's Menu",
      icon: "silverware-fork-knife",
      color: "#ffd54f",
      onPress: () => router.push("/dashboards/WardenDashboard/MenuChild"),
    },
    {
      id: "7",
      title: "Leave Apply",
      icon: "account-group",
      color: "#81c784",
      onPress: () => router.push("/dashboards/StudentDashboard/LeaveApply"),
    },
    {
      id: "8",
      title: "Room Book",
      icon: "bed-outline",
      color: "#ba68c8",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/StudentHostelView"),
    },
  ];

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name={item.icon} size={26} color="#fff" />
      </View>
      <Text style={styles.menuText}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {student?.faceImage && !imageError ? (
            <Image
              source={{ uri: `${API_BASE_URL}${student.faceImage}` }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.fallbackCircle}>
              <Text style={styles.fallbackText}>
                {student?.studentName?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{student?.studentName}</Text>
            <Text style={styles.subText}>Roll No: {student?.rollNo}</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setLogoutModalVisible(true)}
          >
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <FlatList
          data={stats}
          renderItem={({ item }) => (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(20, insets.bottom) },
            ]}
          >
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.logoutButtonModal]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonTextModal}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  return student ? (
    <FlatList
      data={menuItems}
      renderItem={renderMenuItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      ListHeaderComponent={renderHeader}
    />
  ) : (
    <Text style={styles.loadingText}>Loading student info...</Text>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f7ff",
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#6a4cff",
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    marginTop: 40,
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15, // Space between icons
  },
  iconButton: {
    padding: 5,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  fallbackCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fallbackText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  subText: {
    color: "#e0e0e0",
    fontSize: 13,
  },
  statsContainer: {
    backgroundColor: "#6a4cff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  statCard: {
    width: 90,
    alignItems: "center",
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
  statLabel: {
    color: "#e0e0e0",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  menuItem: {
    backgroundColor: "#fff",
    flex: 1,
    margin: 5,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    color: "#555",
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