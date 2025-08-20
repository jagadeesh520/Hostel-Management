import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Warden = { _id: string; name: string; block: string };

type IssueTicket = {
  _id: string;
  issueType: string;
  description: string;
  rollNo: string;
  imagePath?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedWarden?: string | { _id: string; name?: string; block?: string };
  resolutionImage?: string;
};

type AttendanceListItem = {
  studentId: string;
  studentName: string;
  roomNo: string;
  status: "Present" | "Absent" | "NotMarked";
  marked: boolean;
  blockName: string;
};

const BASE_URL = "http://192.168.29.83:5000";

export default function WardenDashboard() {
  const router = useRouter();

  const [wardens, setWardens] = useState<Warden[]>([]);
  const [tickets, setTickets] = useState<IssueTicket[]>([]);
  const [menuCount, setMenuCount] = useState(0);

  const [totalStudents, setTotalStudents] = useState(0);
  const [presentStudents, setPresentStudents] = useState(0);
  const [absentStudents, setAbsentStudents] = useState(0);

  useEffect(() => { fetchAll(); }, []);
  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const todayIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const toLower = (s?: string) => (s || "").toLowerCase();

  const getAssignedName = (t: IssueTicket) => {
    if (!t.assignedWarden) return "Unassigned";
    if (typeof t.assignedWarden !== "string") {
      return t.assignedWarden.name
        ? `${t.assignedWarden.name}${t.assignedWarden.block ? ` (${t.assignedWarden.block})` : ""}`
        : "Assigned";
    }
    const w = wardens.find((x) => x._id === t.assignedWarden);
    return w ? `${w.name}${w.block ? ` (${w.block})` : ""}` : "Assigned";
  };

  const fetchAll = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const headers = { Authorization: `Bearer ${token}` };

      // Wardens (for names beside tickets)
      try {
        const w = await axios.get(`${BASE_URL}/api/wardens`, { headers });
        setWardens(Array.isArray(w.data) ? w.data : []);
      } catch {
        setWardens([]);
      }

      // Tickets: ALWAYS get ALL (no filtering)
      try {
        // Pick the route that exists in your backend
        const res = await axios.get<IssueTicket[]>(
          `${BASE_URL}/api/issueTicket/tickets`,
          { headers }
        );
        setTickets(Array.isArray(res.data) ? res.data : []);
      } catch {
        // fallback to very generic path if first fails
        try {
          const res2 = await axios.get<IssueTicket[]>(`${BASE_URL}/api/tickets`, { headers });
          setTickets(Array.isArray(res2.data) ? res2.data : []);
        } catch {
          setTickets([]);
          console.warn("Could not load tickets (tried /issueTicket/tickets and /tickets)");
        }
      }

      // Menu (today)
      try {
        const date = todayIST();
        const res = await axios.get(`${BASE_URL}/api/menu`, { params: { date }, headers });
        setMenuCount((res.data?.items || []).length);
      } catch {
        setMenuCount(0);
      }

      // Attendance (today)
      try {
        const date = todayIST();
        const aList = await axios.get<AttendanceListItem[]>(
          `${BASE_URL}/api/attendance/list?date=${date}`,
          { headers }
        );
        const list = aList.data || [];
        const total = list.length;
        const present = list.filter((x) => x.status === "Present").length;
        const absent = total - present; // NotMarked counted as absent
        setTotalStudents(total);
        setPresentStudents(present);
        setAbsentStudents(absent);
      } catch {
        setTotalStudents(0);
        setPresentStudents(0);
        setAbsentStudents(0);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load dashboard.");
    }
  };

  // derived: counts & attendance
  const issuesTotal = tickets.length;
  const issuesResolved = tickets.filter((t) => toLower(t.status) === "resolved").length;
  const issuesPending = issuesTotal - issuesResolved;

  const presentPct = useMemo(
    () => (totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0),
    [presentStudents, totalStudents]
  );
  const absentPct = useMemo(
    () => (totalStudents > 0 ? (absentStudents / totalStudents) * 100 : 0),
    [absentStudents, totalStudents]
  );

  const handleLogout = async () => {
    try { await AsyncStorage.multiRemove(["wardenToken", "wardenProfileId"]); } catch {}
    router.replace("/(tabs)/Admin/admin-login");
  };

  const Card = ({
    title, value, color, icon, onPress,
  }: { title: string; value: string | number; color: string; icon: string; onPress: () => void; }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={icon as any} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show just ONE ticket preview (most recent pending if possible, else most recent)
  const previewTicket =
    tickets.find((t) => toLower(t.status) !== "resolved") || tickets[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.header}>Warden Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: "#8B5CF6" }]}
            onPress={() => router.push("/dashboards/WardenDashboard/AddMenu")}
          >
            <MaterialCommunityIcons name="plus-box" size={18} color="#fff" />
            <Text style={styles.quickText}>Add Today’s Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: "#EF4444" }]}
            onPress={() => router.push("/dashboards/WardenDashboard/CreateIssue")}
          >
            <MaterialCommunityIcons name="alert-plus" size={18} color="#fff" />
            <Text style={styles.quickText}>Create Request</Text>
          </TouchableOpacity>
        </View>

        {/* Top cards */}
        <View style={styles.grid}>
          <Card
            title="Blocks"
            value={wardens.length}
            color="#6FCF97"
            icon="office-building"
            onPress={() => router.push("/dashboards/WardenDashboard/BlocksChild")}
          />
          <Card
            title="Today’s Menu"
            value={menuCount}
            color="#F2994A"
            icon="silverware-fork-knife"
            onPress={() => router.push("/dashboards/WardenDashboard/MenuChild")}
          />
          <Card
            title="Issues (Pending/Total)"
            value={`${issuesPending}/${issuesTotal}`}
            color="#EB5757"
            icon="alert-circle-outline"
            onPress={() => router.push("/dashboards/WardenDashboard/WardenTickets")}
          />
          <Card
            title="Attendance"
            value={`${presentStudents}/${totalStudents}`}
            color="#56CCF2"
            icon="account-check-outline"
            onPress={() => router.push("/dashboards/WardenDashboard/AttendanceChild")}
          />
        </View>

        {/* Single ticket preview + See all */}
        <View style={styles.issuesListCard}>
          <View style={styles.issuesListHeader}>
            <Text style={styles.issuesListTitle}>Issue</Text>
            <TouchableOpacity onPress={() => router.push("/dashboards/WardenDashboard/WardenTickets")}>
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>

          {!previewTicket ? (
            <Text style={styles.emptyText}>No tickets to show.</Text>
          ) : (
            <TouchableOpacity
              style={styles.ticketRow}
              onPress={() => router.push("/dashboards/WardenDashboard/WardenTickets")}
              activeOpacity={0.9}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketTitle}>{previewTicket.issueType || "Issue"}</Text>
                <Text style={styles.ticketSub}>
                  {getAssignedName(previewTicket)} • #{previewTicket.rollNo || "--"}
                </Text>
                {previewTicket.description ? (
                  <Text style={[styles.ticketSub, { marginTop: 4 }]} numberOfLines={2}>
                    {previewTicket.description}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Attendance */}
        <View style={styles.attendanceCard}>
          <Text style={styles.sectionTitle}>Today’s Attendance Status</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Present</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${presentPct}%`, backgroundColor: "#27AE60" }]} />
            </View>
            <Text style={styles.progressValue}>{presentPct.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Absent</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${absentPct}%`, backgroundColor: "#EB5757" }]} />
            </View>
            <Text style={styles.progressValue}>{absentPct.toFixed(0)}%</Text>
          </View>
          <Text style={styles.smallText}>
            {presentStudents} Present / {absentStudents} Absent / {totalStudents} Total
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  welcome: { textTransform: "uppercase", color: "#9AA0A6", fontSize: 12, letterSpacing: 1 },
  header: { fontSize: 22, fontWeight: "700", color: "#2D3436" },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 12 },
  logoutText: { color: "#fff", fontWeight: "700" },

  quickRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 10, marginBottom: 6 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, elevation: 2 },
  quickText: { color: "#fff", fontWeight: "700" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 8 },
  card: { width: "48%", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 4 },
  cardRow: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  iconBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#fff", fontSize: 12, opacity: 0.95, marginBottom: 2 },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "800" },

  issuesListCard: { marginTop: 10, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 14, padding: 14, elevation: 2 },
  issuesListHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  issuesListTitle: { fontWeight: "800", color: "#111827", fontSize: 16 },
  linkText: { color: "#2563EB", fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#6B7280", fontStyle: "italic", marginVertical: 12 },

  ticketRow: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },

  ticketTitle: { fontWeight: "800", color: "#111827" },
  ticketSub: { color: "#6B7280", marginTop: 2 },

  attendanceCard: { marginTop: 12, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2D3436", marginBottom: 10 },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  progressLabel: { width: 70, fontSize: 14, color: "#374151", fontWeight: "600" },
  progressBarTrack: { flex: 1, height: 12, backgroundColor: "#E5E7EB", borderRadius: 6, overflow: "hidden", marginHorizontal: 8 },
  progressBarFill: { height: "100%", borderRadius: 6 },
  progressValue: { width: 40, fontSize: 13, fontWeight: "600", textAlign: "right" },
  smallText: { fontSize: 12, color: "#6B7280", marginTop: 8, textAlign: "center" },
});
