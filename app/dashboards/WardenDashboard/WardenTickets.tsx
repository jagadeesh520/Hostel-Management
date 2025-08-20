import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
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
  imagePath?: string;            // student's photo
  resolutionImage?: string;      // warden’s proof (or final)
  status?: "Pending" | "Assigned" | "WardenFixed" | "Resolved" | string;
  createdAt?: string;
  assignedWarden?: string | { _id: string; name?: string; block?: string };
};

const BASE = "http://192.168.29.83:5000";
type FilterKey = "all" | "assigned" | "pending" | "wardenfixed" | "resolved";

export default function WardenTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [proof, setProof] = useState<any>(null);

  // NEW: filter + current warden
  const [filter, setFilter] = useState<FilterKey>("all");
  const [wardenId, setWardenId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      // who am I? (for “Assigned” filter)
      const wid = await AsyncStorage.getItem("wardenId");
      setWardenId(wid);

      const token = await AsyncStorage.getItem("wardenToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      // ALWAYS get ALL tickets (no server filtering)
      let list: Ticket[] = [];
      try {
        const res = await axios.get<Ticket[]>(`${BASE}/api/issueTicket/tickets`, { headers });
        list = Array.isArray(res.data) ? res.data : [];
      } catch {
        const res2 = await axios.get<Ticket[]>(`${BASE}/api/tickets`, { headers });
        list = Array.isArray(res2.data) ? res2.data : [];
      }
      setTickets(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load tickets.");
    }
  };

  const statusLabel = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "wardenfixed") return "Assigned to Admin";
    if (v === "resolved") return "Resolved";
    if (v === "assigned") return "Assigned";
    return "Pending";
  };

  const statusTone = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v === "resolved") return "#10B981";   // green
    if (v === "wardenfixed") return "#2563EB"; // blue
    if (v === "assigned") return "#F59E0B";   // amber
    return "#EF4444";                         // red
  };

  const normalize = (s?: string) => (s || "").toLowerCase();
  const assignedIdOf = (t: Ticket) =>
    typeof t.assignedWarden === "string"
      ? t.assignedWarden
      : t.assignedWarden?._id || null;

  // NEW: counts (for the pills)
  const counts = useMemo(() => {
  const all = tickets.length;
  const pending = tickets.filter(t => normalize(t.status) === "pending" || !t.status).length;
  const wardenfixed = tickets.filter(t => normalize(t.status) === "wardenfixed").length;
  const resolved = tickets.filter(t => normalize(t.status) === "resolved").length;
  const assigned = tickets.filter(t => normalize(t.status) === "assigned").length; // Changed this line
  return { all, assigned, pending, wardenfixed, resolved };
}, [tickets, wardenId]);

  // NEW: filtered list
  const filteredTickets = useMemo(() => {
  switch (filter) {
    case "assigned":
      return tickets.filter(t => normalize(t.status) === "assigned"); // Changed this line
    case "pending":
      return tickets.filter(t => normalize(t.status) === "pending" || !t.status);
    case "wardenfixed":
      return tickets.filter(t => normalize(t.status) === "wardenfixed");
    case "resolved":
      return tickets.filter(t => normalize(t.status) === "resolved");
    default:
      return tickets;
  }
}, [tickets, filter, wardenId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setProof(result.assets[0]);
  };

  const submitFix = async () => {
    if (!selected) return;
    if (!proof) return Alert.alert("Required", "Please capture a proof image.");

    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const headers: any = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      };

      const form = new FormData();
      form.append("reply", reply || "");
      form.append("resolutionImage", {
        uri: proof.uri,
        name: `fix_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as any);

      await axios.post(
        `${BASE}/api/issueTicket/tickets/${selected._id}/warden-fix`,
        form,
        { headers }
      );

      // Optimistic UI
      setTickets(prev =>
        prev.map(t =>
          t._id === selected._id ? { ...t, status: "WardenFixed" } : t
        )
      );

      Alert.alert("Saved", "Fix uploaded; awaiting admin verification.");
      setModalVisible(false);
      setReply("");
      setProof(null);
      load(); // refresh to get server-side file name
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to upload fix.");
    }
  };

  const getAssignedName = (t: Ticket) => {
    if (!t.assignedWarden) return "Unassigned";
    if (typeof t.assignedWarden !== "string") {
      return t.assignedWarden.name
        ? `${t.assignedWarden.name}${t.assignedWarden.block ? ` (${t.assignedWarden.block})` : ""}`
        : "Assigned";
    }
    return "Assigned";
  };

  const openTicket = (t: Ticket) => {
    setSelected(t);
    setReply("");
    setProof(null);
    setModalVisible(true);
  };

  const TicketThumb = ({ uri }: { uri?: string }) =>
    uri ? (
      <Image
        source={{ uri }}
        style={{ width: 90, height: 90, borderRadius: 8 }}
        resizeMode="cover"
      />
    ) : null;

  // NEW: pill component
  const Pill = ({
    active,
    label,
    onPress,
  }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F7FB" }}>
      <Text style={styles.title}>All Tickets</Text>

      {/* NEW: Filter row */}
      <View style={styles.filterRow}>
        <Pill
          active={filter === "all"}
          label={`All (${counts.all})`}
          onPress={() => setFilter("all")}
        />
        <Pill
          active={filter === "assigned"}
          label={`Assigned (${counts.assigned})`}
          onPress={() => setFilter("assigned")}
        />
        <Pill
          active={filter === "pending"}
          label={`Pending (${counts.pending})`}
          onPress={() => setFilter("pending")}
        />
        <Pill
          active={filter === "wardenfixed"}
          label={`Warden Fixed (${counts.wardenfixed})`}
          onPress={() => setFilter("wardenfixed")}
        />
        <Pill
          active={filter === "resolved"}
          label={`Resolved (${counts.resolved})`}
          onPress={() => setFilter("resolved")}
        />
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={(t) => t._id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openTicket(item)}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Student image */}
              <TicketThumb
                uri={
                  item.imagePath ? `${BASE}/uploads/faces/${item.imagePath}` : undefined
                }
              />

              <View style={{ flex: 1 }}>
                {/* Title + status badge */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.cardTitle}>{item.issueType}</Text>
                  <View style={[styles.badge, { backgroundColor: statusTone(item.status) }]}>
                    <Text style={styles.badgeText}>{statusLabel(item.status)}</Text>
                  </View>
                </View>

                <Text style={styles.cardText} numberOfLines={2}>
                  {item.description}
                </Text>

                <Text style={[styles.cardText, { marginTop: 4 }]}>
                  {getAssignedName(item)} • #{item.rollNo || "--"}
                </Text>

                {/* Small hint if a resolution image exists */}
                {item.resolutionImage ? (
                  <Text style={{ color: "#2563EB", marginTop: 4, fontWeight: "600" }}>
                    Proof attached
                  </Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#6B7280" }}>
            No tickets found.
          </Text>
        }
      />

      {/* Modal: original + resolution images and upload controls */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>{selected.issueType}</Text>
                <Text style={styles.modalText}>{selected.description}</Text>

                {/* Student’s original image */}
                {selected.imagePath ? (
                  <Image
                    source={{ uri: `${BASE}/uploads/faces/${selected.imagePath}` }}
                    style={{ width: "100%", height: 180, borderRadius: 8, marginTop: 8 }}
                    resizeMode="cover"
                  />
                ) : null}

                {/* Existing resolution image (if previously uploaded) */}
                {selected.resolutionImage ? (
                  <>
                    <Text style={[styles.modalText, { marginTop: 10, fontWeight: "700" }]}>
                      Proof attached
                    </Text>
                    <Image
                      source={{ uri: `${BASE}/uploads/faces/${selected.resolutionImage}` }}
                      style={{ width: "100%", height: 180, borderRadius: 8, marginTop: 6 }}
                      resizeMode="cover"
                    />
                  </>
                ) : null}

                {/* Only allow resubmission if NOT resolved */}
                {selected.status?.toLowerCase() !== "resolved" ? (
                  <>
                    <TextInput
                      placeholder="Reply (optional)"
                      value={reply}
                      onChangeText={setReply}
                      style={styles.input}
                      multiline
                    />

                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: "#2563EB" }]}
                        onPress={pickImage}
                      >
                        <Text style={styles.btnText}>{proof ? "Retake Photo" : "Capture Proof"}</Text>
                      </TouchableOpacity>
                      {proof ? (
                        <Image source={{ uri: proof.uri }} style={{ width: 80, height: 60, borderRadius: 6 }} />
                      ) : null}
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: "#10B981", flex: 1 }]}
                        onPress={submitFix}
                      >
                        <Text style={styles.btnText}>Submit Fix</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: "#6B7280", flex: 1 }]}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={styles.btnText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: "#6B7280", marginTop: 12 }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.btnText}>Close</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", margin: 16, color: "#111827" },

  // FILTER ROW + PILLS
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIdle: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  pillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  pillText: { color: "#111827", fontWeight: "700" },
  pillTextActive: { color: "#FFFFFF" },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  cardTitle: { fontWeight: "800", color: "#111827", marginBottom: 4 },
  cardText: { color: "#374151" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 11 },

  modalWrap: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "88%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    fontSize: 16,
  },
  modalText: { color: "#374151" },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    backgroundColor: "#fff",
    marginTop: 10,
    marginBottom: 10,
  },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
