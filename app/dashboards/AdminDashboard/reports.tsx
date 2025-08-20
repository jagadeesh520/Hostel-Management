import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Ticket = {
  _id: string;
  issueType: string;
  description: string;
  rollNo: string;
  imagePath?: string;
  resolutionImage?: string;
  status: "Pending" | "Assigned" | "WardenFixed" | "Resolved" | string;
  createdAt?: string;
  // server may return full object or just id
  assignedWarden?: string | { _id: string; name: string; block?: string };
};

type Warden = { _id: string; name: string; block: string };

const BASE = "http://192.168.29.83:5000";

const AdminTicketScreen = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignWardenId, setAssignWardenId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "assigned" | "wardenfixed" | "resolved"
  >("all");

  useEffect(() => {
    loadAll();
  }, []);

  useFocusEffect(
  useCallback(() => {
    loadAll();       // re-fetch tickets + wardens on focus
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
        const resW = await axios.get<Warden[]>(`${BASE}/api/wardens`, {
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
          `${BASE}/api/issueTicket/tickets`,
          { headers }
        );
        setTickets(Array.isArray(resT.data) ? resT.data : []);
      } catch (e) {
        console.warn("Tickets fetch failed", e);
        // fallbacks if your mount path differs — uncomment if needed:
        // for (const url of [`${BASE}/api/issueTicket`, `${BASE}/api/tickets`]) { ... }
        setTickets([]);
        Alert.alert(
          "Error",
          "Could not load tickets. Check `/api/issueTicket/tickets` route."
        );
      }
    } finally {
      setLoading(false);
    }
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
    if (x === "wardenfixed") return "WardenFixed";
    if (x === "resolved") return "Resolved";
    return "Pending";
  };

  const badgeColor = (s?: string) => {
    const x = (s || "").toLowerCase();
    if (x === "assigned") return "#2563EB"; // blue
    if (x === "wardenfixed") return "#9333EA"; // purple
    if (x === "resolved") return "#16A34A"; // green
    return "#DC2626"; // red (pending)
    // tweak colors to taste
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
        `${BASE}/api/issueTicket/tickets/${selectedTicket._id}/assign`,
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
      // Some backends return 200 with updated doc; some return 204.
      const res = await axios.put(
        `${BASE}/api/issueTicket/tickets/${selectedTicket._id}/resolve`,
        {},
        { headers }
      );

      const updated: Ticket =
        res?.data && res.data._id
          ? res.data
          : { ...selectedTicket, status: "Resolved" }; // fallback patch

      // PATCH LIST IN PLACE
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
    // Support server returning either an id or an object for assignedWarden
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
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
        onPress={() => {
          setSelectedTicket(item);
          setAssignWardenId(assignedId || "");
          setModalVisible(true);
        }}
      >
        {/* Left: images (original + resolution if exists) */}
        <View style={{ flexDirection: "column", marginRight: 10 }}>
          {item.imagePath ? (
            <TouchableOpacity
              onPress={() => {
                setZoomImageUri(`${BASE}/uploads/faces/${item.imagePath}`);
                setZoomVisible(true);
              }}
            >
              <Image
                source={{
                  uri: `${BASE}/uploads/faces/${item.imagePath}`,
                }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 8,
                  marginBottom: item.resolutionImage ? 5 : 0,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}

          {item.resolutionImage ? (
            <TouchableOpacity
              onPress={() => {
                setZoomImageUri(
                  `${BASE}/uploads/faces/${item.resolutionImage}`
                );
                setZoomVisible(true);
              }}
            >
              <Image
                source={{
                  uri: `${BASE}/uploads/faces/${item.resolutionImage}`,
                }}
                style={{ width: 100, height: 100, borderRadius: 8 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Right: details */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.issueType}</Text>
          <Text style={styles.cardText} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardText}>Roll No: {item.rollNo}</Text>

          {/* Assigned warden name */}
          {assignedName ? (
            <Text style={[styles.cardText, { marginTop: 4 }]}>
              Assigned to:{" "}
              <Text style={{ fontWeight: "bold" }}>{assignedName}</Text>
            </Text>
          ) : (
            <Text style={[styles.cardText, { marginTop: 4 }]}>
              Assigned to: <Text style={{ fontStyle: "italic" }}>—</Text>
            </Text>
          )}

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: badgeColor(s), marginTop: 6 },
            ]}
          >
            <Text style={styles.statusText}>{s}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search (type, desc, roll no)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Picker
          selectedValue={filterStatus}
          style={styles.picker}
          onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
        >
          <Picker.Item label="All" value="all" />
          <Picker.Item label="Pending" value="pending" />
          <Picker.Item label="Assigned" value="assigned" />
          <Picker.Item label="WardenFixed" value="wardenfixed" />
          <Picker.Item label="Resolved" value="resolved" />
        </Picker>
      </View>

      {/* List */}
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", color: "#6B7280", marginTop: 16 }}
          >
            No tickets found.
          </Text>
        }
      />

      {/* Ticket modal (Assign & Resolve) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedTicket && (
              <>
                <Text style={styles.modalTitle}>Ticket Details</Text>

                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Type:</Text>{" "}
                  {selectedTicket.issueType}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Description:</Text>{" "}
                  {selectedTicket.description}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Roll No:</Text>{" "}
                  {selectedTicket.rollNo}
                </Text>

                {/* Assign area */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.bold}>Assign to Warden</Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#ddd",
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  >
                    <Picker
                      selectedValue={assignWardenId || ""}
                      onValueChange={(v) => setAssignWardenId(String(v))}
                    >
                      <Picker.Item label="-- Select Warden --" value="" />
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
                    style={[
                      styles.modalButton,
                      { backgroundColor: "#1D4ED8", marginTop: 8 },
                    ]}
                    onPress={handleAssign}
                  >
                    <Text style={styles.modalButtonText}>Assign</Text>
                  </TouchableOpacity>
                </View>

                {/* Admin resolve (no photo capture here) */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { backgroundColor: "#22C55E", flex: 1 },
                    ]}
                    onPress={handleResolve}
                  >
                    <Text style={styles.modalButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { flex: 1 },
                    ]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      {zoomVisible && zoomImageUri && (
        <Modal visible={zoomVisible} transparent>
          <View style={{ flex: 1, backgroundColor: "black" }}>
            <TouchableOpacity
              onPress={() => {
                setZoomVisible(false);
                setZoomImageUri(null);
              }}
              style={{ position: "absolute", top: 40, right: 20, zIndex: 2 }}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>

            <Image
              source={{ uri: zoomImageUri }}
              style={{ flex: 1, resizeMode: "contain" }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default AdminTicketScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f4f4f4" },
  filters: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  picker: { backgroundColor: "#fff", borderRadius: 8, height: 50 },
  card: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
    color: "#333",
  },
  cardText: { fontSize: 14, color: "#444" },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: { fontWeight: "bold", color: "#fff", fontSize: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContainer: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  modalText: { fontSize: 15, marginBottom: 8, color: "#444" },
  bold: { fontWeight: "bold", color: "#222" },
  modalButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButton: { backgroundColor: "#6c757d" },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
});
