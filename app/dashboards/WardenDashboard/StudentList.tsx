import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FaceModalScanner } from "./FaceModalCamera";

type Student = {
  blockName: any;
  rollNo: any;
  _id: string;
  studentName: string;
  roomNo: string;
};

type AttendanceMap = {
  [studentId: string]: {
    status: "Present" | "Absent";
    timestamp?: string;
  };
};

export const StudentList = ({ blockName }: { blockName: string }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (blockName) {
      fetchStudents();
      fetchTodayAttendance();
    }
  }, [blockName]);

  const fetchStudents = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get(
        `http://192.168.29.83:5000/api/students/filter?block=${blockName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      Alert.alert("Error", "Could not fetch students");
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const date = new Date().toISOString().split("T")[0];

      const res = await axios.get(
        `http://192.168.29.83:5000/api/attendance/list?date=${date}&block=${encodeURIComponent(
          blockName
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const attendanceData: AttendanceMap = {};

      res.data.forEach((record: any) => {
        const id = record.studentId?._id || record.studentId;
        const status = record.status?.toLowerCase?.();
        const timestamp =
          record.timestamp || record.updatedAt || record.createdAt;

        if (status) {
          attendanceData[id] = {
            status: status === "present" ? "Present" : "Absent",
            timestamp,
          };
        }
      });

      setAttendance(attendanceData);
    } catch (err) {
      console.error("❌ Failed to fetch attendance:", err);
    }
  };

  const markAttendance = async (
    student: Student,
    status: "Present" | "Absent"
  ) => {
    const currentStatus = attendance[student._id]?.status;

    if (currentStatus === status) return;

    const proceed = () => actuallyMarkAttendance(student, status);

    if (currentStatus) {
      Alert.alert(
        "Update Attendance",
        `Already marked as "${currentStatus}". Update to "${status}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Update", onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  const actuallyMarkAttendance = async (
    student: Student,
    status: "Present" | "Absent"
  ) => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const date = new Date().toISOString().split("T")[0];
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);

      await axios.post(
        "http://192.168.29.83:5000/api/attendance/mark",
        {
          studentId: student._id,
          status: formattedStatus,
          date,
          studentName: student.studentName,
          roomNo: student.roomNo,
          rollNo: student.rollNo,
          blockName: student.blockName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAttendance((prev) => ({
        ...prev,
        [student._id]: {
          status,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (err) {
      console.error("❌ Failed to mark attendance:", err);
      Alert.alert("Error", "Could not mark attendance");
    }
  };

  const handleFaceMatchSuccess = () => {
    if (selectedStudent) {
      markAttendance(selectedStudent, "Present");
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance for {blockName}</Text>

      <View style={[styles.row, styles.header]}>
        <Text style={styles.headerText}>Name</Text>
        <Text style={styles.headerText}>Room No</Text>
        <Text style={styles.headerText}>P/A</Text>
       <Text style={styles.headerText}>Status</Text>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const record = attendance[item._id];
          const status = record?.status;
          const time = record?.timestamp
            ? new Date(record.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;

          return (
            <View style={styles.row}>
              <Text style={styles.cell}>{item.studentName}</Text>
              <Text style={styles.cell}>{item.roomNo}</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.btn,
                    status === "Present"
                      ? styles.selectedPresent
                      : styles.neutralBtn,
                  ]}
                  onPress={() => {
                    setSelectedStudent(item);
                    setModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      status === "Present"
                        ? { color: "#fff" }
                        : { color: "#2c3e50" },
                    ]}
                  >
                    P
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    status === "Absent"
                      ? styles.selectedAbsent
                      : styles.neutralBtn,
                  ]}
                  onPress={() => markAttendance(item, "Absent")}
                >
                  <Text
                    style={[
                      styles.btnText,
                      status === "Absent"
                        ? { color: "#fff" }
                        : { color: "#2c3e50" },
                    ]}
                  >
                    A
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeCell}>
                {status ? `${status}${time ? ` - ${time}` : ""}` : "Not Marked"}
              </Text>
            </View>
          );
        }}
      />

      {selectedStudent && (
        <FaceModalScanner
          visible={modalVisible}
          student={selectedStudent}
          onClose={() => setModalVisible(false)}
          onMatchSuccess={handleFaceMatchSuccess}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#2c3e50",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    backgroundColor: "#f8f9fa",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
  },
  header: {
    backgroundColor: "#dcdde1",
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    color: "#34495e",
  },
  cell: {
    flex: 1.2,
    fontSize: 12,
    textAlign: "center",
    color: "#2d3436",
  },
  timeCell: {
    flex: 1.8,
    fontSize: 11,
    textAlign: "center",
    color: "#555",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginHorizontal: 2,
    minWidth: 30,
    alignItems: "center",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  neutralBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectedPresent: {
    backgroundColor: "#145a32",
  },
  selectedAbsent: {
    backgroundColor: "#922b21",
  },
});
