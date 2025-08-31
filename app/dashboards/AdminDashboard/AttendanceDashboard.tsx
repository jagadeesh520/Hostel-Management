// screens/AttendanceDashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

// ---- Types ----
type AttendanceRecord = {
  parentPhone: number | string;
  date: string; // YYYY-MM-DD (IST from backend)
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

type DayObj = {
  dateString: string; // "YYYY-MM-DD"
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

// ---- Helpers ----
const normalizeStatus = (s?: string): "Present" | "Absent" => {
  const v = (s || "").toLowerCase().trim();
  if (v.startsWith("pre")) return "Present";
  if (v.startsWith("abs")) return "Absent";
  if (v.startsWith("not")) return "Absent"; // NotMarked -> treat as Absent
  return "Absent";
};

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

const todayYMD = toYMD(new Date());
const isPastOrToday = (ymd: string) => ymd <= todayYMD;

// ---- Component ----
const AttendanceDashboard = () => {
  const [data, setData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  // month navigation + selected date
  const [currentMonth, setCurrentMonth] = useState<Date>(firstOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(toYMD(new Date()));

  // modal list of students for selected date
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
        "https://api.sjtechsol.com/api/hostels/attendanceList",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const groupedData = res.data?.data ?? {};
      const studentsArray: StudentAttendance[] = Object.keys(groupedData).map(
        (studentId) => ({
          studentId,
          studentName: groupedData[studentId][0]?.studentName || "Unknown",
          blockName: groupedData[studentId][0]?.blockName || "Unknown",
          phone: groupedData[studentId][0]?.studentPhone || "N/A",
          attendance: groupedData[studentId].map((r: any) => ({
            date: r.date,
            status: normalizeStatus(r.status),
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

  // Build marks only for the current month for performance/clarity
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const monthStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}`;

    // Count absences per day (current month only) IF backend recorded them
    const absenceCount: Record<string, number> = {};
    data.forEach((student) => {
      student.attendance.forEach((rec) => {
        if (rec.date?.startsWith(monthStr) && rec.status === "Absent") {
          absenceCount[rec.date] = (absenceCount[rec.date] || 0) + 1;
        }
      });
    });

    // Mark each recorded date (current month only)
    data.forEach((student) => {
      student.attendance.forEach((record) => {
        if (!record.date?.startsWith(monthStr)) return;
        const borderColor = record.status === "Present" ? "green" : "red";
        marks[record.date] = {
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor,
              backgroundColor:
                (absenceCount[record.date] || 0) > 4 ? "#ffe680" : "#fff",
              borderRadius: 6,
            },
            text: {
              color: "#000",
              fontWeight:
                (absenceCount[record.date] || 0) > 4 ? "bold" : "normal",
            },
          },
        };
      });
    });

    // also highlight selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: "#2563EB",
        selectedTextColor: "#fff",
      };
    }
    return marks;
  }, [data, currentMonth, selectedDate]);

  // Generate a complete list (present + synthetic absents for past/today)
  const buildDayRecords = (dayStr: string): AttendanceRecord[] => {
    const records: AttendanceRecord[] = [];
    data.forEach((student) => {
      const rec = student.attendance.find((r) => r.date === dayStr);
      if (rec) {
        records.push(rec);
      } else if (isPastOrToday(dayStr)) {
        records.push({
          date: dayStr,
          status: "Absent",
          studentName: student.studentName,
          blockName: student.blockName,
          phone: student.phone,
          parentPhone: "",
        });
      }
      // future date + no record => skip
    });
    return records;
  };

  // ⬇️ Change: just select the date; do NOT open the list
  const onDayPress = (day: DayObj) => {
    const dayStr = day.dateString;
    setSelectedDate(dayStr);
    setStatusFilter("All");
    // no modal here
  };

  // Progress (Present %) for selected date (or today if none)
  const dayStats = useMemo(() => {
    const day = selectedDate || toYMD(new Date());

    let total = 0;
    let present = 0;

    data.forEach((student) => {
      const rec = student.attendance.find((r) => r.date === day);
      if (rec) {
        total += 1;
        if (rec.status === "Present") present += 1;
      } else if (isPastOrToday(day)) {
        // treat missing record as Absent for past/today
        total += 1;
      }
    });

    const absent = Math.max(0, total - present);
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, pct, day };
  }, [data, selectedDate]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  // Month label
  const monthLabel = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        {/* Month header with Prev/Next */}
        <View style={styles.monthBar}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentMonth((m) => addMonths(m, -1))}
          >
            <Ionicons name="chevron-back" size={18} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.monthText}>{monthLabel}</Text>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentMonth((m) => addMonths(m, +1))}
          >
            <Ionicons name="chevron-forward" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* One-month calendar (force rerender when month changes) */}
        <Calendar
          key={toYMD(currentMonth)}
          current={toYMD(currentMonth)}
          onDayPress={onDayPress}
          markedDates={markedDates}
          markingType="custom"
          hideArrows={true} // we provide our own arrows above
          style={styles.calendar}
          theme={{ todayTextColor: "#2563EB" }}
        />

        {/* Progress card (selected date or today) */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            {selectedDate ? `Attendance on ${selectedDate}` : "Today’s Attendance"}
          </Text>

          {/* Present row */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Present</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      dayStats.total > 0
                        ? (dayStats.present / dayStats.total) * 100
                        : 0
                    }%`,
                    backgroundColor: "#10B981",
                  },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>
              {dayStats.present}/{dayStats.total}
            </Text>
          </View>

          {/* Absent row */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Absent</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      dayStats.total > 0
                        ? (dayStats.absent / dayStats.total) * 100
                        : 0
                    }%`,
                    backgroundColor: "#EF4444",
                  },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>
              {dayStats.absent}/{dayStats.total}
            </Text>
          </View>

          <Text style={styles.progressSmall}>
            {dayStats.present} Present / {dayStats.absent} Absent / {dayStats.total} Total
          </Text>

          {/* View Students now opens the modal */}
          <TouchableOpacity
            style={styles.openListBtn}
            onPress={() => {
              const day = selectedDate || toYMD(new Date());
              const records = buildDayRecords(day);
              setStudentsOnDate(records);
              setStatusFilter("All");
              setModalVisible(true);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
              View Students
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal: list of students for the selected day */}
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
          <View
            style={[
              styles.recordRow,
              { backgroundColor: "#f0f0f0", paddingVertical: 10 },
            ]}
          >
            <Text style={{ flex: 1, fontWeight: "bold" }}>Name</Text>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
              P/A
            </Text>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
              Block Name
            </Text>
            <Text style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
              Parent No
            </Text>
          </View>

          <FlatList
            data={studentsOnDate.filter((i) =>
              statusFilter === "All" ? true : i.status === statusFilter
            )}
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
                <Text style={{ flex: 1, textAlign: "center" }}>
                  {item.blockName}
                </Text>
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

          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AttendanceDashboard;

// ---- Styles ----
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthText: { fontSize: 18, fontWeight: "800", color: "#111827" },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },

  calendar: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 8,
  },

  // progress card
  progressCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  progressLabel: { width: 70, fontWeight: "600", color: "#374151" },
  progressTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  progressFill: { height: "100%", borderRadius: 6 },
  progressValue: { width: 50, textAlign: "right", fontWeight: "700" },
  progressSmall: { textAlign: "center", color: "#6B7280", fontSize: 12 },
  openListBtn: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
  },

  // list
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
