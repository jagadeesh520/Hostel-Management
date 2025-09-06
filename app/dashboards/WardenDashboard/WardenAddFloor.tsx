import { API_BASE_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
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
  const [activeStep, setActiveStep] = useState<number>(1); // 1: Select block, 2: Add details, 3: Preview

  const floorRef = useRef<TextInput | null>(null);
  const countRef = useRef<TextInput | null>(null);
  const bedRefs = useRef<Array<TextInput | null>>([]);

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
    setRoomBeds(Array(n).fill(""));
    bedRefs.current = Array(n).fill(null);
    setActiveStep(3);
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
    setActiveStep(2);
    Alert.alert("Success", "Floor added to preview. You can add more floors or submit.");
  };

  const handleSubmit = async () => {
    if (!selectedBlock) return Alert.alert("Error", "Please select a block");
    if (preview.length === 0) return Alert.alert("Error", "No floors to submit");

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
      setActiveStep(1);
    } catch (err: any) {
      console.error("Error saving floors:", err?.response?.data || err);
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to save floors"
      );
    }
  };

  const FOOTER_HEIGHT = 64;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* Header with progress steps */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Floors & Rooms</Text>
            <View style={styles.stepContainer}>
              <View style={styles.step}>
                <View style={[styles.stepIcon, activeStep >= 1 && styles.activeStep]}>
                  <Text style={[styles.stepText, activeStep >= 1 && styles.activeStepText]}>1</Text>
                </View>
                <Text style={[styles.stepLabel, activeStep >= 1 && styles.activeStepLabel]}>Select Block</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.step}>
                <View style={[styles.stepIcon, activeStep >= 2 && styles.activeStep]}>
                  <Text style={[styles.stepText, activeStep >= 2 && styles.activeStepText]}>2</Text>
                </View>
                <Text style={[styles.stepLabel, activeStep >= 2 && styles.activeStepLabel]}>Add Details</Text>
              </View>
              <View style={styles.stepDivider} />
              <View style={styles.step}>
                <View style={[styles.stepIcon, activeStep >= 3 && styles.activeStep]}>
                  <Text style={[styles.stepText, activeStep >= 3 && styles.activeStepText]}>3</Text>
                </View>
                <Text style={[styles.stepLabel, activeStep >= 3 && styles.activeStepLabel]}>Preview</Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={{
              paddingBottom: insets.bottom + FOOTER_HEIGHT + 24,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentInsetAdjustmentBehavior="always"
          >
            {/* Step 1: Select Block */}
            {activeStep >= 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Block</Text>
                <Text style={styles.sectionSubtitle}>Choose a block to add floors and rooms</Text>
                <View style={styles.blocksContainer}>
                  {blocks.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedBlock(item);
                        setActiveStep(2);
                      }}
                      style={[
                        styles.blockItem,
                        selectedBlock?.name === item.name && styles.selectedBlock,
                      ]}
                    >
                      <Ionicons 
                        name="business" 
                        size={24} 
                        color={selectedBlock?.name === item.name ? "#3b82f6" : "#6b7280"} 
                      />
                      <Text style={[
                        styles.blockText,
                        selectedBlock?.name === item.name && styles.selectedBlockText
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Step 2: Add Floor Details */}
            {activeStep >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add Floor Details</Text>
                <Text style={styles.sectionSubtitle}>Enter information about the floor and rooms</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Floor Number</Text>
                  <TextInput
                    ref={floorRef}
                    placeholder="e.g., 1, 2, 3..."
                    value={floorNumber}
                    onChangeText={setFloorNumber}
                    keyboardType="numeric"
                    style={styles.input}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => countRef.current?.focus()}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Number of Rooms</Text>
                  <TextInput
                    ref={countRef}
                    placeholder="e.g., 10, 20, 30..."
                    value={roomCount}
                    onChangeText={setRoomCount}
                    keyboardType="numeric"
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={handleGenerateRooms}
                  />
                </View>

                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRooms}>
                  <Text style={styles.generateButtonText}>Generate Room Inputs</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Room Details */}
            {activeStep >= 3 && roomBeds.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Room Configuration</Text>
                <Text style={styles.sectionSubtitle}>Specify number of beds for each room</Text>
                
                {roomBeds.map((beds, idx) => (
                  <View key={idx} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Room {floorNumber}{(idx + 1).toString().padStart(2, "0")}
                    </Text>
                    <TextInput
                      ref={(r) => {
                        bedRefs.current[idx] = r;
                      }}
                      placeholder="Number of beds"
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
                  </View>
                ))}
              </View>
            )}

            {/* Preview Section */}
            {preview.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <Text style={styles.sectionSubtitle}>Review before submitting</Text>
                
                <View style={styles.previewContainer}>
                  {preview.map((floor, idx) => (
                    <View key={idx} style={styles.previewItem}>
                      <View style={styles.previewHeader}>
                        <Ionicons name="layers" size={20} color="#3b82f6" />
                        <Text style={styles.previewTitle}>Floor {floor.floorNumber}</Text>
                      </View>
                      <View style={styles.roomsContainer}>
                        {floor.rooms.map((room) => (
                          <View key={room.roomNumber} style={styles.roomItem}>
                            <Text style={styles.roomText}>Room {room.roomNumber}</Text>
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{room.beds.length} Beds</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit All Floors</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Fixed footer */}
          {activeStep >= 2 && (
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity style={styles.addButton} onPress={handleAddFloor}>
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.addButtonText}>Add Floor to Preview</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#F9FAFB" 
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  step: {
    alignItems: "center",
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStep: {
    backgroundColor: "#3b82f6",
  },
  stepText: {
    color: "#9ca3af",
    fontWeight: "bold",
  },
  activeStepText: {
    color: "#fff",
  },
  stepLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  activeStepLabel: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  stepDivider: {
    width: 40,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  blocksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  blockItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  selectedBlock: { 
    backgroundColor: "#dbeafe", 
    borderColor: "#3b82f6",
  },
  blockText: {
    marginLeft: 8,
    color: "#374151",
    fontWeight: "500",
  },
  selectedBlockText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: "#8b5cf6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginLeft: 8,
  },
  roomsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roomText: {
    fontSize: 14,
    color: "#475569",
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: "transparent",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});