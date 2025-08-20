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
  parentPhone: number;
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
  const [statusFilter, setStatusFilter] = useState<"All" | "Present" | "Absent">("All");

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
          phone: groupedData[studentId][0]?.studentPhone || "N/A",
          attendance: groupedData[studentId].map((r: any) => ({
            date: r.date,
            status: r.status,
            studentName: r.studentName || "Unknown",
            blockName: r.blockName || "Unknown",
            phone: r.studentPhone || "N/A",
            parentPhone: r.parentPhone || "N/A",
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

    data.forEach((student) => {
      student.attendance.forEach((record) => {
        if (record.status === "Absent") {
          absenceCount[record.date] = (absenceCount[record.date] || 0) + 1;
        }
      });
    });

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
                absenceCount[record.date] > 4 ? "#ffe680" : "#fff",
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
    setStatusFilter("All"); // reset filter when new date selected
  };

  const filteredStudents = studentsOnDate.filter((item) =>
    statusFilter === "All" ? true : item.status === statusFilter
  );

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
        <CalendarList
          pastScrollRange={3}
          futureScrollRange={0}
          scrollEnabled
          showScrollIndicator
          markingType="custom"
          markedDates={getMarkedDates()}
          onDayPress={onDayPress}
          style={{
            marginLeft: 1,
            borderWidth: 2,
            borderColor: "#ccc",
            borderRadius: 8,
          }}
        />

        <Modal visible={modalVisible} animationType="slide">
          <View style={{ flex: 1, paddingVertical: 20, paddingHorizontal: 11 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
              Attendance on {selectedDate}
            </Text>

            {/* Filter Buttons */}
            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              {["All", "Present", "Absent"].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status as "All" | "Present" | "Absent")}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: statusFilter === status ? "#2c3e50" : "#ccc",
                    borderRadius: 6,
                    marginRight: 10,
                  }}
                >
                  <Text style={{ color: statusFilter === status ? "#fff" : "#000" }}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Header Row */}
            <View style={[styles.recordRow, { backgroundColor: "#f0f0f0", paddingVertical: 10 }]}>
              <Text style={{ flex: 1, fontWeight: "bold" }}>Name</Text>
              <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>P/A</Text>
              <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>Block Name</Text>
              <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>Parent No</Text>
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item, idx) => item.studentName + idx}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.recordRow,
                    { backgroundColor: item.status === "Absent" ? "#ffe6e6" : "#fff" },
                  ]}
                >
                  <Text style={{ flex: 1 }}>{item.studentName}</Text>
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontWeight: item.status === "Absent" ? "bold" : "normal",
                      color: item.status === "Absent" ? "red" : "#000",
                    }}
                  >
                    {item.status}
                  </Text>
                  <Text style={{ flex: 1, textAlign: "center" }}>{item.blockName}</Text>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onPress={() => Linking.openURL(`tel:${item.parentPhone}`)}
                  >
                    <Ionicons name="call" size={16} color="blue" />
                    <Text style={{ marginLeft: 5 }}>{item.parentPhone}</Text>
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
