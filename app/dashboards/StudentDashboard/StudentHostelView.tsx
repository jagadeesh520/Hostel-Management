import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

//const API_BASE = `${API_BASE_URL}/api/hostels";

export default function StudentHostelView() {
  const [assignedBlock, setAssignedBlock] = useState<any | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [myBooking, setMyBooking] = useState<any | null>(null);

  useEffect(() => {
    fetchAssignedBlock();
    fetchMyBooking();
  }, []);

  // 🔹 Fetch assigned block (gender + year rule)
  const fetchAssignedBlock = async () => {
    try {
      const rollNo = await AsyncStorage.getItem("rollNo");
      const token = await AsyncStorage.getItem("studentToken");
      if (!rollNo || !token) return;

      const res = await axios.get(`${API_BASE_URL}/api/hostels/student/assigned-block/${rollNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // { type, blockName, floors, student }
      setAssignedBlock(res.data);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "No block assigned");
    }
  };

  // 🔹 Fetch student's booking
  const fetchMyBooking = async () => {
    try {
      const rollNo = await AsyncStorage.getItem("rollNo");
      const token = await AsyncStorage.getItem("studentToken");
      if (!rollNo || !token) return;

      const res = await axios.get(`${API_BASE_URL}/api/hostels/student/my-booking/${rollNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) setMyBooking(res.data);
    } catch (err: any) {
      console.log("No booking yet", err?.response?.data || err);
    }
  };

  // 🔹 Book bed
  const bookBed = async (roomNumber: string, bedNumber: number) => {
    try {
      const token = await AsyncStorage.getItem("studentToken");
      const rollNo = await AsyncStorage.getItem("rollNo");

      await axios.post(
        `${API_BASE_URL}/api/hostels/student/book-bed`,
        { blockName: assignedBlock.blockName, roomNumber, bedNumber, rollNo },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMyBooking({ blockName: assignedBlock.blockName, roomNumber, bedNumber });
      Alert.alert("Success", `You booked Bed ${bedNumber} in Room ${roomNumber}`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Booking failed");
    }
  };

  // ✅ Already booked → only show allocation
  if (myBooking) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>My Hostel Allocation</Text>
        <View style={styles.allocationCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.allocationTitle}>Booking Confirmed</Text>

          <View style={styles.allocationRow}>
            <Text style={styles.allocationIcon}>🏢</Text>
            <Text style={styles.allocationText}>
              {assignedBlock?.blockName} ({assignedBlock?.type})
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

  // 🔹 Show rooms
  const renderRooms = (floors: any[]) => {
    const allRooms: any[] = [];
    floors.forEach((floor: any) => allRooms.push(...floor.rooms));

    return (
      <View style={styles.roomsContainer}>
        <Text style={styles.sectionTitle}>
          Rooms in {assignedBlock.blockName} ({assignedBlock.type})
        </Text>
        <FlatList
          data={allRooms}
          numColumns={4}
          keyExtractor={(item) => item.roomNumber}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.roomBox,
                item.isBlocked && styles.roomBlocked,
                selectedRoom?.roomNumber === item.roomNumber && styles.roomSelected,
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
              {item.isBlocked && <Text style={styles.blockedLabel}>🚫</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // 🔹 Show beds inside a room
  const renderRoomDetails = (room: any) => (
    <View style={styles.roomDetails}>
      <Text style={styles.sectionTitle}>Room {room.roomNumber} - Beds</Text>
      {room.beds.map((bed: any) => (
        <TouchableOpacity
          key={bed.bedNumber}
          style={[styles.bedRow, bed.occupied ? styles.bedOccupied : styles.bedAvailable]}
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
      {!assignedBlock ? (
        <Text style={styles.sectionTitle}>No block assigned yet</Text>
      ) : (
        <>
          {selectedRoom && (
            <TouchableOpacity
              onPress={() => setSelectedRoom(null)}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>← Back to Rooms</Text>
            </TouchableOpacity>
          )}

          {renderRooms(assignedBlock.floors)}
          {selectedRoom && renderRoomDetails(selectedRoom)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#F9FAFB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

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
  allocationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  allocationIcon: { fontSize: 20, marginRight: 10 },
  allocationText: { fontSize: 16, fontWeight: "600", color: "#111827" },
});
