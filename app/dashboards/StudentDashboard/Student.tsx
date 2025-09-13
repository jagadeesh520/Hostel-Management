import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

const { width } = Dimensions.get('window');

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [imageError, setImageError] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [achievementsCount, setAchievementsCount] = useState<number | null>(null);
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

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
        setIsLoading(true);
        const token = await AsyncStorage.getItem("studentToken");
        const rollNo = await AsyncStorage.getItem("rollNo");

        if (!token?.trim() || !rollNo?.trim()) {
          console.warn("Missing token or rollNo");
          setIsLoading(false);
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
              setAchievementsCount(0);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentAndCounts();
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: "1",
      title: "Time Sheet",
      icon: "calendar-clock",
      color: "#5e72e4",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/TimesheetScreen"),
    },
    {
      id: "2",
      title: "Check-In",
      icon: "camera",
      color: "#11cdef",
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
      title: "Apply Leave",
      icon: "calendar-edit",
      color: "#2dce89",
      onPress: () => router.push("/dashboards/StudentDashboard/LeaveApply"),
    },
    {
      id: "4",
      title: "My Profile",
      icon: "account-circle",
      color: "#f5365c",
      onPress: () => router.push("/dashboards/StudentDashboard/MyProfile"),
    },
    {
      id: "5",
      title: "Raise Ticket",
      icon: "help-circle",
      color: "#fb6340",
      onPress: () => router.push("/dashboards/StudentDashboard/RaiseTicket"),
    },
    {
      id: "6",
      title: "My Room",
      icon: "bed",
      color: "#ffd600",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/StudentHostelView"),
    },
    {
      id: "7",
      title: "Blog",
      icon: "notebook-edit",
      color: "#8965e0",
      onPress: () => router.push("/dashboards/StudentDashboard/BlogScreen"),
    },
    {
      id: "8",
      title: "Today's Menu",
      icon: "food",
      color: "#f3a4b5",
      onPress: () => router.push("/dashboards/WardenDashboard/MenuChild"),
    },
    {
      id: "9",
      title: "Achievements",
      icon: "trophy",
      color: "#ff9700",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/AchievementsScreen"),
    },
    {
      id: "10",
      title: "Upload Challan",
      icon: "file-upload",
      color: "#4b7bec",
      onPress: () =>
        router.push("/dashboards/StudentDashboard/UploadChallanaScreen"),
    },
  ];

  const quickActions = [
    {
      id: "1",
      title: "Attendance",
      icon: "calendar-check",
      color: "#5e72e4",
      onPress: () => router.push("/dashboards/StudentDashboard/TimesheetScreen"),
    },
    {
      id: "2",
      title: "Meals",
      icon: "food",
      color: "#11cdef",
      onPress: () => router.push("/dashboards/WardenDashboard/MenuChild"),
    },
    {
      id: "3",
      title: "Leaves",
      icon: "calendar-remove",
      color: "#2dce89",
      onPress: () => router.push("/dashboards/StudentDashboard/LeaveApply"),
    },
  ];

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />
      </View>
      <Text style={styles.menuText} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderQuickAction = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.quickActionCard}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.quickActionHeader}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${item.color}20` }]}>
          <MaterialCommunityIcons 
            name={item.icon} 
            size={20} 
            color={item.color} 
          />
        </View>
        <Text style={styles.quickActionTitle}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {/* Header - Fixed to eliminate white gaps */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{student?.studentName || "Student"}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.notificationBadge}></View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setLogoutModalVisible(true)}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
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
                {student?.studentName?.charAt(0).toUpperCase() || "S"}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <View style={styles.idBadge}>
              <Ionicons name="id-card" size={16} color="#fff" />
              <Text style={styles.rollNo}>{student?.rollNo || "123456"}</Text>
            </View>
            <View style={styles.collegeBadge}>
              <Ionicons name="school" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.college}>{student?.collegeName || "College Name"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <FlatList
          data={quickActions}
          renderItem={renderQuickAction}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickStatsList}
        />
      </View>

      {/* Achievements Banner */}
      <TouchableOpacity 
        style={styles.achievementBanner}
        onPress={() => router.push("/dashboards/StudentDashboard/AchievementsScreen")}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="trophy" size={24} color="#FFF" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Your Achievements</Text>
            <Text style={styles.bannerSubtitle}>
              {achievementsCount ?? 0} accomplishment{(achievementsCount ?? 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* Menu Section Title */}
      <View style={styles.menuTitleContainer}>
        <Text style={styles.sectionTitle}>Campus Services</Text>
        <Text style={styles.sectionSubtitle}>Access all campus facilities</Text>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e72e4" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5e72e4" />
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.menuGrid}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={40} color="#f5365c" />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout from your account?
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8392ab",
  },
  header: {
    backgroundColor: "#5e72e4",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  greeting: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 2,
    fontWeight: "500",
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f5365c",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  fallbackCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  fallbackText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  rollNo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
  },
  collegeBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  college: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 6,
  },
  quickStatsContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2d3748",
    marginBottom: 12,
  },
  quickStatsList: {
    paddingVertical: 5,
  },
  quickActionCard: {
    backgroundColor: "#f8f9fe",
    borderRadius: 12,
    padding: 12,
    width: 110,
    marginRight: 10,
  },
  quickActionHeader: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d3748",
    textAlign: "center",
  },
  achievementBanner: {
    backgroundColor: "#ff9700",
    marginHorizontal: 15,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  menuTitleContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#718096",
  },
  listContent: {
    paddingTop: 0,
    backgroundColor: "#f7fafc",
  },
  menuGrid: {
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  menuItem: {
    backgroundColor: "#fff",
    width: (width - 60) / 3,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 16,
    marginHorizontal: 5,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2d3748",
    textAlign: "center",
    paddingHorizontal: 4,
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
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245, 54, 92, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2d3748",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#718096",
    lineHeight: 22,
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
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logoutButtonModal: {
    backgroundColor: "#f5365c",
  },
  cancelButtonText: {
    color: "#4a5568",
    fontWeight: "600",
  },
  logoutButtonTextModal: {
    color: "white",
    fontWeight: "600",
  },
});