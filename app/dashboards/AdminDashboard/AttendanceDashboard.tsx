// screens/AttendanceDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CalendarList } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceRecord = {
  date: string;
  status: "Present" | "Absent";
  studentName: string;
  blockName: string;
  phone?: string;
};

type StudentAttendance = {
  studentId: string;
  studentName: string;
  blockName: string;
  phone?: string;
  attendance: AttendanceRecord[];
};

const AttendanceDashboard = () => {
  const [data, setData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [studentsOnDate, setStudentsOnDate] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) return;

      const res = await axios.get(
        "http://192.168.29.83:5000/api/hostels/attendanceList",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const groupedData = res.data.data;
      const studentsArray: StudentAttendance[] = Object.keys(groupedData).map(
        (studentId) => ({
          studentId,
          studentName: groupedData[studentId][0]?.studentName || "Unknown",
          blockName: groupedData[studentId][0]?.blockName || "Unknown",
          phone: groupedData[studentId][0]?.phone || "N/A",
          attendance: groupedData[studentId].map((r: any) => ({
            date: r.date,
            status: r.status,
            studentName: r.studentName || "Unknown",
            blockName: r.blockName || "Unknown",
            phone: r.phone || "N/A",
          })),
        })
      );

      setData(studentsArray);
    } catch (err) {
      console.error("Fetch attendance error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMarkedDates = () => {
  const markedDates: Record<string, any> = {};
  const absenceCount: Record<string, number> = {};

  // ✅ Count absentees per date
  data.forEach((student) => {
    student.attendance.forEach((record) => {
      if (record.status === "Absent") {
        absenceCount[record.date] = (absenceCount[record.date] || 0) + 1;
      }
    });
  });

  // ✅ Apply markings
  data.forEach((student) => {
    student.attendance.forEach((record) => {
      let borderColor =
        record.status === "Present"
          ? "green"
          : record.status === "Absent"
          ? "red"
          : "orange";

      markedDates[record.date] = {
        customStyles: {
          container: {
            borderWidth: 2,
            borderColor,
            backgroundColor:
              absenceCount[record.date] > 4 ? "#ffe680" : "#fff", // highlight if >4 absents
            borderRadius: 6,
          },
          text: {
            color: "#000",
            fontWeight: absenceCount[record.date] > 4 ? "bold" : "normal",
          },
        },
      };
    });
  });

  return markedDates;
};


  const onDayPress = (day: { dateString: string }) => {
    const records: AttendanceRecord[] = [];
    data.forEach((student) => {
      student.attendance.forEach((rec) => {
        if (rec.date === day.dateString) records.push(rec);
      });
    });
    setStudentsOnDate(records);
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={{ flex: 1 }}>
      {/* Calendar */}
      <CalendarList
        pastScrollRange={3}
        futureScrollRange={0}
        scrollEnabled
        showScrollIndicator
        markingType="custom"
        markedDates={getMarkedDates()}
        onDayPress={onDayPress}
        style={{ margin: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}
      />

      {/* Modal showing students on selected date */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            Attendance on {selectedDate}
          </Text>
          <FlatList
            data={studentsOnDate}
            keyExtractor={(item, idx) => item.studentName + idx}
            renderItem={({ item }) => (
              <View style={styles.recordRow}>
                <Text style={{ flex: 1 }}>{item.studentName}</Text>
                <Text style={{ flex: 1, textAlign: "center" }}>{item.status}</Text>
                <Text style={{ flex: 1, textAlign: "center" }}>{item.blockName}</Text>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center" }}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call" size={20} color="green" />
                  <Text style={{ marginLeft: 5 }}>{item.phone}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
};

export default AttendanceDashboard;

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  closeBtn: {
    padding: 15,
    backgroundColor: "#2c3e50",
    borderRadius: 8,
    marginTop: 20,
  },
});
