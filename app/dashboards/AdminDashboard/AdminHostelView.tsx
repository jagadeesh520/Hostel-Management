import { FontAwesome5 } from "@expo/vector-icons";
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
import Dialog from "react-native-dialog";

const API_BASE = "https://api.sjtechsol.com/api/hostels";

export default function AdminHostelView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [targetBlock, setTargetBlock] = useState("");

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

  // 🔹 NEW: Unallocate all students in a block
  const unallocateBlock = (blockName: string) => {
    setTargetBlock(blockName);
    setShowDialog(true);
  };

  const confirmUnallocate = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      await axios.put(
        `${API_BASE}/admin/unallocate-block/${targetBlock}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert(
        "🎉 Success",
        `All students in  ${targetBlock} have been unallocated`
      );
      fetchBlocks();
      setSelectedBlock(null);
      setSelectedRoom(null);
    } catch (err) {
      Alert.alert("Error", "Failed to unallocate block");
    } finally {
      setShowDialog(false);
    }
  };

  // 🔹 Decide room color based on occupancy
  const getRoomStyle = (room: any) => {
    if (room.isBlocked) return styles.roomBlocked;

    const totalBeds = room.beds.length;
    const occupiedBeds = room.beds.filter((b: any) => b.occupied).length;

    if (occupiedBeds === 0) return styles.roomAvailable; // all free
    if (occupiedBeds === totalBeds) return styles.roomFull; // fully occupied

    return styles.roomPartial; // partially occupied
  };

  const renderRooms = (block: any) => {
    const allRooms: any[] = [];
    block.floors.forEach((floor: any) => allRooms.push(...floor.rooms));

    return (
      <>
        {/* Your main UI */}
        <Dialog.Container visible={showDialog}>
          <Dialog.Title>⚠️ Confirm Unallocation</Dialog.Title>
          <Dialog.Description>
            This will remove ALL students from block {targetBlock}. Are you
            sure you want to continue?
          </Dialog.Description>
          <Dialog.Button label="Cancel" onPress={() => setShowDialog(false)} />
          <Dialog.Button label="Yes, Unallocate" onPress={confirmUnallocate} />
        </Dialog.Container>

        <View style={styles.roomsContainer}>
          <View style={styles.roomHeader}>
            <Text style={styles.sectionTitle}>Rooms in {block.name}</Text>
            {/* Unallocate Block Button */}
            <TouchableOpacity
              style={styles.unallocateBtn}
              onPress={() => unallocateBlock(block.name)}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Unallocate Block
              </Text>
            </TouchableOpacity>
          </View>

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
                onPress={() => setSelectedRoom(item)}
                onLongPress={() =>
                  toggleRoomBlock(block.name, item.roomNumber, !item.isBlocked)
                }
              >
                <Text style={styles.roomText}>{item.roomNumber}</Text>
                <Text style={styles.bedsCount}>
                  {item.beds?.filter((b: any) => b.occupied).length}/
                  {item.beds?.length || 0} beds
                </Text>
                {item.isBlocked && <Text style={styles.blockedLabel}>🚫</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </>
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

  // calculate totals
  const getBlockStats = (block: any) => {
    let totalRooms = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;

    block.floors.forEach((floor: any) => {
      totalRooms += floor.rooms.length;
      floor.rooms.forEach((room: any) => {
        totalBeds += room.beds.length;
        occupiedBeds += room.beds.filter((b: any) => b.occupied).length;
      });
    });

    return { totalRooms, totalBeds, occupiedBeds };
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {!selectedBlock ? (
        <FlatList
          data={blocks}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({ item }) => {
            const { totalRooms, totalBeds, occupiedBeds } = getBlockStats(item);
            return (
              <TouchableOpacity
                style={styles.blockCard}
                onPress={() => setSelectedBlock(item)}
              >
                <View style={styles.blockHeader}>
                  <FontAwesome5 name="building" size={24} color="#2563EB" />
                  <Text style={styles.blockTitle}>{item.name}</Text>
                </View>

                <View style={styles.blockStats}>
                  <Text style={styles.statText}>🏠 {totalRooms} Rooms</Text>
                  <Text style={styles.statText}>
                    🛏 {occupiedBeds}/{totalBeds} Beds Occupied
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 12, paddingBottom: 50 }}
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

  // Block Cards
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
  blockHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  blockTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    color: "#2563EB",
  },
  blockStats: { marginTop: 4 },
  statText: { fontSize: 14, color: "#374151", marginTop: 2 },

  // Rooms
  roomsContainer: { marginTop: 12 },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 4,
  },
  unallocateBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
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

  // Dynamic room colors
  roomAvailable: { backgroundColor: "#A7F3D0" }, // green
  roomPartial: { backgroundColor: "#FEF3C7" }, // yellow
  roomFull: { backgroundColor: "#FECACA" }, // red
  roomBlocked: { backgroundColor: "#D1D5DB" }, // grey

  roomText: { fontWeight: "700", fontSize: 14, color: "#111827" },
  bedsCount: { fontSize: 12, color: "#374151", marginTop: 4 },
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
