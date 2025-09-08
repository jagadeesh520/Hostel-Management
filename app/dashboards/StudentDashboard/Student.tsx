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
  const [achievementsCount, setAchievementsCount] = useState<number | null>(null);

  const insets = useSafeAreaInsets();

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
    const fetchStudentAndCounts = async () => {
      try {
        const token = await AsyncStorage.getItem("studentToken");
        const rollNo = await AsyncStorage.getItem("rollNo");

        if (!token?.trim() || !rollNo?.trim()) {
          console.warn("Missing token or rollNo");
          return;
        }

        // fetch student detail
        const res = await fetch(`${API_BASE_URL}/api/studentAuth/roll/${rollNo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          await AsyncStorage.setItem("gender", data.gender || "");
          setStudent(data);
        } else {
          console.log("Failed to fetch student:", res.status);
        }

        // fetch achievements count for this rollNo
        try {
          const achRes = await fetch(`${API_BASE_URL}/api/achievements/by-roll/${rollNo}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (achRes.ok) {
            const achData = await achRes.json();
            if (Array.isArray(achData)) {
              setAchievementsCount(achData.length);
            } else if (Array.isArray((achData as any).achievements)) {
              setAchievementsCount((achData as any).achievements.length);
            } else {
              // unknown shape — try to infer length
              const inferred = Array.isArray((achData as any).data)
                ? (achData as any).data.length
                : 0;
              setAchievementsCount(inferred);
            }
          } else {
            console.warn("Failed to fetch achievements count:", achRes.status);
            setAchievementsCount(0);
          }
        } catch (err) {
          console.error("Error fetching achievements for student:", err);
          setAchievementsCount(0);
        }
      } catch (err) {
        console.error("Error in fetchStudentAndCounts:", err);
      }
    };

    fetchStudentAndCounts();
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: "Time Sheet",
      icon: "calendar",
      color: "#4cafef",
      onPress: () => router.push("/dashboards/StudentDashboard/TimesheetScreen"),
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
    {
      id: "9",
      title: "Achievements",
      icon: "trophy",
      color: "#ff9800",
      onPress: () => router.push("/dashboards/StudentDashboard/AchievementsScreen"),
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

      {/* Achievements Banner */}
      <TouchableOpacity 
        style={styles.achievementBanner}
        onPress={() => router.push("/dashboards/StudentDashboard/AchievementsScreen")}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="trophy" size={24} color="#FFF" />
          <Text style={styles.bannerText}>
            You have {achievementsCount ?? 0} Achievement{(achievementsCount ?? 0) !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{student?.year || "-"}</Text>
          <Text style={styles.statLabel}>Year</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{student?.roomNo || "-"}</Text>
          <Text style={styles.statLabel}>Room No</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{student?.blockName || "-"}</Text>
          <Text style={styles.statLabel}>Block</Text>
        </View>
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
      numColumns={3}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(20, insets.bottom + 20) } // Added safe area padding
      ]}
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
    paddingBottom: 20, // Base padding
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
    marginBottom: 15,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
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
  achievementBanner: {
    backgroundColor: "#FF9800",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#6a4cff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  statCard: {
    alignItems: "center",
    flex: 1,
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
    minWidth: 100,
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