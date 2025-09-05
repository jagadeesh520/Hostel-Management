import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

//const API_BASE = `${API_BASE_URL}/api/hostels`;

interface Bed {
  bedNumber: number;
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
  floors?: Floor[];
}

export default function WardenAddFloor() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [roomCount, setRoomCount] = useState<string>("");
  const [roomBeds, setRoomBeds] = useState<string[]>([]);
  const [preview, setPreview] = useState<Floor[]>([]);

  // Refs so the "Next" key focuses the next input
  const floorRef = useRef<TextInput | null>(null);
  const countRef = useRef<TextInput | null>(null);
  const bedRefs = useRef<Array<TextInput | null>>([]);

  // Safe area for proper bottom spacing (system nav / home indicator)
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get<{ Boys: Block[]; Girls: Block[] }>(
        `${API_BASE_URL}/api/hostels/create`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlocks([...res.data.Boys, ...res.data.Girls]);
    } catch (err) {
      console.error("Error fetching blocks:", err);
      Alert.alert("Error", "Failed to load blocks");
    }
  };

  const handleGenerateRooms = () => {
    if (!floorNumber || !roomCount) {
      Alert.alert("Error", "Enter floor number and room count first");
      return;
    }
    const n = parseInt(roomCount);
    if (!n || n < 1) {
      Alert.alert("Error", "Enter a valid number of rooms");
      return;
    }
    setRoomBeds(Array(n).fill("")); // reset per-room beds
    bedRefs.current = Array(n).fill(null); // clear refs
  };

  const handleAddFloor = () => {
    if (!selectedBlock) return Alert.alert("Error", "Select a block first");
    if (!floorNumber || !roomCount)
      return Alert.alert("Error", "Fill all fields");

    const rooms: Room[] = [];
    for (let i = 0; i < parseInt(roomCount); i++) {
      const beds = parseInt(roomBeds[i] || "0");
      if (!beds) return Alert.alert("Error", `Enter beds for room ${i + 1}`);
      rooms.push({
        roomNumber: `${floorNumber}${(i + 1).toString().padStart(2, "0")}`,
        beds: Array.from({ length: beds }, (_, idx) => ({
          bedNumber: idx + 1,
        })),
      });
    }

    const newFloor: Floor = { floorNumber: parseInt(floorNumber), rooms };
    setPreview((p) => [...p, newFloor]);

    setFloorNumber("");
    setRoomCount("");
    setRoomBeds([]);
    bedRefs.current = [];
  };

  const handleSubmit = async () => {
    if (!selectedBlock) return Alert.alert("Error", "Please select a block");

    try {
      const token = await AsyncStorage.getItem("wardenToken");
      await axios.post(
        `${API_BASE_URL}/api/hostels/warden/add-floor`,
        { blockName: selectedBlock.name, floors: preview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Floors added successfully!");
      setPreview([]);
      fetchBlocks();
    } catch (err: any) {
      console.error("Error saving floors:", err?.response?.data || err);
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to save floors"
      );
    }
  };

  // Height of the fixed footer (approx) to pad the ScrollView bottom content
  const FOOTER_HEIGHT = 64;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={{
              paddingBottom: insets.bottom + FOOTER_HEIGHT + 24, // leave room for fixed footer
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentInsetAdjustmentBehavior="always"
          >
            <Text style={styles.heading}>Select Block:</Text>
            {blocks.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedBlock(item)}
                style={[
                  styles.blockItem,
                  selectedBlock?.name === item.name && styles.selectedBlock,
                ]}
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              ref={floorRef}
              placeholder="Floor Number"
              value={floorNumber}
              onChangeText={setFloorNumber}
              keyboardType="numeric"
              style={styles.input}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => countRef.current?.focus()}
            />

            <TextInput
              ref={countRef}
              placeholder="Number of Rooms"
              value={roomCount}
              onChangeText={setRoomCount}
              keyboardType="numeric"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleGenerateRooms}
            />

            <TouchableOpacity style={styles.button} onPress={handleGenerateRooms}>
              <Text style={styles.buttonText}>Generate Rooms</Text>
            </TouchableOpacity>

            {roomBeds.map((beds, idx) => (
              <TextInput
                ref={(r) => {
                  bedRefs.current[idx] = r;
                }}
                key={idx}
                placeholder={`Beds for Room ${floorNumber}${(idx + 1)
                  .toString()
                  .padStart(2, "0")}`}
                value={beds}
                onChangeText={(txt) => {
                  const copy = [...roomBeds];
                  copy[idx] = txt;
                  setRoomBeds(copy);
                }}
                keyboardType="numeric"
                style={styles.input}
                returnKeyType={idx === roomBeds.length - 1 ? "done" : "next"}
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (idx < roomBeds.length - 1) {
                    bedRefs.current[idx + 1]?.focus();
                  }
                }}
              />
            ))}

            {preview.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={styles.heading}>Preview:</Text>
                {preview.map((floor, idx) => (
                  <View key={idx} style={{ marginTop: 8 }}>
                    <Text>Floor {floor.floorNumber}</Text>
                    {floor.rooms.map((room) => (
                      <Text key={room.roomNumber}>
                        Room {room.roomNumber} → Beds: {room.beds.length}
                      </Text>
                    ))}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#10B981" }]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.buttonText}>Submit to Backend</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Fixed footer: Add Floor button pinned above the system nav */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <TouchableOpacity style={styles.button} onPress={handleAddFloor}>
              <Text style={styles.buttonText}>Add Floor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  heading: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  blockItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  selectedBlock: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  previewContainer: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700" },

  // Fixed footer for the main action
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
