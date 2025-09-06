import { API_BASE_URL } from "@/constants/config";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Dialog from "react-native-dialog";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = `${API_BASE_URL}/api/hostels`;

// --- Grid constants (uniform squares) ---
const NUM_COLS = 4;
const GAP = 12; // spacing between tiles
const SCREEN_W = Dimensions.get("window").width;
// parent container has padding: 12 left + 12 right
const PARENT_PAD = 24;
const TOTAL_GAPS = GAP * (NUM_COLS - 1);
const ITEM = Math.floor((SCREEN_W - PARENT_PAD - TOTAL_GAPS) / NUM_COLS);

export default function AdminHostelView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [targetBlock, setTargetBlock] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockingRoom, setBlockingRoom] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get(`${API_BASE}/create`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allBlocks = [...res.data.Boys, ...res.data.Girls];
      setBlocks(allBlocks);
    } catch (err) {
      Alert.alert("Error", "Failed to load hostel structure");
    } finally {
      setLoading(false);
    }
  };

  const toggleRoomBlock = async (
    blockName: string,
    roomNumber: string,
    isBlocked: boolean
  ) => {
    try {
      setBlockingRoom(roomNumber);
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
    } finally {
      setBlockingRoom(null);
    }
  };

  // 🔹 Unallocate all students in a block
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
        "Success",
        `All students in ${targetBlock} have been unallocated`
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

  const getRoomStatusText = (room: any) => {
    if (room.isBlocked) return "Blocked";
    
    const totalBeds = room.beds.length;
    const occupiedBeds = room.beds.filter((b: any) => b.occupied).length;
    
    if (occupiedBeds === 0) return "Available";
    if (occupiedBeds === totalBeds) return "Full";
    return "Partial";
  };

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

  // 🔹 Render Rooms Grid
  const renderRoomsGrid = () => {
    const allRooms: any[] = [];
    selectedBlock.floors.forEach((floor: any) => allRooms.push(...floor.rooms));

    return (
      <View style={styles.roomsContainer}>
        <View style={styles.roomHeader}>
          <View>
            <Text style={styles.sectionTitle}>{selectedBlock.name}</Text>
            <Text style={styles.sectionSubtitle}>
              {allRooms.length} rooms • {getBlockStats(selectedBlock).totalBeds} beds
            </Text>
          </View>

          <TouchableOpacity
            style={styles.unallocateBtn}
            onPress={() => unallocateBlock(selectedBlock.name)}
          >
            <Ionicons name="remove-circle" size={16} color="#fff" />
            <Text style={styles.unallocateBtnText}>Unallocate Block</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#a7f3d0" }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#fef3c7" }]} />
            <Text style={styles.legendText}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#fecaca" }]} />
            <Text style={styles.legendText}>Full</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#d1d5db" }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
        </View>

        <FlatList
          data={allRooms}
          numColumns={NUM_COLS}
          keyExtractor={(item) => item.roomNumber}
          renderItem={({ item, index }) => {
            const occupiedBeds = item.beds.filter((b: any) => b.occupied).length;
            const totalBeds = item.beds.length;
            const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);
            
            return (
              <TouchableOpacity
                style={[
                  styles.roomBox,
                  getRoomStyle(item),
                  selectedRoom?.roomNumber === item.roomNumber &&
                    styles.roomSelected,
                  {
                    width: ITEM,
                    height: ITEM,
                    marginRight: index % NUM_COLS !== NUM_COLS - 1 ? GAP : 0,
                    marginBottom: GAP,
                  },
                ]}
                onPress={() => setSelectedRoom(item)}
                onLongPress={() =>
                  toggleRoomBlock(selectedBlock.name, item.roomNumber, !item.isBlocked)
                }
              >
                <View style={styles.roomBoxContent}>
                  <Text style={styles.roomText}>{item.roomNumber}</Text>
                  <View style={styles.roomStats}>
                    <Ionicons name="bed" size={12} color="#4b5563" />
                    <Text style={styles.bedsCount}>
                      {occupiedBeds}/{totalBeds}
                    </Text>
                  </View>
                  <Text style={styles.roomStatus}>
                    {getRoomStatusText(item)}
                  </Text>
                  {item.isBlocked && (
                    <View style={styles.blockedBadge}>
                      <Ionicons name="lock-closed" size={12} color="#fff" />
                    </View>
                  )}
                  {blockingRoom === item.roomNumber && (
                    <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingIndicator} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // 🔹 Render Room Details
  const renderRoomDetails = () => (
    <View style={styles.roomDetails}>
      <View style={styles.roomDetailsHeader}>
        <Text style={styles.sectionTitle}>Room {selectedRoom.roomNumber}</Text>
        <TouchableOpacity
          onPress={() => toggleRoomBlock(selectedBlock.name, selectedRoom.roomNumber, !selectedRoom.isBlocked)}
          style={[
            styles.blockButton,
            selectedRoom.isBlocked ? styles.unblockButton : styles.blockButtonActive
          ]}
          disabled={blockingRoom === selectedRoom.roomNumber}
        >
          {blockingRoom === selectedRoom.roomNumber ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name={selectedRoom.isBlocked ? "lock-open" : "lock-closed"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.blockButtonText}>
                {selectedRoom.isBlocked ? "Unblock Room" : "Block Room"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.roomSubtitle}>
        {selectedRoom.beds.length} beds • {getRoomStatusText(selectedRoom)}
      </Text>
      
      <View style={styles.bedsContainer}>
        {selectedRoom.beds.map((bed: any) => (
          <View
            key={bed.bedNumber}
            style={[styles.bedCard, bed.occupied && styles.bedOccupied]}
          >
            <View style={styles.bedHeader}>
              <View style={styles.bedInfo}>
                <Ionicons 
                  name="bed" 
                  size={20} 
                  color={bed.occupied ? "#ef4444" : "#10b981"} 
                />
                <Text style={styles.bedText}>Bed {bed.bedNumber}</Text>
              </View>
              <View style={[
                styles.bedStatus,
                { backgroundColor: bed.occupied ? '#fef2f2' : '#f0fdf4' }
              ]}>
                <Text style={[
                  styles.bedStatusText,
                  { color: bed.occupied ? '#ef4444' : '#10b981' }
                ]}>
                  {bed.occupied ? 'Occupied' : 'Available'}
                </Text>
              </View>
            </View>
            
            {bed.occupied && (
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>
                  {bed.studentId?.studentName || "Unknown Student"}
                </Text>
                <Text style={styles.studentDetails}>
                  Roll No: {bed.studentId?.rollNo || "N/A"}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  // 🔹 Render Block List
  const renderBlockItem = ({ item }: { item: any }) => {
    const { totalRooms, totalBeds, occupiedBeds } = getBlockStats(item);
    const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100) || 0;
    console.log("item",item)
    
    return (
      <TouchableOpacity
        style={styles.blockCard}
        onPress={() => setSelectedBlock(item)}
      >
        <View style={styles.blockHeader}>
          <View style={styles.blockIconContainer}>
            <FontAwesome5 
              name="building" 
              size={24} 
              color="#3b82f6" 
            />
          </View>
          <View style={styles.blockInfo}>
            <Text style={styles.blockTitle}>{item.name}</Text>
            <Text style={styles.blockType}>
              {item.gender === 'Boys' ? 'Male Block' : 'Female Block'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>

        <View style={styles.blockStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalRooms}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalBeds}</Text>
            <Text style={styles.statLabel}>Beds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: occupancyRate > 80 ? '#ef4444' : '#10b981' }]}>
              {occupancyRate}%
            </Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
        </View>
        
        <View style={styles.occupancyBar}>
          <View 
            style={[
              styles.occupancyFill, 
              { 
                width: `${occupancyRate}%`,
                backgroundColor: occupancyRate > 80 ? '#ef4444' : 
                                occupancyRate > 50 ? '#f59e0b' : '#10b981'
              }
            ]} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading hostel data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <Dialog.Container visible={showDialog}>
        <Dialog.Title>Confirm Unallocation</Dialog.Title>
        <Dialog.Description>
          This will remove ALL students from {targetBlock}. This action cannot be undone.
        </Dialog.Description>
        <View style={styles.dialogButtons}>
          <Dialog.Button 
            label="Cancel" 
            onPress={() => setShowDialog(false)} 
            color="#6b7280"
          />
          <Dialog.Button 
            label="Unallocate" 
            onPress={confirmUnallocate} 
            color="#dc2626"
          />
        </View>
      </Dialog.Container>

      {!selectedBlock ? (
        <View style={styles.blocksContainer}>
         
          <FlatList
            data={blocks}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={renderBlockItem}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          />
        </View>
      ) : !selectedRoom ? (
        <FlatList
          data={[selectedBlock]} // Pass as array to work with FlatList
          keyExtractor={(item) => item.name}
          renderItem={() => (
            <View style={styles.detailContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedBlock(null);
                  setSelectedRoom(null);
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
                <Text style={styles.backText}>Back to Blocks</Text>
              </TouchableOpacity>
              {renderRoomsGrid()}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      ) : (
        <FlatList
          data={[selectedRoom]} // Pass as array to work with FlatList
          keyExtractor={(item) => item.roomNumber}
          renderItem={() => (
            <View style={styles.detailContainer}>
              <TouchableOpacity
                onPress={() => setSelectedRoom(null)}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
                <Text style={styles.backText}>Back to Rooms</Text>
              </TouchableOpacity>
              {renderRoomDetails()}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280"
  },
  blocksContainer: {
    flex: 1
  },
  detailContainer: {
    flex: 1
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 8, // Reduced from 16
    paddingBottom: 4
  },
  mainSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    paddingHorizontal: 16,
    paddingBottom: 12 // Reduced from 16
  },
  
  // Block Cards
  blockCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12, // Reduced from 16
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12 // Reduced from 16
  },
  blockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  blockInfo: {
    flex: 1
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  blockType: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2
  },
  blockStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  statItem: {
    alignItems: "center",
    flex: 1
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937"
  },
  statLabel: {
    fontSize: 12,
    color: "##6b7280",
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb"
  },
  occupancyBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden"
  },
  occupancyFill: {
    height: "100%",
    borderRadius: 3
  },
  
  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12, // Reduced from 16
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  backText: {
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 8
  },
  
  // Rooms
  roomsContainer: {
    padding: 12 // Reduced from 16
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12 // Reduced from 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2 // Reduced from 4
  },
  unallocateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  unallocateBtnText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12, // Reduced from 16
    gap: 12
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6
  },
  legendText: {
    fontSize: 12,
    color: "#6b7280"
  },
  roomBox: {
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    padding: 8,
  },
  roomBoxContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    position: "relative"
  },
  roomSelected: {
    borderWidth: 2,
    borderColor: "#3b82f6"
  },
  roomAvailable: { backgroundColor: "#a7f3d0" },
  roomPartial: { backgroundColor: "#fef3c7" },
  roomFull: { backgroundColor: "#fecaca" },
  roomBlocked: { backgroundColor: "#d1d5db" },
  roomText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
    marginBottom: 4
  },
  roomStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  bedsCount: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
    marginLeft: 4
  },
  roomStatus: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "uppercase"
  },
  blockedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingIndicator: {
    position: "absolute",
    top: 4,
    left: 4
  },
  
  // Room Details
  roomDetails: {
    padding: 12 // Reduced from 16
  },
  roomDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  roomSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12 // Reduced from 16
  },
  blockButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  blockButtonActive: {
    backgroundColor: "#dc2626"
  },
  unblockButton: {
    backgroundColor: "#10b981"
  },
  blockButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6
  },
  bedsContainer: {
    gap: 12
  },
  bedCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bedOccupied: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444"
  },
  bedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  bedInfo: {
    flexDirection: "row",
    alignItems: "center"
  },
  bedText: {
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8
  },
  bedStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  bedStatusText: {
    fontSize: 12,
    fontWeight: "600"
  },
  studentInfo: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4
  },
  studentDetails: {
    fontSize: 14,
    color: "#6b7280"
  },
  
  // Dialog
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end"
  }
});