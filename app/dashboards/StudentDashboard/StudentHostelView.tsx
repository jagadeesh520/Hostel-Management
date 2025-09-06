import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [bookingInProgress, setBookingInProgress] = useState(false);
  
  const insets = useSafeAreaInsets();

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
      setBookingInProgress(true);
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
    } finally {
      setBookingInProgress(false);
    }
  };

  // ✅ Already booked → show allocation
  if (myBooking) {
    const bookedBlock =
      assignedBlocks.find((b) => b.blockName === myBooking.blockName) || null;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Hostel Allocation</Text>
        </View>
        
        <View style={styles.allocationCard}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text style={styles.allocationTitle}>Booking Confirmed</Text>
          <Text style={styles.allocationSubtitle}>Your room has been successfully allocated</Text>

          <View style={styles.allocationDivider} />

          <View style={styles.allocationRow}>
            <View style={styles.allocationIconContainer}>
              <Ionicons name="person" size={20} color="#3b82f6" />
            </View>
            <View style={styles.allocationTextContainer}>
              <Text style={styles.allocationLabel}>Student</Text>
              <Text style={styles.allocationText}>
                {student?.studentName} ({student?.rollNo})
              </Text>
            </View>
          </View>

          <View style={styles.allocationRow}>
            <View style={styles.allocationIconContainer}>
              <Ionicons name="business" size={20} color="#3b82f6" />
            </View>
            <View style={styles.allocationTextContainer}>
              <Text style={styles.allocationLabel}>Block</Text>
              <Text style={styles.allocationText}>
                {myBooking.blockName}
                {bookedBlock?.type ? ` (${bookedBlock.type})` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.allocationRow}>
            <View style={styles.allocationIconContainer}>
              <MaterialCommunityIcons name="door" size={20} color="#3b82f6" />
            </View>
            <View style={styles.allocationTextContainer}>
              <Text style={styles.allocationLabel}>Room</Text>
              <Text style={styles.allocationText}>{myBooking.roomNumber}</Text>
            </View>
          </View>

          <View style={styles.allocationRow}>
            <View style={styles.allocationIconContainer}>
              <Ionicons name="bed" size={20} color="#3b82f6" />
            </View>
            <View style={styles.allocationTextContainer}>
              <Text style={styles.allocationLabel}>Bed</Text>
              <Text style={styles.allocationText}>{myBooking.bedNumber}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading hostel information...</Text>
      </View>
    );
  }

  // 🔹 Room grid grouped by floor (outer scroll handles all floors)
  const RoomGrid = ({ block }: { block: any }) => {
    const floors = block?.floors || [];

    return (
      <View style={styles.roomsContainer}>
        <Text style={styles.sectionTitle}>
          Available Rooms in {block?.blockName} {block?.type ? `(${block.type})` : ""}
        </Text>
        <Text style={styles.sectionSubtitle}>
          Select a room to view available beds
        </Text>

        {floors.map((floor: any, idx: number) => (
          <View key={idx} style={{ marginBottom: 20 }}>
            <View style={styles.floorHeader}>
              <Ionicons name="layers" size={20} color="#6b7280" />
              <Text style={styles.floorTitle}>
                {ordinal(floor.floorNumber)} Floor
              </Text>
            </View>

            <FlatList
              data={floor.rooms}
              numColumns={NUM_COLS}
              keyExtractor={(item) => item.roomNumber}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const availableBeds = item.beds?.filter((bed: any) => !bed.occupied).length || 0;
                const totalBeds = item.beds?.length || 0;
                
                return (
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
                      } else if (availableBeds === 0) {
                        Alert.alert("Full", "This room has no available beds");
                      } else {
                        setSelectedRoom(item);
                      }
                    }}
                  >
                    <View style={styles.roomBoxContent}>
                      <Text style={styles.roomText}>{item.roomNumber}</Text>
                      <View style={styles.roomStats}>
                        <Ionicons name="bed" size={12} color="#6b7280" />
                        <Text style={styles.bedsCount}>
                          {availableBeds}/{totalBeds}
                        </Text>
                      </View>
                      {item.isBlocked && (
                        <View style={styles.blockedBadge}>
                          <Text style={styles.blockedText}>Blocked</Text>
                        </View>
                      )}
                      {availableBeds === 0 && !item.isBlocked && (
                        <View style={styles.fullBadge}>
                          <Text style={styles.fullText}>Full</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ))}
      </View>
    );
  };

  // 🔹 Beds in selected room
  const RoomBeds = ({ room }: { room: any }) => {
    const availableBeds = room.beds.filter((bed: any) => !bed.occupied);
    
    return (
      <View style={styles.roomDetails}>
        <View style={styles.roomDetailsHeader}>
          <Text style={styles.sectionTitle}>Room {room.roomNumber}</Text>
          <Text style={styles.roomSubtitle}>
            {availableBeds.length} bed{availableBeds.length !== 1 ? 's' : ''} available
          </Text>
        </View>
        
        {room.beds.map((bed: any) => (
          <TouchableOpacity
            key={bed.bedNumber}
            style={[
              styles.bedCard,
              bed.occupied ? styles.bedOccupied : styles.bedAvailable,
            ]}
            disabled={bed.occupied || bookingInProgress}
            onPress={() => bookBed(room.roomNumber, bed.bedNumber)}
          >
            <View style={styles.bedHeader}>
              <View style={styles.bedInfo}>
                <Ionicons 
                  name="bed" 
                  size={20} 
                  color={bed.occupied ? "#9ca3af" : "#3b82f6"} 
                />
                <Text style={[
                  styles.bedText,
                  bed.occupied && styles.bedTextOccupied
                ]}>
                  Bed {bed.bedNumber}
                </Text>
              </View>
              <View style={[
                styles.bedStatus,
                { backgroundColor: bed.occupied ? '#f3f4f6' : '#dbeafe' }
              ]}>
                <Text style={[
                  styles.bedStatusText,
                  { color: bed.occupied ? '#6b7280' : '#2563eb' }
                ]}>
                  {bed.occupied ? 'Occupied' : 'Available'}
                </Text>
              </View>
            </View>
            
            {bed.occupied ? (
              <Text style={styles.occupantText}>
                Occupied by {bed.studentId?.studentName || "Unknown"}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => bookBed(room.roomNumber, bed.bedNumber)}
                disabled={bookingInProgress}
              >
                {bookingInProgress ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.bookButtonText}>Book This Bed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      {!assignedBlocks.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="business" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No Block Assigned</Text>
          <Text style={styles.emptyStateText}>
            You haven't been assigned to any hostel block yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {/* Block switcher if multiple blocks */}
          {assignedBlocks.length > 1 && (
            <View style={styles.blockSwitcherContainer}>
              <Text style={styles.blockSwitcherTitle}>Select Block</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.blockSwitcher}
              >
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
              </ScrollView>
            </View>
          )}

          {/* Back to rooms when inside a room */}
          {selectedRoom && (
            <TouchableOpacity
              onPress={() => setSelectedRoom(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="#3b82f6" />
              <Text style={styles.backText}>Back to Rooms</Text>
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
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280"
  },
  
  // Block switcher
  blockSwitcherContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  blockSwitcherTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12
  },
  blockSwitcher: {
    flexDirection: "row",
  },
  blockPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8
  },
  blockPillActive: {
    backgroundColor: "#3b82f6",
  },
  blockPillText: { 
    color: "#6b7280", 
    fontWeight: "500" 
  },
  blockPillTextActive: { 
    color: "#fff" 
  },

  // Rooms
  roomsContainer: { 
    padding: 16 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#111827",
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16
  },
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8
  },
  roomBox: {
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
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
  roomBlocked: { 
    backgroundColor: "#fef2f2" 
  },
  roomText: { 
    fontWeight: "700", 
    fontSize: 14, 
    color: "#111827",
    marginBottom: 4
  },
  roomStats: {
    flexDirection: "row",
    alignItems: "center"
  },
  bedsCount: { 
    fontSize: 12, 
    color: "#6b7280",
    fontWeight: "500",
    marginLeft: 4
  },
  blockedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  blockedText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700"
  },
  fullBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#9ca3af",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  fullText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700"
  },

  // Room Details
  roomDetails: { 
    padding: 16 
  },
  roomDetailsHeader: {
    marginBottom: 16
  },
  roomSubtitle: {
    fontSize: 14,
    color: "#6b7280"
  },
  bedCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
  bedInfo: {
    flexDirection: "row",
    alignItems: "center"
  },
  bedText: { 
    fontWeight: "600", 
    color: "#111827",
    marginLeft: 8
  },
  bedTextOccupied: {
    color: "#9ca3af"
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
  occupantText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic"
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  bookButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8
  },

  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  backText: { 
    color: "#3b82f6", 
    fontWeight: "500",
    marginLeft: 8
  },

  // Allocation Card
  allocationCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: "center"
  },
  successIconContainer: {
    marginBottom: 16
  },
  allocationTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 8,
    textAlign: "center"
  },
  allocationSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24
  },
  allocationDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    width: "100%",
    marginBottom: 24
  },
  allocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    width: "100%"
  },
  allocationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  allocationTextContainer: {
    flex: 1
  },
  allocationLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4
  },
  allocationText: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#111827" 
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center"
  }
});