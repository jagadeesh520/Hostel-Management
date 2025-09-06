import { API_BASE_URL } from "@/constants/config";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Grid constants (4 columns, uniform squares) ---
const NUM_COLS = 4;
const GAP = 12;                // spacing between tiles
const SCREEN_W = Dimensions.get("window").width;
// parent container has padding: 12 left + 12 right
const PARENT_PAD = 24;
const TOTAL_GAPS = GAP * (NUM_COLS - 1);
const ITEM = Math.floor((SCREEN_W - PARENT_PAD - TOTAL_GAPS) / NUM_COLS);

export default function WardenHostelView() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'blocks' | 'floors' | 'rooms' | 'room-details'>('blocks');
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get(`${API_BASE_URL}/api/hostels/create`, {
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

  // Calculate occupancy stats for a block
  const getBlockStats = (block: any) => {
    let totalBeds = 0;
    let occupied = 0;
    let totalRooms = 0;
    
    block.floors.forEach((f: any) => {
      totalRooms += f.rooms.length;
      f.rooms.forEach((r: any) => {
        totalBeds += r.beds.length;
        occupied += r.beds.filter((b: any) => b.occupied).length;
      });
    });
    
    return { totalBeds, occupied, totalRooms };
  };

  // Calculate occupancy stats for a floor
  const getFloorStats = (floor: any) => {
    let totalBeds = 0;
    let occupied = 0;
    
    floor.rooms.forEach((r: any) => {
      totalBeds += r.beds.length;
      occupied += r.beds.filter((b: any) => b.occupied).length;
    });
    
    return { totalBeds, occupied, totalRooms: floor.rooms.length };
  };

  // 🔹 Render Blocks List
  const renderBlocks = () => (
    <FlatList
      data={blocks}
      keyExtractor={(item) => item.name}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
      renderItem={({ item }) => {
        const { totalBeds, occupied, totalRooms } = getBlockStats(item);
        const occupancyRate = Math.round((occupied / totalBeds) * 100) || 0;
        
        return (
          <TouchableOpacity
            style={styles.blockCard}
            onPress={() => {
              setSelectedBlock(item);
              setViewMode('floors');
            }}
          >
            <View style={styles.blockHeader}>
              <View style={[styles.blockIconContainer, { backgroundColor: item.gender === 'Boys' ? '#dbeafe' : '#fce7f3' }]}>
                <FontAwesome5 
                  name="building" 
                  size={20} 
                  color={item.gender === 'Boys' ? '#2563EB' : '#EC4899'} 
                />
              </View>
              <View style={styles.blockInfo}>
                <Text style={styles.blockTitle}>{item.name}</Text>
                <Text style={styles.blockSubtitle}>{item.gender} Block</Text>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </View>
            
            <View style={styles.statsContainer}>
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
      }}
    />
  );

  // 🔹 Render Floors List
  const renderFloors = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            setSelectedBlock(null);
            setViewMode('blocks');
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back to Blocks</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedBlock.name} - Floors</Text>
      </View>
      
      <FlatList
        data={selectedBlock.floors}
        keyExtractor={(item, index) => `floor-${index}`}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => {
          const { totalBeds, occupied, totalRooms } = getFloorStats(item);
          const occupancyRate = Math.round((occupied / totalBeds) * 100) || 0;
          
          return (
            <TouchableOpacity
              style={styles.floorCard}
              onPress={() => {
                setSelectedFloor(item);
                setViewMode('rooms');
              }}
            >
              <View style={styles.floorHeader}>
                <View style={styles.floorIconContainer}>
                  <MaterialIcons name="layers" size={24} color="#8b5cf6" />
                  <Text style={styles.floorNumber}>Floor {item.floorNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
              
              <View style={styles.statsContainer}>
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
        }}
      />
    </View>
  );

  // 🔹 Render Rooms Grid
  const renderRooms = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            setSelectedFloor(null);
            setViewMode('floors');
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back to Floors</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedBlock.name} - Floor {selectedFloor.floorNumber}
        </Text>
      </View>
      
      <FlatList
        data={selectedFloor.rooms}
        numColumns={NUM_COLS}
        keyExtractor={(item) => item.roomNumber}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item, index }) => {
          const occupied = item.beds.filter((b: any) => b.occupied).length;
          const total = item.beds.length;
          const occupancyRate = Math.round((occupied / total) * 100);
          
          return (
            <TouchableOpacity
              style={[
                styles.roomBox,
                getRoomStyle(item),
                {
                  width: ITEM,
                  height: ITEM,
                  marginRight: index % NUM_COLS !== NUM_COLS - 1 ? GAP : 0,
                  marginBottom: GAP,
                },
              ]}
              onPress={() => {
                if (item.isBlocked) {
                  Alert.alert("Blocked", `Room ${item.roomNumber} is blocked by admin`);
                } else {
                  setSelectedRoom(item);
                  setViewMode('room-details');
                }
              }}
            >
              <View style={styles.roomBoxContent}>
                <Text style={styles.roomText}>{item.roomNumber}</Text>
                <View style={styles.roomStats}>
                  <Text style={styles.bedsCount}>
                    {occupied}/{total}
                  </Text>
                  <Text style={styles.occupancyText}>{occupancyRate}%</Text>
                </View>
                {item.isBlocked && (
                  <View style={styles.blockedBadge}>
                    <Text style={styles.blockedText}>Blocked</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  // 🔹 Render Room Details
  const renderRoomDetails = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            setSelectedRoom(null);
            setViewMode('rooms');
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back to Rooms</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room {selectedRoom.roomNumber}</Text>
      </View>
      
      <View style={styles.roomDetailsContainer}>
        <View style={styles.roomSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Beds</Text>
            <Text style={styles.summaryValue}>{selectedRoom.beds.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Occupied</Text>
            <Text style={styles.summaryValue}>
              {selectedRoom.beds.filter((b: any) => b.occupied).length}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={styles.summaryValue}>
              {selectedRoom.beds.filter((b: any) => !b.occupied).length}
            </Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Bed Details</Text>
        
        {selectedRoom.beds.map((bed: any) => (
          <View
            key={bed.bedNumber}
            style={[styles.bedCard, bed.occupied ? styles.bedOccupied : styles.bedAvailable]}
          >
            <View style={styles.bedHeader}>
              <View style={styles.bedNumberContainer}>
                <Ionicons 
                  name="bed" 
                  size={20} 
                  color={bed.occupied ? "#ef4444" : "#10b981"} 
                />
                <Text style={styles.bedNumber}>Bed {bed.bedNumber}</Text>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: bed.occupied ? '#fef2f2' : '#f0fdf4' }
              ]}>
                <Text style={[
                  styles.statusText, 
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading hostel data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {viewMode === 'blocks' && renderBlocks()}
      {viewMode === 'floors' && renderFloors()}
      {viewMode === 'rooms' && renderRooms()}
      {viewMode === 'room-details' && renderRoomDetails()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#F9FAFB"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280"
  },
  
  // Header
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff"
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  backText: {
    color: "#3b82f6",
    fontWeight: "500",
    marginLeft: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  
  // Block Cards
  blockCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  blockHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12 
  },
  blockIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  blockSubtitle: { 
    fontSize: 14, 
    color: "#6b7280",
    marginTop: 2
  },
  arrowContainer: {
    marginLeft: "auto"
  },
  
  // Floor Cards
  floorCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  floorIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  floorNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8
  },
  
  // Stats
  statsContainer: {
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
    color: "#6b7280",
    marginTop: 2
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb"
  },
  
  // Occupancy Bar
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
  
  // Rooms
  roomBox: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    padding: 8,
  },
  roomBoxContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%"
  },
  roomText: { 
    fontWeight: "700", 
    fontSize: 14, 
    color: "#111827",
    marginBottom: 4
  },
  roomStats: {
    alignItems: "center"
  },
  bedsCount: { 
    fontSize: 12, 
    color: "#374151",
    fontWeight: "600"
  },
  occupancyText: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2
  },
  roomAvailable: { backgroundColor: "#dcfce7" }, // green
  roomPartial: { backgroundColor: "#fef3c7" }, // yellow
  roomFull: { backgroundColor: "#fee2e2" }, // red
  roomBlocked: { backgroundColor: "#f3f4f6" }, // grey
  blockedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#9ca3af",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  blockedText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700"
  },
  
  // Room Details
  roomDetailsContainer: {
    flex: 1,
    padding: 16
  },
  roomSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    alignItems: "center"
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16
  },
  
  // Bed Cards
  bedCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bedAvailable: {
    borderLeftWidth: 4,
    borderLeftColor: "#10b981"
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
  bedNumberContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  bedNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
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
  }
});