import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const API_BASE = "https://api.sjtechsol.com/api/hostels";

export default function WardenHostelView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get(`${API_BASE}/create`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlocks([...res.data.Boys, ...res.data.Girls]);
    } catch (err) {
      console.error("Error fetching hostel:", err);
      Alert.alert("Error", "Failed to load hostel structure");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Occupancy status color
  const getRoomStyle = (room: any) => {
    if (room.isBlocked) return styles.roomBlocked;
    const total = room.beds.length;
    const occupied = room.beds.filter((b: any) => b.occupied).length;
    if (occupied === 0) return styles.roomAvailable; // all free
    if (occupied === total) return styles.roomFull; // fully occupied
    return styles.roomPartial; // partially filled
  };

  // 🔹 Render Rooms like movie tickets
  const renderRooms = (block: any) => {
    const allRooms: any[] = [];
    block.floors.forEach((floor: any) => allRooms.push(...floor.rooms));

    return (
      <View style={styles.roomsContainer}>
        <Text style={styles.sectionTitle}>Rooms in {block.name}</Text>
        <FlatList
          data={allRooms}
          numColumns={4}
          keyExtractor={(item) => item.roomNumber}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.roomBox,
                getRoomStyle(item),
                selectedRoom?.roomNumber === item.roomNumber &&
                  styles.roomSelected,
              ]}
              onPress={() => {
                if (item.isBlocked) {
                  Alert.alert("Blocked", `Room ${item.roomNumber} is blocked by admin`);
                } else {
                  setSelectedRoom(item);
                }
              }}
            >
              <Text style={styles.roomText}>{item.roomNumber}</Text>
              <Text style={styles.bedsCount}>
                {item.beds.filter((b: any) => b.occupied).length}/
                {item.beds.length}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // 🔹 Render Students in selected room
  const renderRoomDetails = (room: any) => (
    <View style={styles.roomDetails}>
      <Text style={styles.sectionTitle}>Room {room.roomNumber} - Beds</Text>
      {room.beds.map((bed: any) => (
        <View
          key={bed.bedNumber}
          style={[styles.bedRow, bed.occupied ? styles.bedOccupied : styles.bedAvailableRow]}
        >
          <Text style={styles.bedText}>🛏 Bed {bed.bedNumber}</Text>
          <Text style={styles.studentText}>
            {bed.occupied
              ? `Occupied by ${bed.studentId?.studentName || "Unknown"}`
              : "Available"}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {!selectedBlock ? (
        <>
          <FlatList
            data={blocks}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => {
              // small stats
              let totalBeds = 0,
                occupied = 0;
              item.floors.forEach((f: any) =>
                f.rooms.forEach((r: any) => {
                  totalBeds += r.beds.length;
                  occupied += r.beds.filter((b: any) => b.occupied).length;
                })
              );
              return (
                <TouchableOpacity
                  style={styles.blockCard}
                  onPress={() => setSelectedBlock(item)}
                >
                  <View style={styles.blockHeader}>
                    <FontAwesome5 name="building" size={22} color="#2563EB" />
                    <Text style={styles.blockTitle}>{item.name}</Text>
                  </View>
                  <Text style={styles.blockStats}>
                    🛏 {occupied}/{totalBeds} Beds Occupied
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ padding: 12, paddingBottom: 50 }}
          />
        </>
      ) : (
        <View style={styles.container}>
          <TouchableOpacity
            onPress={() => {
              setSelectedRoom(null);
              setSelectedBlock(null);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back to Blocks</Text>
          </TouchableOpacity>

          {renderRooms(selectedBlock)}
          {selectedRoom && renderRoomDetails(selectedRoom)}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },

  // 🔹 Block Cards
  blockCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  blockHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  blockTitle: { fontSize: 18, fontWeight: "700", marginLeft: 8, color: "#2563EB" },
  blockStats: { fontSize: 14, color: "#374151" },

  // 🔹 Rooms
  roomsContainer: { marginTop: 12 },
  roomBox: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    padding: 6,
  },
  roomSelected: { borderWidth: 2, borderColor: "#2563EB" },
  roomAvailable: { backgroundColor: "#A7F3D0" }, // green
  roomPartial: { backgroundColor: "#FEF3C7" }, // yellow
  roomFull: { backgroundColor: "#FECACA" }, // red
  roomBlocked: { backgroundColor: "#D1D5DB" }, // grey
  roomText: { fontWeight: "700", fontSize: 14, color: "#111827" },
  bedsCount: { fontSize: 12, color: "#374151", marginTop: 4 },

  // 🔹 Beds
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
  bedAvailableRow: { backgroundColor: "#DCFCE7" },
  bedOccupied: { backgroundColor: "#FEE2E2" },
  bedText: { fontWeight: "700", color: "#111827" },
  studentText: { fontSize: 14, color: "#374151" },

  // 🔹 Back Button
  backBtn: { marginVertical: 12 },
  backText: { color: "#2563EB", fontWeight: "700" },
});
