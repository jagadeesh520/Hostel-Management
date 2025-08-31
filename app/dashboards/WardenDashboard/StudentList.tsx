import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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

type BannerType = "success" | "info" | "error" | null;

export const StudentList = ({ blockName }: { blockName: string }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Inline banner state (replaces Alert.alert)
  const [bannerType, setBannerType] = useState<BannerType>(null);
  const [bannerTitle, setBannerTitle] = useState<string>("");
  const [bannerSubtitle, setBannerSubtitle] = useState<string>("");
  const bannerY = useRef(new Animated.Value(-80)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (type: BannerType, title: string, subtitle?: string, autoHide = true) => {
    setBannerType(type);
    setBannerTitle(title);
    setBannerSubtitle(subtitle || "");

    // clear any previous auto-hide
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(bannerY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bannerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      if (autoHide) {
        autoHideTimer.current = setTimeout(hideBanner, 1600);
      }
    });
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(bannerY, { toValue: -80, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (blockName) {
      fetchStudents();
      fetchTodayAttendance();
    }
    // cleanup timer
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [blockName]);

  const fetchStudents = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get(
        `${API_BASE_URL}/api/students/filter?block=${blockName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      showBanner("error", "Failed to fetch students", "Please try again.");
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const date = new Date().toISOString().split("T")[0];

      const res = await axios.get(
        `${API_BASE_URL}/api/attendance/list?date=${date}&block=${encodeURIComponent(
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
        const timestamp = record.timestamp || record.updatedAt || record.createdAt;

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
      showBanner("error", "Failed to fetch attendance", "Please pull to refresh.");
    }
  };

  // Mark attendance WITHOUT using Alert for confirm. If you still want confirm,
  // we can add an inline confirm bar later—this version just updates.
  const markAttendance = async (student: Student, status: "Present" | "Absent") => {
    const currentStatus = attendance[student._id]?.status;
    if (currentStatus === status) return;

    await actuallyMarkAttendance(student, status);
  };

  const actuallyMarkAttendance = async (student: Student, status: "Present" | "Absent") => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const date = new Date().toISOString().split("T")[0];
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);

      await axios.post(
        `${API_BASE_URL}/api/attendance/mark`,
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

      // Success banner (no modal alert)
      showBanner(
        "success",
        "Attendance Updated",
        `${student.studentName} is ${status}.`
      );
    } catch (err) {
      console.error("❌ Failed to mark attendance:", err);
      showBanner("error", "Could not mark attendance", "Please try again.");
    }
  };

  // Called when scanner returns success
  const handleFaceMatchSuccess = () => {
    if (selectedStudent) {
      markAttendance(selectedStudent, "Present");
      setModalVisible(false);
    }
  };

  // Colors for banner
  const bannerBg = useMemo(() => {
    if (bannerType === "success") return "#1ABC9C";
    if (bannerType === "info") return "#2980B9";
    if (bannerType === "error") return "#C0392B";
    return "transparent";
  }, [bannerType]);

  const bannerIcon = useMemo(() => {
    if (bannerType === "success") return "✔";
    if (bannerType === "info") return "ℹ";
    if (bannerType === "error") return "✖";
    return "";
  }, [bannerType]);

  return (
    <View style={styles.container}>
      {/* Inline top banner */}
      {bannerType && (
        <Animated.View
          style={[
            styles.banner,
            { backgroundColor: bannerBg, opacity: bannerOpacity, transform: [{ translateY: bannerY }] },
          ]}
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconCircle}>
              <Text style={styles.bannerIcon}>{bannerIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{bannerTitle}</Text>
              {!!bannerSubtitle && <Text style={styles.bannerSubtitle}>{bannerSubtitle}</Text>}
            </View>
            <TouchableOpacity onPress={hideBanner} style={styles.bannerClose}>
              <Text style={styles.bannerCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

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
        onRefresh={fetchTodayAttendance}
        refreshing={false}
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
                    status === "Present" ? styles.selectedPresent : styles.neutralBtn,
                  ]}
                  onPress={() => {
                    setSelectedStudent(item);
                    setModalVisible(true);
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      status === "Present" ? { color: "#fff" } : { color: "#2c3e50" },
                    ]}
                  >
                    P
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    status === "Absent" ? styles.selectedAbsent : styles.neutralBtn,
                  ]}
                  onPress={() => markAttendance(item, "Absent")}
                >
                  <Text
                    style={[
                      styles.btnText,
                      status === "Absent" ? { color: "#fff" } : { color: "#2c3e50" },
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
          onResult={(r) => {
            // Mirror scanner’s message in list (no Alert)
            if (r.type === "success" || r.type === "already") {
              showBanner("success", r.title, r.subtitle);
            } else if (r.type === "mismatch" || r.type === "notfound") {
              showBanner("info", r.title, r.subtitle);
            } else if (r.type === "network" || r.type === "error") {
              showBanner("error", r.title, r.subtitle);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#2c3e50",
  },

  // Header / rows
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

  // Top slide-in banner
  banner: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    zIndex: 5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  bannerIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  bannerTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "white",
    fontSize: 12,
    opacity: 0.95,
  },
  bannerClose: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerCloseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
});
