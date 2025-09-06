import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
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

type LeaveItem = {
  _id: string;
  leaveType: "casual" | "medical" | "emergency";
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  student?: {
    _id: string;
    studentName?: string; // <- DB field
    name?: string; // optional fallback
    email?: string;
    rollNo?: string;
    blockName?: string;
  };
};

//const BASE_URL = "https://api.sjtechsol.com";

// ---------- helpers ----------
const shortDate = (iso?: string) => (iso ? new Date(iso).toDateString() : "");
const displayStudentName = (s?: { studentName?: string; name?: string }) =>
  s?.studentName || s?.name || "Student";
const displayStudentLine = (s?: {
  studentName?: string;
  name?: string;
  rollNo?: string;
  blockName?: string;
}) => {
  const nm = displayStudentName(s);
  const parts = [nm];
  if (s?.rollNo) parts.push(s.rollNo);
  if (s?.blockName) parts.push(s.blockName);
  return parts.join(" • ");
};

export default function WardenDashboard() {
  const router = useRouter();

  const [wardens, setWardens] = useState<Warden[]>([]);
  const [tickets, setTickets] = useState<IssueTicket[]>([]);
  const [menuCount, setMenuCount] = useState(0);

  const [totalStudents, setTotalStudents] = useState(0);
  const [presentStudents, setPresentStudents] = useState(0);
  const [absentStudents, setAbsentStudents] = useState(0);

  // Leaves UI state
  const [leavesPendingCount, setLeavesPendingCount] = useState(0);
  const [latestPendingLeave, setLatestPendingLeave] =
    useState<LeaveItem | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const flag = await AsyncStorage.getItem("flash:wardenLoggedIn");
        if (alive && flag === "1") {
          await AsyncStorage.removeItem("flash:wardenLoggedIn");
          setTimeout(() => {
            Toast.show({ type: "success", text1: "Login successful 🎉" });
          }, 50);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

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
        ? `${t.assignedWarden.name}${
            t.assignedWarden.block ? ` (${t.assignedWarden.block})` : ""
          }`
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
        const w = await axios.get(`${API_BASE_URL}/api/wardens`, { headers });
        setWardens(Array.isArray(w.data) ? w.data : []);
      } catch {
        setWardens([]);
      }

      // Tickets: ALWAYS get ALL (no filtering)
      try {
        const res = await axios.get<IssueTicket[]>(
          `${API_BASE_URL}/api/issueTicket/tickets`,
          { headers }
        );
        setTickets(Array.isArray(res.data) ? res.data : []);
      } catch {
        try {
          const res2 = await axios.get<IssueTicket[]>(
            `${API_BASE_URL}/api/tickets`,
            {
              headers,
            }
          );
          setTickets(Array.isArray(res2.data) ? res2.data : []);
        } catch {
          setTickets([]);
          console.warn(
            "Could not load tickets (tried /issueTicket/tickets and /tickets)"
          );
        }
      }

      // Menu (today)
      try {
        const date = todayIST();
        const res = await axios.get(`${API_BASE_URL}/api/menu`, {
          params: { date },
          headers,
        });
        setMenuCount((res.data?.items || []).length);
      } catch {
        setMenuCount(0);
      }

      // Attendance (today)
      try {
        const date = todayIST();
        const aList = await axios.get<AttendanceListItem[]>(
          `${API_BASE_URL}/api/attendance/list?date=${date}`,
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

      // Leaves (pending summary + latest pending preview)
      try {
        const resLeaves = await axios.get(`${API_BASE_URL}/api/leave`, {
          headers,
          params: { status: "pending", page: 1, limit: 5 },
          validateStatus: () => true,
        });
        if (resLeaves.status !== 200) {
          Alert.alert(
            "Leaves error",
            resLeaves.data?.message || `HTTP ${resLeaves.status}`
          );
          setLeavesPendingCount(0);
          setLatestPendingLeave(null);
        } else {
          const items: LeaveItem[] = resLeaves.data?.items || [];
          const total: number = resLeaves.data?.total || 0;
          setLeavesPendingCount(total);
          setLatestPendingLeave(items[0] || null);
        }
      } catch (e) {
        setLeavesPendingCount(0);
        setLatestPendingLeave(null);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load dashboard.");
    }
  };

  // derived: counts & attendance
  const issuesTotal = tickets.length;
  const issuesResolved = tickets.filter(
    (t) => toLower(t.status) === "resolved"
  ).length;
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
    try {
      await AsyncStorage.multiRemove(["wardenToken", "wardenProfileId"]);
    } catch {}
    router.replace("/(tabs)/Admin/admin-login");
  };

  // Approve/Reject leave
  const approveLeave = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.patch(
        `${API_BASE_URL}/api/leave/${id}/decision`,
        { action: "approve" },
        { headers, validateStatus: () => true }
      );
      if (res.status !== 200) {
        return Alert.alert("Error", res.data?.message || "Failed to approve");
      }
      Toast.show({ type: "success", text1: "Leave approved" });
      fetchAll();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to approve");
    }
  };

  const rejectLeave = async (id: string) => {
    Alert.alert("Reject Leave", "Are you sure you want to reject this leave?", [
      { text: "No" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("wardenToken");
            if (!token) return Alert.alert("Error", "Warden not logged in.");
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.patch(
              `${API_BASE_URL}/api/leave/${id}/decision`,
              { action: "reject", comment: "Rejected by warden" },
              { headers, validateStatus: () => true }
            );
            if (res.status !== 200) {
              return Alert.alert(
                "Error",
                res.data?.message || "Failed to reject"
              );
            }
            Toast.show({ type: "success", text1: "Leave rejected" });
            fetchAll();
          } catch (e: any) {
            Alert.alert(
              "Error",
              e?.response?.data?.message || "Failed to reject"
            );
          }
        },
      },
    ]);
  };

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

      <ScrollView contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 80 }} >
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
            onPress={() =>
              router.push("/dashboards/WardenDashboard/CreateIssue")
            }
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
            onPress={() =>
              router.push("/dashboards/WardenDashboard/BlocksChild")
            }
          />
          <Card
            title="Today’s Menu"
            value={menuCount}
            color="#F2994A"
            icon="silverware-fork-knife"
            onPress={() => router.push("/dashboards/WardenDashboard/MenuChild")}
          />
          <Card
            title="Issues"
            value={`${issuesPending}/${issuesTotal}`}
            color="#EB5757"
            icon="alert-circle-outline"
            onPress={() =>
              router.push("/dashboards/WardenDashboard/WardenTickets")
            }
          />
          {/* NEW: Leaves card */}
          <Card
            title="Leaves"
            value={leavesPendingCount}
            color="#8B5CF6"
            icon="calendar-clock"
            onPress={() =>
              router.push("/dashboards/WardenDashboard/WardenLeaveDashboard")
            }
          />
          {/* <Card
            title="Attendance"
            value={`${presentStudents}/${totalStudents}`}
            color="#56CCF2"
            icon="account-check-outline"
            onPress={() =>
              router.push("/dashboards/WardenDashboard/AttendanceChild")
            }
          /> */}
          <Card
            title="Rooms"
            value={wardens.length}
            color="#3B82F6"
            icon="bed-outline"
            onPress={() =>
              router.push("/dashboards/WardenDashboard/WardenAddFloor")
            }
          />
          <Card
            title="Hostels"
            value="Details"
            color="#FBBF24"
            icon="home-city"
            onPress={() =>
              router.push("/dashboards/WardenDashboard/WardenHostelView")
            }
          />
        </View>

        {/* Single ticket preview + See all */}
        <View style={styles.issuesListCard}>
          <View className="issuesListHeader" style={styles.issuesListHeader}>
            <Text style={styles.issuesListTitle}>Issue</Text>
            <TouchableOpacity
              onPress={() =>
                router.push("/dashboards/WardenDashboard/WardenTickets")
              }
            >
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>

          {!previewTicket ? (
            <Text style={styles.emptyText}>No tickets to show.</Text>
          ) : (
            <TouchableOpacity
              style={styles.ticketRow}
              onPress={() =>
                router.push("/dashboards/WardenDashboard/WardenTickets")
              }
              activeOpacity={0.9}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketTitle}>
                  {previewTicket.issueType || "Issue"}
                </Text>
                <Text style={styles.ticketSub}>
                  {getAssignedName(previewTicket)} • #
                  {previewTicket.rollNo || "--"}
                </Text>
                {previewTicket.description ? (
                  <Text
                    style={[styles.ticketSub, { marginTop: 4 }]}
                    numberOfLines={2}
                  >
                    {previewTicket.description}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* NEW: Latest Leave preview + See all */}
        <View style={styles.issuesListCard}>
          <View style={styles.issuesListHeader}>
            <Text style={styles.issuesListTitle}>Latest Leave Request</Text>
            <TouchableOpacity
              onPress={() =>
                router.push("/dashboards/WardenDashboard/WardenLeaveDashboard")
              }
            >
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>

          {!latestPendingLeave ? (
            <Text style={styles.emptyText}>No pending leave requests.</Text>
          ) : (
            <View style={styles.ticketRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketTitle}>
                  {latestPendingLeave.leaveType.toUpperCase()} •{" "}
                  {latestPendingLeave.numberOfDays} day
                  {latestPendingLeave.numberOfDays !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.ticketSub}>
                  {shortDate(latestPendingLeave.fromDate)} →{" "}
                  {shortDate(latestPendingLeave.toDate)}
                </Text>
                <Text style={styles.ticketSub}>
                  {displayStudentLine(latestPendingLeave.student)}
                </Text>
                {latestPendingLeave.reason ? (
                  <Text
                    style={[styles.ticketSub, { marginTop: 4 }]}
                    numberOfLines={2}
                  >
                    {latestPendingLeave.reason}
                  </Text>
                ) : null}
              </View>

              {/* Quick actions */}
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => approveLeave(latestPendingLeave._id)}
                >
                  <Text style={{ fontWeight: "700", color: "#2e7d32" }}>
                    Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => rejectLeave(latestPendingLeave._id)}
                >
                  <Text style={{ fontWeight: "700", color: "#c62828" }}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Attendance */}
        <View style={styles.attendanceCard}>
          <Text style={styles.sectionTitle}>Today’s Attendance Status</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Present</Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${presentPct}%`, backgroundColor: "#27AE60" },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>{presentPct.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Absent</Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${absentPct}%`, backgroundColor: "#EB5757" },
                ]}
              />
            </View>
            <Text style={styles.progressValue}>{absentPct.toFixed(0)}%</Text>
          </View>
          <Text style={styles.smallText}>
            {presentStudents} Present / {absentStudents} Absent /{" "}
            {totalStudents} Total
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Card = ({
  title,
  value,
  color,
  icon,
  onPress,
}: {
  title: string;
  value: string | number;
  color: string;
  icon: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.card, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.9}
  >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  welcome: {
    textTransform: "uppercase",
    color: "#9AA0A6",
    fontSize: 12,
    letterSpacing: 1,
  },
  header: { fontSize: 22, fontWeight: "700", color: "#2D3436" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 12,
  },
  logoutText: { color: "#fff", fontWeight: "700" },

  quickRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2,
  },
  quickText: { color: "#fff", fontWeight: "700" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  card: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
  },
  cardRow: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#fff", fontSize: 12, opacity: 0.95, marginBottom: 2 },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "800" },

  issuesListCard: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  issuesListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  issuesListTitle: { fontWeight: "800", color: "#111827", fontSize: 16 },
  linkText: { color: "#2563EB", fontWeight: "700" },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    fontStyle: "italic",
    marginVertical: 12,
  },

  ticketRow: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  ticketTitle: { fontWeight: "800", color: "#111827" },
  ticketSub: { color: "#6B7280", marginTop: 2 },

  // Leave quick-action buttons
  approveBtn: {
    backgroundColor: "#e8f5e9",
    borderColor: "#81c784",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: "#ffebee",
    borderColor: "#ef9a9a",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  attendanceCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 10,
  },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  progressLabel: {
    width: 70,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  progressBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  progressBarFill: { height: "100%", borderRadius: 6 },
  progressValue: {
    width: 40,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  smallText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});
