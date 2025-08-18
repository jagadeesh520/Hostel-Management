// AttendanceScanner.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { FaceModalScanner } from "../WardenDashboard/FaceModalCamera";

interface CampusInfo {
  latitude: number;
  longitude: number;
  radius: number;
}

interface Student {
  rollNo: string;
  studentName: string;
  roomNo: string;
  blockName?: string;
}

export default function AttendanceScanner() {
  const [student, setStudent] = useState<Student | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [campusInfo, setCampusInfo] = useState<CampusInfo | null>(null);
  const [loading, setLoading] = useState(true); // start as loading
  const [faceModalVisible, setFaceModalVisible] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Load student
        const stored = await AsyncStorage.getItem("currentStudent");
        if (!stored) return Alert.alert("Error", "Student data not provided.");
        const parsedStudent = JSON.parse(stored);
        setStudent(parsedStudent);

        // Request location permission
        const locStatus = await Location.requestForegroundPermissionsAsync();
        setHasLocationPermission(locStatus.granted);
        if (!locStatus.granted) {
          Alert.alert("Location Permission Required", "Enable location to mark attendance.");
          setLoading(false);
          return;
        }

        // Fetch campus info
        const res = await fetch("http://192.168.29.83:5000/api/campusLocation/JNTUACEP");
        if (!res.ok) throw new Error("Failed to fetch campus location");
        const json = await res.json();
        setCampusInfo(json.data);

        // Check student location immediately
        await validateLocation(parsedStudent, json.data);

      } catch (err) {
        console.error("Init failed:", err);
        Alert.alert("Error", "Initialization failed.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const validateLocation = async (student: Student, campus: CampusInfo) => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const distance = getDistanceFromLatLonInMeters(
        loc.coords.latitude,
        loc.coords.longitude,
        campus.latitude,
        campus.longitude
      );

      if (distance > campus.radius) {
        Alert.alert("❌ Outside Campus", "You are not within campus premises.");
        return;
      }

      // Check if attendance already exists
      const today = new Date().toISOString().split("T")[0];
      const rollNo = student.rollNo;
      const res = await fetch(
        `http://192.168.29.83:5000/api/studentAuth/check/${rollNo}?date=${today}`,
        { headers: { Accept: "application/json" } }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Invalid server response:", text);
        return Alert.alert("Error", "Server returned invalid response.");
      }

      const json = await res.json();
      if (json.exists) {
        return Alert.alert("⚠️ Attendance Already Taken", "You have already marked attendance for today.");
      }

      // ✅ Inside campus & not marked: show alert then open FaceModalCamera
      Alert.alert("✅ Inside Campus", "You are within campus premises.", [
        { text: "OK", onPress: () => setFaceModalVisible(true) },
      ]);

    } catch (err) {
      console.error("Location validation failed:", err);
      Alert.alert("Error", "Failed to get location or check attendance.");
    }
  };

  if (loading || hasLocationPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00bfff" />
        <Text>Checking location and campus info...</Text>
      </View>
    );
  }

  if (!hasLocationPermission) {
    return (
      <View style={styles.center}>
        <Text>No location access</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {student && (
        <FaceModalScanner
          visible={faceModalVisible}
          student={student}
          onClose={() => setFaceModalVisible(false)}
          onMatchSuccess={() =>
            Alert.alert("✅ Attendance Marked", `${student.studentName} is present.`)
          }
        />
      )}
    </View>
  );
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
