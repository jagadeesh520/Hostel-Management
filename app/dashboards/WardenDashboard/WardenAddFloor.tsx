import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
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

const API_BASE = "http://192.168.29.83:5000/api/hostels";

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

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      const res = await axios.get<{ Boys: Block[]; Girls: Block[] }>(
        `${API_BASE}/create`,
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
    setRoomBeds(Array(parseInt(roomCount)).fill("")); // reset per-room beds
  };

  const handleAddFloor = () => {
    if (!selectedBlock) return Alert.alert("Error", "Select a block first");
    if (!floorNumber || !roomCount) return Alert.alert("Error", "Fill all fields");

    const rooms: Room[] = [];
    for (let i = 0; i < parseInt(roomCount); i++) {
      const beds = parseInt(roomBeds[i] || "0");
      if (!beds) return Alert.alert("Error", `Enter beds for room ${i + 1}`);
      rooms.push({
        roomNumber: `${floorNumber}${(i + 1).toString().padStart(2, "0")}`,
        beds: Array.from({ length: beds }, (_, idx) => ({ bedNumber: idx + 1 })),
      });
    }

    const newFloor: Floor = { floorNumber: parseInt(floorNumber), rooms };
    setPreview([...preview, newFloor]);

    setFloorNumber("");
    setRoomCount("");
    setRoomBeds([]);
  };

  const handleSubmit = async () => {
    if (!selectedBlock) return Alert.alert("Error", "Please select a block");

    try {
      const token = await AsyncStorage.getItem("wardenToken");
      await axios.post(
        `${API_BASE}/warden/add-floor`,
        { blockName: selectedBlock.name, floors: preview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Floors added successfully!");
      setPreview([]);
      fetchBlocks();
    } catch (err: any) {
      console.error("Error saving floors:", err?.response?.data || err);
      Alert.alert("Error", err?.response?.data?.error || "Failed to save floors");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }} // padding to prevent overlap
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
          placeholder="Floor Number"
          value={floorNumber}
          onChangeText={setFloorNumber}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Number of Rooms"
          value={roomCount}
          onChangeText={setRoomCount}
          keyboardType="numeric"
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={handleGenerateRooms}>
          <Text style={styles.buttonText}>Generate Rooms</Text>
        </TouchableOpacity>

        {roomBeds.map((beds, idx) => (
          <TextInput
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
          />
        ))}

        <TouchableOpacity style={styles.button} onPress={handleAddFloor}>
          <Text style={styles.buttonText}>Add Floor</Text>
        </TouchableOpacity>

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
            <TouchableOpacity style={[styles.button, { backgroundColor: "#10B981" }]} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit to Backend</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  previewContainer: { marginVertical: 16, padding: 12, backgroundColor: "#fff", borderRadius: 8 },
  button: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
