import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://192.168.29.83:5000";
const WARDEN_API = `${API_URL}/api/leave`; // adjust if mounted elsewhere

type Status = "pending" | "approved" | "rejected";
type Tab = "all" | Status | "cancelled";

type LeaveItem = {
  _id: string;
  leaveType: "casual" | "medical" | "emergency";
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  status: Status | "cancelled";
  createdAt: string;
  student?: {
    _id: string;
    studentName?: string; // <-- from Student collection
    name?: string; // optional fallback
    email?: string;
    rollNo?: string;
    year?: string; // <-- add year
    blockName?: string;
  };
};

const TABS: Tab[] = ["all", "pending", "approved", "rejected", "cancelled"];

// helpers
const shortDate = (iso: string) => new Date(iso).toDateString();
const displayStudentName = (s?: { studentName?: string; name?: string }) =>
  s?.studentName || s?.name || "Student";
const displayStudentTriple = (s?: {
  studentName?: string;
  name?: string;
  rollNo?: string;
  year?: string;
}) => {
  const nm = displayStudentName(s);
  const parts: string[] = [];
  if (s?.rollNo) parts.push(s.rollNo);
  parts.push(nm);
  if (s?.year) parts.push(s.year);
  return parts.join(" • ");
};

export default function WardenLeaveDashboard() {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const pendingActionRef = useRef<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);

  const headerAuth = async () => {
    const token = await AsyncStorage.getItem("wardenToken");
    if (!token) throw new Error("Missing warden token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const load = async (_page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const headers = await headerAuth();

      // Build query: omit status on "all" so backend returns every status
      const params = new URLSearchParams({ page: String(_page), limit: "10" });
      if (tab !== "all") {
        params.append("status", tab);
      } else {
        params.append("status", "all"); // <-- send explicit "all"
      }

      const res = await fetch(`${WARDEN_API}?${params.toString()}`, {
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to load leave requests");
        if (!append) {
          setItems([]);
          setPage(1);
          setPages(1);
        }
        return;
      }

      let newItems: LeaveItem[] = data?.items || [];
      setPage(data?.page || _page);
      setPages(data?.pages || 1);
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
    } catch (e: any) {
      Alert.alert("Auth", e?.message || "Please login again as warden.");
      if (!append) {
        setItems([]);
        setPage(1);
        setPages(1);
      }
    } finally {
      if (!append) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  useEffect(() => {
    // when tab changes, reload from page 1
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadMore = () => {
    if (loading) return;
    if (page >= pages) return;
    load(page + 1, true);
  };

  // include year in search as well
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const sname = it.student?.studentName?.toLowerCase() || "";
      const name = it.student?.name?.toLowerCase() || "";
      const email = it.student?.email?.toLowerCase() || "";
      const roll = it.student?.rollNo?.toLowerCase() || "";
      const year = it.student?.year?.toLowerCase() || "";
      const reason = it.reason?.toLowerCase() || "";
      const type = it.leaveType?.toLowerCase() || "";
      return (
        sname.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        roll.includes(q) ||
        year.includes(q) ||
        reason.includes(q) ||
        type.includes(q)
      );
    });
  }, [items, search]);

  const statusPillStyle = (status: LeaveItem["status"]) => {
    const base: any = styles.badge;
    if (status === "approved")
      return [
        base,
        {
          backgroundColor: "#e8f5e9",
          borderColor: "#2e7d32",
          color: "#2e7d32",
        },
      ];
    if (status === "rejected")
      return [
        base,
        {
          backgroundColor: "#ffebee",
          borderColor: "#c62828",
          color: "#c62828",
        },
      ];
    if (status === "cancelled")
      return [
        base,
        {
          backgroundColor: "#eceff1",
          borderColor: "#607d8b",
          color: "#607d8b",
        },
      ];
    return [
      base,
      { backgroundColor: "#fff8e1", borderColor: "#f9a825", color: "#f57f17" },
    ]; // pending
  };

  const decide = async (
    id: string,
    action: "approve" | "reject",
    comment?: string
  ) => {
    try {
      setDecidingId(id);
      const headers = await headerAuth();
      const res = await fetch(`${WARDEN_API}/${id}/decision`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to update leave");
        return;
      }
      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it._id === id
            ? { ...it, status: action === "approve" ? "approved" : "rejected" }
            : it
        )
      );
    } catch (e: any) {
      Alert.alert("Auth", e?.message || "Please login again as warden.");
    } finally {
      setDecidingId(null);
      setRejectModalOpen(false);
      setRejectComment("");
      pendingActionRef.current = null;
    }
  };

  const confirmApprove = (id: string) => {
    Alert.alert("Approve Leave", "Approve this leave request?", [
      { text: "No" },
      { text: "Approve", onPress: () => decide(id, "approve") },
    ]);
  };

  const openReject = (id: string) => {
    pendingActionRef.current = { id, action: "reject" };
    setRejectComment("");
    setRejectModalOpen(true);
  };

  const submitReject = () => {
    const ctx = pendingActionRef.current;
    if (!ctx) return setRejectModalOpen(false);
    decide(ctx.id, "reject", rejectComment.trim());
  };

  const renderItem = ({ item }: { item: LeaveItem }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>
            {item.leaveType.toUpperCase()} • {item.numberOfDays} day
            {item.numberOfDays !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.subtle}>
            {shortDate(item.fromDate)} → {shortDate(item.toDate)}
          </Text>
          {/* RollNo • StudentName • Year */}
          <Text style={styles.subtle}>
            {displayStudentTriple(item.student)}
          </Text>
        </View>
        <Text style={statusPillStyle(item.status)}>
          {item.status.toUpperCase()}
        </Text>
      </View>

      {!!item.reason && (
        <Text style={styles.reason} numberOfLines={3}>
          {item.reason}
        </Text>
      )}

      {item.status === "pending" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => confirmApprove(item._id)}
            style={[styles.actionBtn, styles.approveBtn]}
            disabled={decidingId === item._id}
          >
            {decidingId === item._id ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.actionBtnText}>Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openReject(item._id)}
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={decidingId === item._id}
          >
            <Text style={[styles.actionBtnText, { color: "#c62828" }]}>
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>
          All Leave Requests
        </Text>
        <Text style={{ color: "#607d8b", marginTop: 2 }}>
          Review and take action on student leave applications
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by rollNo / name / year / reason / type"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

      {/* List */}
      {loading && items.length === 0 ? (
        <View style={{ paddingTop: 24, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListFooterComponent={
            page < pages ? (
              <TouchableOpacity onPress={loadMore} style={styles.loadMoreBtn}>
                <Text style={{ fontWeight: "700" }}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
              No {tab} requests found.
            </Text>
          }
        />
      )}

      {/* Reject modal */}
      <Modal
        visible={rejectModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
              Reject Leave
            </Text>
            <TextInput
              placeholder="Optional comment (reason)"
              value={rejectComment}
              onChangeText={setRejectComment}
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setRejectModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: "#eceff1" }]}
              >
                <Text style={{ fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReject}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#ffebee",
                    borderWidth: 1,
                    borderColor: "#e57373",
                  },
                ]}
              >
                {decidingId && pendingActionRef.current?.id === decidingId ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#c62828" }}>
                    Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cfd8dc",
    backgroundColor: "#eceff1",
  },
  tabActive: { backgroundColor: "#bbdefb", borderColor: "#90caf9" },
  tabText: { fontWeight: "700", color: "#37474f" },
  tabTextActive: { color: "#0d47a1" },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "700" },
  subtle: { color: "#555", marginTop: 2 },
  reason: { marginTop: 8, color: "#333" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
    alignSelf: "flex-start",
  },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  approveBtn: { backgroundColor: "#e8f5e9", borderColor: "#81c784" },
  rejectBtn: { backgroundColor: "#ffebee", borderColor: "#e57373" },
  actionBtnText: { fontWeight: "700" },

  loadMoreBtn: {
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cfd8dc",
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 90,
    backgroundColor: "#fafafa",
    marginBottom: 14,
  },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
});
