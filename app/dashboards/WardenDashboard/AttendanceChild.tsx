import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";

type AttendanceListItem = {
  studentId: string;
  studentName: string;
  roomNo: string;
  status: "Present" | "Absent" | "NotMarked";
  marked: boolean;
  blockName: string;
};

// Safe percentage formatter
const safePct = (n: number) =>
  isFinite(n) && !isNaN(n) ? Math.round(n) : 0;

export default function AttendanceChild() {
  const [total, setTotal] = useState(0);
  const [present, setPresent] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const todayIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60 * 1000); // UTC+5:30
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) {
        Alert.alert("Error", "Warden not logged in.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const date = todayIST();

      const { data } = await axios.get<AttendanceListItem[]>(
        `${API_BASE_URL}/api/attendance/list?date=${date}`,
        { headers }
      );

      const list = data || [];
      const totalStudents = list.length;
      const presentStudents = list.filter((x) => x.status === "Present").length;

      setTotal(totalStudents);
      setPresent(presentStudents);
    } catch (e) {
      console.error("Attendance load error:", e);
      Alert.alert("Error", "Unable to load attendance.");
      setTotal(0);
      setPresent(0);
    }
  };

  const presentPct = useMemo(
    () => (total > 0 ? (present / total) * 100 : 0),
    [present, total]
  );
  const absentPct = Math.max(0, 100 - presentPct);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today’s Attendance</Text>
      <View style={styles.card}>
        <AnimatedCircularProgress
          size={220}
          width={18}
          fill={safePct(presentPct)}
          tintColor="#27AE60"
          backgroundColor="#EB5757"
          rotation={0}
          lineCap="round"
        >
          {() => (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.bigPct}>{safePct(presentPct)}%</Text>
              <Text style={styles.midText}>Present</Text>
              <Text style={styles.smallText}>
                {present} / {total}
              </Text>
            </View>
          )}
        </AnimatedCircularProgress>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#27AE60" }]} />
            <Text style={styles.legendText}>
              Present {safePct(presentPct)}%
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#EB5757" }]} />
            <Text style={styles.legendText}>
              Absent {safePct(absentPct)}%
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  title: { fontSize: 20, fontWeight: "800", margin: 16, color: "#2D3436" },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 3,
  },
  bigPct: { fontSize: 36, fontWeight: "800", color: "#27AE60" },
  midText: { fontSize: 16, color: "#2D3436" },
  smallText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  legendRow: { flexDirection: "row", gap: 20, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText: { color: "#374151" },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
