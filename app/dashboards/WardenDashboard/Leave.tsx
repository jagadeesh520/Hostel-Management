import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LeaveItem = {
  _id: string;
  leaveType: "casual" | "medical" | "emergency";
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  student?: { _id: string; name?: string; email?: string; rollNo?: string };
};

const BASE_URL = "https://api.sjtechsol.com";
const PAGE_SIZE = 12;
const TABS = ["all", "pending", "approved", "rejected"] as const;
type Tab = typeof TABS[number];

export default function WardenLeaveDashboard() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>(""); // For visual debugging

  const shortDate = (iso: string) => new Date(iso).toDateString();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const name = it.student?.name?.toLowerCase() || "";
      const email = it.student?.email?.toLowerCase() || "";
      const roll = it.student?.rollNo?.toLowerCase() || "";
      const reason = it.reason?.toLowerCase() || "";
      const type = it.leaveType?.toLowerCase() || "";
      return name.includes(q) || email.includes(q) || roll.includes(q) || reason.includes(q) || type.includes(q);
    });
  }, [items, search]);

  const authHeader = async () => {
    const token = await AsyncStorage.getItem("wardenToken");
    if (!token) throw new Error("Warden not logged in.");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchLeaves = async (_page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const headers = await authHeader();
      const params: any = { page: _page, limit: PAGE_SIZE };
      
      // Only add status parameter if tab is NOT "all"
      if (tab !== "all") {
        params.status = tab;
      }

      // Visual debugging - show what params are being sent
      setDebugInfo(`Fetching: tab=${tab}, page=${_page}, status=${params.status || "all"}`);

      const res = await axios.get(`${BASE_URL}/api/leave`, {
        headers,
        params,
        validateStatus: () => true,
      });

      // Visual debugging - show response info
      setDebugInfo(prev => `${prev}\nResponse: ${res.status}, Items: ${res.data?.items?.length || 0}`);

      if (res.status !== 200) {
        Alert.alert("Leaves error", res.data?.message || `HTTP ${res.status}`);
        if (!append) {
          setItems([]); setPage(1); setPages(1);
        }
        return;
      }

      const newItems: LeaveItem[] = res.data?.items || [];
      const totalPages = res.data?.pages || 1;
      setPages(totalPages);
      setPage(_page);
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      
      // Visual debugging - show final result
      setDebugInfo(prev => `${prev}\nLoaded: ${newItems.length} items, Total pages: ${totalPages}`);
    } catch (e: any) {
      // Visual debugging - show error
      setDebugInfo(prev => `${prev}\nError: ${e.message}`);
      Alert.alert("Error", e?.message || "Failed to load leaves");
      if (!append) { setItems([]); setPage(1); setPages(1); }
    } finally {
      if (!append) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaves(1, false);
    setRefreshing(false);
  };

  useEffect(() => { 
    setDebugInfo(`Tab changed to: ${tab}`);
    fetchLeaves(1, false); 
  }, [tab]);

  const loadMore = () => {
    if (loading) return;
    if (page >= pages) return;
    fetchLeaves(page + 1, true);
  };

  const statusPill = (status: LeaveItem["status"]) => {
    const base: any = styles.badge;
    if (status === "approved") return [base, { backgroundColor: "#e8f5e9", borderColor: "#2e7d32", color: "#2e7d32" }];
    if (status === "rejected") return [base, { backgroundColor: "#ffebee", borderColor: "#c62828", color: "#c62828" }];
    if (status === "cancelled") return [base, { backgroundColor: "#eceff1", borderColor: "#607d8b", color: "#607d8b" }];
    return [base, { backgroundColor: "#fff8e1", borderColor: "#f9a825", color: "#f57f17" }];
  };

  const decide = async (id: string, action: "approve" | "reject") => {
    try {
      setDecidingId(id);
      const headers = await authHeader();
      const res = await axios.patch(
        `${BASE_URL}/api/leave/${id}/decision`,
        { action },
        { headers, validateStatus: () => true }
      );
      if (res.status !== 200) {
        Alert.alert("Error", res.data?.message || "Failed to update");
        return;
      }
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, status: action === "approve" ? "approved" : "rejected" } : it)));
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Unable to update leave");
    } finally {
      setDecidingId(null);
    }
  };

  const renderItem = ({ item }: { item: LeaveItem }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>
            {item.leaveType.toUpperCase()} • {item.numberOfDays} day{item.numberOfDays !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.subtle}>{shortDate(item.fromDate)} → {shortDate(item.toDate)}</Text>
          <Text style={styles.subtle}>{item.student?.name || "Student"} {item.student?.rollNo ? `• ${item.student.rollNo}` : ""}</Text>
        </View>
        <Text style={statusPill(item.status) as any}>{item.status.toUpperCase()}</Text>
      </View>
      {!!item.reason && <Text style={styles.reason} numberOfLines={3}>{item.reason}</Text>}
      {item.status === "pending" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => decide(item._id, "approve")} style={[styles.actionBtn, styles.approveBtn]} disabled={decidingId === item._id}>
            {decidingId === item._id ? <ActivityIndicator /> : <Text style={styles.actionBtnText}>Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => decide(item._id, "reject")} style={[styles.actionBtn, styles.rejectBtn]} disabled={decidingId === item._id}>
            <Text style={[styles.actionBtnText, { color: "#c62828" }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F7FB" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>All Leave Requests</Text>
        <Text style={{ color: "#607d8b", marginTop: 2 }}>Review student leave applications</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Debug Info - Visible on screen */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText} numberOfLines={3}>
          {debugInfo}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by name / email / rollNo / reason"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.25}
          onEndReached={loadMore}
          ListFooterComponent={
            page < pages ? (
              <TouchableOpacity onPress={loadMore} style={styles.loadMoreBtn}>
                <Text style={{ fontWeight: "700" }}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={<Text style={{ textAlign: "center", color: "#666", marginTop: 16 }}>No leaves found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#cfd8dc", backgroundColor: "#eceff1" },
  tabActive: { backgroundColor: "#bbdefb", borderColor: "#90caf9" },
  tabText: { fontWeight: "700", color: "#37474f" },
  tabTextActive: { color: "#0d47a1" },

  // Debug styles
  debugContainer: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  debugText: {
    fontSize: 10,
    color: "#666",
  },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  searchInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },

  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#eee", elevation: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  subtle: { color: "#555", marginTop: 2 },
  reason: { marginTop: 8, color: "#333" },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, overflow: "hidden", fontSize: 12, fontWeight: "700", alignSelf: "flex-start" },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  approveBtn: { backgroundColor: "#e8f5e9", borderColor: "#81c784" },
  rejectBtn: { backgroundColor: "#ffebee", borderColor: "#e57373" },
  actionBtnText: { fontWeight: "700" },

  loadMoreBtn: { alignSelf: "center", marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 8, backgroundColor: "#eceff1" },
});