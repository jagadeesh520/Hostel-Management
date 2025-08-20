import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

  useEffect(() => {
    const fetchStudent = async () => {
      const token = await AsyncStorage.getItem("studentToken");
      const rollNo = await AsyncStorage.getItem("rollNo");

      if (token?.trim() && rollNo?.trim()) {
        try {
          const res = await fetch(
            `http://192.168.29.83:5000/api/studentAuth/roll/${rollNo}`,
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
      onPress: () => router.push("/dashboards/StudentDashboard/TimesheetScreen"),
    },
    {
      id: "2",
      title: "Raise Ticket",
      icon: "chat-processing",
      color: "#ff8a65",
      onPress: () => router.push("/dashboards/StudentDashboard/RaiseTicket"),
    },
    {
      id: "3",
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
      color: "#81c784",
      onPress: () => router.push("/dashboards/StudentDashboard/BlogScreen"),
    },
    {
      id: "6",
      title: "Logout",
      icon: "logout",
      color: "#f44336",
      onPress: handleLogout,
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
              source={{ uri: `http://192.168.29.83:5000${student.faceImage}` }}
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
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="notifications-outline" size={26} color="#fff" />
        </TouchableOpacity>
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
    flexDirection: "row",
    backgroundColor: "#6a4cff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: 110,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
  },
  statLabel: {
    color: "#e0e0e0",
    fontSize: 12,
    marginTop: 4,
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
});
