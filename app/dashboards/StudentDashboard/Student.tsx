import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {student ? (
        <>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {student.faceImage && !imageError ? (
              <Image
                source={{ uri: `http://192.168.29.83:5000${student.faceImage}` }}
                style={styles.faceImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.fallbackCircle}>
                <Text style={styles.fallbackText}>
                  {student.studentName?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{student.studentName}</Text>
              <Text style={styles.profileSubText}>Roll No: {student.rollNo}</Text>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            Hello,{" "}
            <Text style={{ fontWeight: "bold" }}>
              {student.studentName.split(" ")[0]}
            </Text>
            !
          </Text>

          {/* Navigation Cards */}
          <View style={styles.cardGrid}>
            <TouchableOpacity
              style={[styles.cardBox, { backgroundColor: "#f95f62" }]}
              onPress={() =>
                router.push("/dashboards/StudentDashboard/TimesheetScreen")
              }
            >
              <Ionicons name="calendar" size={24} color="white" />
              <Text style={styles.cardLabel}>Time Sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardBox, { backgroundColor: "#00c2cb" }]}
              onPress={() =>
                router.push("/dashboards/StudentDashboard/RaiseTicket")
              }
            >
              <Ionicons name="chatbox-ellipses" size={24} color="white" />
              <Text style={styles.cardLabel}>Raise a Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardBox, { backgroundColor: "#5a67f2" }]}
              onPress={() =>
                router.push("/dashboards/StudentDashboard/MyProfile")
              }
            >
              <FontAwesome5 name="user-circle" size={24} color="white" />
              <Text style={styles.cardLabel}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardBox, { backgroundColor: "#f39c12" }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text style={styles.cardLabel}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text>Loading student info...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#fff9c4",
    padding: 10,
    borderRadius: 12,
  },
  faceImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  fallbackCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  fallbackText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileInfo: {
    flexShrink: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  profileSubText: {
    fontSize: 14,
    color: "#555",
  },
  greeting: {
    fontSize: 20,
    marginVertical: 15,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 15,
  },
  cardBox: {
    width: "48%",
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
});
