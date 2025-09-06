import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Ticket = {
  _id: string;
  issueType: string;
  description: string;
  rollNo: string;
  imagePath?: string;
  resolutionImage?: string;
  status: "Pending" | "Assigned" | "WardenFixed" | "Resolved" | string;
  createdAt?: string;
  assignedWarden?: string | { _id: string; name: string; block?: string };
};

type Warden = { _id: string; name: string; block: string };

const AdminTicketScreen = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignWardenId, setAssignWardenId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "assigned" | "wardenfixed" | "resolved"
  >("all");

  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadAll();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const getAdminHeaders = async () => {
    const adminToken = await AsyncStorage.getItem("adminToken");
    return adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers = await getAdminHeaders();

      // Wardens
      try {
        const resW = await axios.get<Warden[]>(`${API_BASE_URL}/api/wardens`, {
          headers,
        });
        setWardens(Array.isArray(resW.data) ? resW.data : []);
      } catch (e) {
        console.warn("Wardens fetch failed", e);
        setWardens([]);
      }

      // Tickets (admin can see all)
      try {
        const resT = await axios.get<Ticket[]>(
          `${API_BASE_URL}/api/issueTicket/tickets`,
          { headers }
        );
        setTickets(Array.isArray(resT.data) ? resT.data : []);
      } catch (e) {
        console.warn("Tickets fetch failed", e);
        setTickets([]);
        Alert.alert(
          "Error",
          "Could not load tickets. Check `/api/issueTicket/tickets` route."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  // Map wardenId -> name for quick lookup
  const wardenNameById = useMemo(() => {
    const map: Record<string, string> = {};
    wardens.forEach(
      (w) => (map[w._id] = `${w.name}${w.block ? ` (${w.block})` : ""}`)
    );
    return map;
  }, [wardens]);

  const prettyStatus = (s?: string) => {
    const x = (s || "").toLowerCase();
    if (x === "assigned") return "Assigned";
    if (x === "wardenfixed") return "Warden Fixed";
    if (x === "resolved") return "Resolved";
    return "Pending";
  };

  const badgeColor = (s?: string) => {
    const x = (s || "").toLowerCase();
    if (x === "assigned") return "#f59e0b"; // amber
    if (x === "wardenfixed") return "#8b5cf6"; // violet
    if (x === "resolved") return "#10b981"; // emerald
    return "#ef4444"; // red (pending)
  };

  const statusIcon = (s?: string) => {
    const x = (s || "").toLowerCase();
    if (x === "assigned") return "person";
    if (x === "wardenfixed") return "build";
    if (x === "resolved") return "check-circle";
    return "schedule";
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    const s = prettyStatus(t.status).toLowerCase();
    const matchesQuery =
      !q ||
      t.issueType?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.rollNo?.toLowerCase().includes(q);

    const matchesStatus =
      filterStatus === "all" ? true : s === filterStatus.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  const handleAssign = async () => {
    if (!selectedTicket) return;
    if (!assignWardenId) {
      Alert.alert("Select warden", "Please choose a warden to assign.");
      return;
    }
    try {
      const headers = await getAdminHeaders();
      const res = await axios.post(
        `${API_BASE_URL}/api/issueTicket/tickets/${selectedTicket._id}/assign`,
        { wardenId: assignWardenId },
        { headers }
      );

      // Update UI
      const updated = res.data as Ticket;
      setTickets((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );

      // also update currently selected ticket
      setSelectedTicket(updated);
      Alert.alert("Assigned", "Ticket assigned to warden.");
    } catch (e) {
      console.error("Assign failed:", e);
      Alert.alert("Error", "Failed to assign.");
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      const headers = await getAdminHeaders();
      const res = await axios.put(
        `${API_BASE_URL}/api/issueTicket/tickets/${selectedTicket._id}/resolve`,
        {},
        { headers }
      );

      const updated: Ticket =
        res?.data && res.data._id
          ? res.data
          : { ...selectedTicket, status: "Resolved" };

      setTickets((prev) =>
        prev.map((t) => (t._id === updated._id ? updated : t))
      );
      setSelectedTicket(updated);
      setModalVisible(false);
      Alert.alert("Success", "Ticket marked as resolved.");
    } catch (e) {
      console.error("Resolve failed:", e);
      Alert.alert("Error", "Failed to mark ticket as resolved.");
    }
  };

  const renderItem = ({ item }: { item: Ticket }) => {
    const s = prettyStatus(item.status);
    const assignedId =
      typeof item.assignedWarden === "string"
        ? item.assignedWarden
        : item.assignedWarden?._id;
    const assignedName =
      typeof item.assignedWarden === "object" && item.assignedWarden?.name
        ? `${item.assignedWarden.name}${
            (item.assignedWarden as any).block
              ? ` (${(item.assignedWarden as any).block})`
              : ""
          }`
        : assignedId
        ? wardenNameById[assignedId] || assignedId
        : undefined;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            borderLeftColor: badgeColor(s),
          },
        ]}
        onPress={() => {
          setSelectedTicket(item);
          setAssignWardenId(assignedId || "");
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <MaterialIcons name="report-problem" size={16} color="#6366f1" />
            <Text style={styles.cardTitle}>{item.issueType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor(s) }]}>
            <MaterialIcons name={statusIcon(s)} size={12} color="#fff" />
            <Text style={styles.statusText}>{s}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={12} color="#6b7280" />
            <Text style={styles.detailText}>Roll No: {item.rollNo}</Text>
          </View>

          {assignedName && (
            <View style={styles.detailRow}>
              <Ionicons name="shield" size={12} color="#6b7280" />
              <Text style={styles.detailText}>Assigned to: {assignedName}</Text>
            </View>
          )}

          {item.createdAt && (
            <View style={styles.detailRow}>
              <Ionicons name="time" size={12} color="#6b7280" />
              <Text style={styles.detailText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {(item.imagePath || item.resolutionImage) && (
          <View style={styles.imageContainer}>
            {item.imagePath && (
              <TouchableOpacity
                onPress={() => {
                  setZoomImageUri(`${API_BASE_URL}/uploads/faces/${item.imagePath}`);
                  setZoomVisible(true);
                }}
                style={styles.imageWrapper}
              >
                <Image
                  source={{
                    uri: `${API_BASE_URL}/uploads/faces/${item.imagePath}`,
                  }}
                  style={styles.image}
                />
                <Text style={styles.imageLabel}>Issue Image</Text>
              </TouchableOpacity>
            )}

            {item.resolutionImage && (
              <TouchableOpacity
                onPress={() => {
                  setZoomImageUri(
                    `${API_BASE_URL}/uploads/faces/${item.resolutionImage}`
                  );
                  setZoomVisible(true);
                }}
                style={styles.imageWrapper}
              >
                <Image
                  source={{
                    uri: `${API_BASE_URL}/uploads/faces/${item.resolutionImage}`,
                  }}
                  style={styles.image}
                />
                <Text style={styles.imageLabel}>Resolution Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      {/* Compact header with search and filter */}
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Button-based filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === 'all' && styles.filterButtonTextActive
            ]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'pending' && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === 'pending' && styles.filterButtonTextActive
            ]}>Pending</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'assigned' && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus('assigned')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === 'assigned' && styles.filterButtonTextActive
            ]}>Assigned</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'wardenfixed' && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus('wardenfixed')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === 'wardenfixed' && styles.filterButtonTextActive
            ]}>Warden Fixed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === 'resolved' && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus('resolved')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === 'resolved' && styles.filterButtonTextActive
            ]}>Resolved</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stats row */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tickets.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {tickets.filter(t => t.status === 'Pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {tickets.filter(t => t.status === 'Resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tickets found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No tickets have been reported yet'
              }
            </Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* Ticket modal (Assign & Resolve) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { marginBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Issue Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{selectedTicket.issueType}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedTicket.description}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Roll No:</Text>
                    <Text style={styles.detailValue}>{selectedTicket.rollNo}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badgeColor(selectedTicket.status) }]}>
                      <Text style={styles.statusText}>{prettyStatus(selectedTicket.status)}</Text>
                    </View>
                  </View>
                </View>

                {/* Assign area - Keep the dropdown picker here for warden assignment */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Assign to Warden</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={assignWardenId || ""}
                      onValueChange={(v) => setAssignWardenId(String(v))}
                    >
                      <Picker.Item label="Select a warden..." value="" />
                      {wardens.map((w) => (
                        <Picker.Item
                          key={w._id}
                          label={`${w.name} (${w.block})`}
                          value={w._id}
                        />
                      ))}
                    </Picker>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={handleAssign}
                    disabled={!assignWardenId}
                  >
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Assign to Warden</Text>
                  </TouchableOpacity>
                </View>

                {/* Action buttons */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Ticket Actions</Text>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.resolveButton]}
                    onPress={handleResolve}
                  >
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      {zoomVisible && zoomImageUri && (
        <Modal visible={zoomVisible} transparent animationType="fade">
          <View style={styles.zoomContainer}>
            <TouchableOpacity
              onPress={() => {
                setZoomVisible(false);
                setZoomImageUri(null);
              }}
              style={styles.zoomCloseButton}
            >
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>

            <Image
              source={{ uri: zoomImageUri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default AdminTicketScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  headerContainer: {
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
  },
  filterScrollView: {
    maxHeight: 40,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366f1",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 6,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  imageContainer: {
    flexDirection: "row",
    gap: 8,
  },
  imageWrapper: {
    alignItems: "center",
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  imageLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
    marginLeft: 12,
    textAlign: "right",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  assignButton: {
    backgroundColor: "#f59e0b",
  },
  resolveButton: {
    backgroundColor: "#10b981",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomCloseButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  zoomImage: {
    width: "100%",
    height: "80%",
  },
});