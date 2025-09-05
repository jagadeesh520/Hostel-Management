import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// --- Grid constants (uniform squares) ---
const NUM_COLS = 4;
const GAP = 12; // spacing between tiles
const SCREEN_W = Dimensions.get("window").width;
// parent container has padding: 12 left + 12 right (see styles.container)
const PARENT_PAD = 24;
const TOTAL_GAPS = GAP * (NUM_COLS - 1);
const ITEM = Math.floor((SCREEN_W - PARENT_PAD - TOTAL_GAPS) / NUM_COLS);

const ordinal = (n: number | string) => {
  const num = Number(n);
  if (!num) return `${n}`;
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function StudentHostelView() {
  const [student, setStudent] = useState<any | null>(null);
  const [assignedBlocks, setAssignedBlocks] = useState<any[]>([]);
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [myBooking, setMyBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignedBlocksAndBooking();
  }, []);

  const fetchAssignedBlocksAndBooking = async () => {
    try {
      setLoading(true);
      const rollNo = await AsyncStorage.getItem("rollNo");
      const token = await AsyncStorage.getItem("studentToken");
      if (!rollNo || !token) return;

      // Assigned blocks (array)
      const res = await axios.get(
        `${API_BASE_URL}/api/hostels/student/assigned-block/${rollNo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudent(res.data.student);
      setAssignedBlocks(res.data.assignments || []);

      // Existing booking (if any)
      const booking = await axios.get(
        `${API_BASE_URL}/api/hostels/student/my-booking/${rollNo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (booking.data) setMyBooking(booking.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "No block assigned";
      Alert.alert("Info", msg);
    } finally {
      setLoading(false);
    }
  };

  const activeBlock = useMemo(
    () => assignedBlocks[activeBlockIdx] || null,
    [assignedBlocks, activeBlockIdx]
  );

  // 🔹 Book bed
  const bookBed = async (roomNumber: string, bedNumber: number) => {
    try {
      const token = await AsyncStorage.getItem("studentToken");
      const rollNo = await AsyncStorage.getItem("rollNo");
      if (!activeBlock) return;

      await axios.post(
        `${API_BASE_URL}/api/hostels/student/book-bed`,
        { blockName: activeBlock.blockName, roomNumber, bedNumber, rollNo },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMyBooking({
        blockName: activeBlock.blockName,
        roomNumber,
        bedNumber,
      });
      Alert.alert(
        "Success",
        `You booked Bed ${bedNumber} in Room ${roomNumber}`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Booking failed");
    }
  };

  // ✅ Already booked → show allocation
  if (myBooking) {
    const bookedBlock =
      assignedBlocks.find((b) => b.blockName === myBooking.blockName) || null;

    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>My Hostel Allocation</Text>
        <View style={styles.allocationCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.allocationTitle}>Booking Confirmed</Text>

          <View style={styles.allocationRow}>
            <Text style={styles.allocationIcon}>👤</Text>
            <Text style={styles.allocationText}>
              {student?.name} ({student?.rollNo})
            </Text>
          </View>

          <View style={styles.allocationRow}>
            <Text style={styles.allocationIcon}>🏢</Text>
            <Text style={styles.allocationText}>
              {myBooking.blockName}
              {bookedBlock?.type ? ` (${bookedBlock.type})` : ""}
            </Text>
          </View>

          <View style={styles.allocationRow}>
            <Text style={styles.allocationIcon}>🚪</Text>
            <Text style={styles.allocationText}>
              Room {myBooking.roomNumber}
            </Text>
          </View>

          <View style={styles.allocationRow}>
            <Text style={styles.allocationIcon}>🛏️</Text>
            <Text style={styles.allocationText}>Bed {myBooking.bedNumber}</Text>
          </View>
        </View>
      </View>
    );
  }

  // 🔹 Room grid grouped by floor (outer scroll handles all floors)
  const RoomGrid = ({ block }: { block: any }) => {
    const floors = block?.floors || [];

    return (
      <View style={styles.roomsContainer}>
        <Text style={styles.sectionTitle}>
          Rooms in {block?.blockName} {block?.type ? `(${block.type})` : ""}
        </Text>

        {floors.map((floor: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            <Text style={styles.floorTitle}>
              {ordinal(floor.floorNumber)} Floor
            </Text>

            <FlatList
              data={floor.rooms}
              numColumns={NUM_COLS}
              keyExtractor={(item) => item.roomNumber}
              scrollEnabled={false}            // ⬅️ let the outer ScrollView scroll
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.roomBox,
                    item.isBlocked && styles.roomBlocked,
                    selectedRoom?.roomNumber === item.roomNumber &&
                      styles.roomSelected,
                    {
                      width: ITEM,
                      height: ITEM,
                      marginRight: index % NUM_COLS !== NUM_COLS - 1 ? GAP : 0,
                      marginBottom: GAP,
                    },
                  ]}
                  onPress={() => {
                    if (item.isBlocked) {
                      Alert.alert("Blocked", "This room is blocked by Admin");
                    } else {
                      setSelectedRoom(item);
                    }
                  }}
                >
                  <Text style={styles.roomText}>{item.roomNumber}</Text>
                  <Text style={styles.bedsCount}>
                    {item.beds?.length || 0} beds
                  </Text>
                  {item.isBlocked && (
                    <Text style={styles.blockedLabel}>🚫</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        ))}
      </View>
    );
  };

  // 🔹 Beds in selected room
  const RoomBeds = ({ room }: { room: any }) => (
    <View style={styles.roomDetails}>
      <Text style={styles.sectionTitle}>Room {room.roomNumber} - Beds</Text>
      {room.beds.map((bed: any) => (
        <TouchableOpacity
          key={bed.bedNumber}
          style={[
            styles.bedRow,
            bed.occupied ? styles.bedOccupied : styles.bedAvailable,
          ]}
          disabled={bed.occupied}
          onPress={() => bookBed(room.roomNumber, bed.bedNumber)}
        >
          <Text style={styles.bedText}>Bed {bed.bedNumber}</Text>
          <Text style={styles.studentText}>
            {bed.occupied
              ? `Occupied by ${bed.studentId?.studentName || "Unknown"}`
              : "Available - Tap to Book"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {!assignedBlocks.length ? (
        <Text style={styles.sectionTitle}>
          {loading ? "Loading…" : "No block assigned yet"}
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {/* Block switcher if multiple blocks */}
          {assignedBlocks.length > 1 && (
            <View style={styles.blockSwitcher}>
              {assignedBlocks.map((b, i) => (
                <TouchableOpacity
                  key={`${b.blockName}-${i}`}
                  style={[
                    styles.blockPill,
                    i === activeBlockIdx && styles.blockPillActive,
                  ]}
                  onPress={() => {
                    setSelectedRoom(null);
                    setActiveBlockIdx(i);
                  }}
                >
                  <Text
                    style={[
                      styles.blockPillText,
                      i === activeBlockIdx && styles.blockPillTextActive,
                    ]}
                  >
                    {b.blockName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Back to rooms when inside a room */}
          {selectedRoom && (
            <TouchableOpacity
              onPress={() => setSelectedRoom(null)}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>← Back to Rooms</Text>
            </TouchableOpacity>
          )}

          {/* Rooms / Beds */}
          {activeBlock && <RoomGrid block={activeBlock} />}
          {selectedRoom && <RoomBeds room={selectedRoom} />}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#F9FAFB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  // Block switcher
  blockSwitcher: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  blockPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  blockPillActive: {
    backgroundColor: "#2563EB",
  },
  blockPillText: { color: "#111827", fontWeight: "600" },
  blockPillTextActive: { color: "#fff" },

  // Rooms
  roomsContainer: { marginTop: 12 },
  roomBox: {
    // width/height/margins applied inline from ITEM/GAP for perfect math
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    padding: 4,
  },
  roomSelected: { borderWidth: 2, borderColor: "#2563EB" },
  roomBlocked: { backgroundColor: "#FEE2E2" },
  roomText: { fontWeight: "700", fontSize: 14, color: "#111827" },
  bedsCount: { fontSize: 12, color: "#4B5563", marginTop: 4 },
  blockedLabel: { color: "red", fontSize: 12, fontWeight: "700" },

  // Beds
  roomDetails: { marginTop: 20 },
  bedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bedAvailable: { backgroundColor: "#DCFCE7" },
  bedOccupied: { backgroundColor: "#FEE2E2" },
  bedText: { fontWeight: "700", color: "#111827" },
  studentText: { fontSize: 14, color: "#374151" },

  // Back Button
  backBtn: { marginVertical: 12 },
  backText: { color: "#2563EB", fontWeight: "700" },

  // Allocation Card
  allocationCard: {
    backgroundColor: "#D1FAE5",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  successIcon: { fontSize: 40, marginBottom: 10 },
  allocationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 16,
  },
  allocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  allocationIcon: { fontSize: 20, marginRight: 10 },
  allocationText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  floorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
});
