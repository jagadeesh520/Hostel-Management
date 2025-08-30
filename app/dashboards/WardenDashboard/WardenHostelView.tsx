import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const API_BASE = "http://192.168.29.83:5000/api/hostels";

interface Bed {
  bedNumber: number;
  occupied: boolean;
  studentId?: { _id: string; studentName: string };
}
interface Room {
  roomNumber: string;
  beds: Bed[];
}
interface Floor {
  floorNumber: number;
  rooms: Room[];
}
interface Block {
  name: string;
  floors: Floor[];
}

interface Room {
  roomNumber: string;
  isBlocked?: boolean;   // 👈 add this
  beds: Bed[];
}

export default function WardenHostelView() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get<{ Boys: Block[]; Girls: Block[] }>(
        `${API_BASE}/create`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlocks([...res.data.Boys, ...res.data.Girls]);
    } catch (err) {
      console.error("Error fetching hostel:", err);
      Alert.alert("Error", "Failed to load hostel structure");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Render Rooms like movie ticket boxes
 const renderRooms = (block: Block) => {
  const allRooms: Room[] = [];
  block.floors.forEach((floor) => allRooms.push(...floor.rooms));

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
              item.isBlocked && styles.roomBlocked, // 👈 highlight blocked
              selectedRoom?.roomNumber === item.roomNumber && styles.roomSelected,
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
            {item.isBlocked && <Text style={styles.blockedLabel}>🚫</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};


  // 🔹 Render Students in selected room
  const renderRoomDetails = (room: Room) => (
    <View style={styles.roomDetails}>
      <Text style={styles.sectionTitle}>
        Room {room.roomNumber} - Beds
      </Text>
      {room.beds.map((bed) => (
        <View
          key={bed.bedNumber}
          style={[styles.bedRow, bed.occupied && styles.bedOccupied]}
        >
          <Text style={styles.bedText}>Bed {bed.bedNumber}</Text>
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
    <View style={styles.container}>
      {!selectedBlock ? (
        <>
          <Text style={styles.sectionTitle}>Select a Block</Text>
          <FlatList
            data={blocks}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.blockBox}
                onPress={() => setSelectedBlock(item)}
              >
                <Text style={styles.blockText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <>
          {/* Back to Blocks */}
          <TouchableOpacity
            onPress={() => {
              setSelectedRoom(null);
              setSelectedBlock(null);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back to Blocks</Text>
          </TouchableOpacity>

          {/* Rooms in Block */}
          {renderRooms(selectedBlock)}

          {/* Beds in Room */}
          {selectedRoom && renderRoomDetails(selectedRoom)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },

  // 🔹 Blocks
  blockBox: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
  },
  blockText: { fontSize: 16, fontWeight: "600", color: "#2563EB" },

  // 🔹 Rooms like tickets
  roomsContainer: { marginTop: 20 },
  roomBox: {
    width: 70,
    height: 70,
    margin: 8,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  roomSelected: { backgroundColor: "#93C5FD" },
  roomText: { fontWeight: "700", fontSize: 16, color: "#111827" },

  // 🔹 Beds in Room
  roomDetails: { marginTop: 20 },
  bedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bedOccupied: { backgroundColor: "#FEE2E2" },
  bedText: { fontWeight: "700", color: "#111827" },
  studentText: { fontSize: 14, color: "#374151" },

  // 🔹 Back Button
  backBtn: { marginVertical: 12 },
  backText: { color: "#2563EB", fontWeight: "700" },
  roomBlocked: { backgroundColor: "#FEE2E2" },
  blockedLabel: { color: "red", fontSize: 12, fontWeight: "700" },
});
