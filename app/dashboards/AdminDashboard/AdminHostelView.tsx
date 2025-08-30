import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE = "http://192.168.29.83:5000/api/hostels";

export default function AdminHostelView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get(`${API_BASE}/create`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allBlocks = [...res.data.Boys, ...res.data.Girls];
      setBlocks(allBlocks);
    } catch (err) {
      Alert.alert("Error", "Failed to load hostel structure");
    }
  };

  const toggleRoomBlock = async (
    blockName: string,
    roomNumber: string,
    isBlocked: boolean
  ) => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      await axios.put(
        `${API_BASE}/admin/block-room`,
        { blockName, roomNumber, isBlocked },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Update UI immediately
      setSelectedBlock((prev: any) => {
        if (!prev) return prev;
        const updatedFloors = prev.floors.map((floor: any) => ({
          ...floor,
          rooms: floor.rooms.map((room: any) =>
            room.roomNumber === roomNumber ? { ...room, isBlocked } : room
          ),
        }));
        return { ...prev, floors: updatedFloors };
      });

      Alert.alert(
        "Success",
        `Room ${roomNumber} ${isBlocked ? "blocked" : "unblocked"}!`
      );
    } catch (err) {
      Alert.alert("Error", "Failed to update room");
    }
  };

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
                item.isBlocked && styles.roomBlocked,
                selectedRoom?.roomNumber === item.roomNumber &&
                  styles.roomSelected,
              ]}
              onPress={() => setSelectedRoom(item)}
              onLongPress={() =>
                toggleRoomBlock(block.name, item.roomNumber, !item.isBlocked)
              }
            >
              <Text style={styles.roomText}>{item.roomNumber}</Text>
              <Text style={styles.bedsCount}>
                {item.beds?.length || 0} beds
              </Text>
              {item.isBlocked && <Text style={styles.blockedLabel}>🚫</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderRoomDetails = (room: any) => (
    <View style={styles.roomDetails}>
      <Text style={styles.sectionTitle}>Room {room.roomNumber} - Beds</Text>
      {room.beds.map((bed: any) => (
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {!selectedBlock ? (
        <FlatList
          data={blocks}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.blockBox}
              onPress={() => setSelectedBlock(item)}
            >
              <Text style={styles.blockText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      ) : (
        <View style={styles.container}>
          <TouchableOpacity
            onPress={() => {
              setSelectedBlock(null);
              setSelectedRoom(null);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {renderRooms(selectedBlock)}
          {selectedRoom && renderRoomDetails(selectedRoom)}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#F9FAFB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  // Blocks
  blockBox: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
  },
  blockText: { fontSize: 16, fontWeight: "600", color: "#2563EB" },

  // Rooms
  roomsContainer: { marginTop: 12 },
  roomBox: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
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
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bedOccupied: { backgroundColor: "#FEE2E2" },
  bedText: { fontWeight: "700", color: "#111827" },
  studentText: { fontSize: 14, color: "#374151" },

  // Back Button
  backBtn: { marginVertical: 12 },
  backText: { color: "#2563EB", fontWeight: "700" },
});
