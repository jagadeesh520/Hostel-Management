import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


type HostelType = "Boys" | "Girls";

export default function CreateHostel() {
  const [hostelType, setHostelType] = useState<HostelType | null>(null);
  const [blocks, setBlocks] = useState<string[]>([""]);

  const [savedHostels, setSavedHostels] = useState<{
    Boys: string[];
    Girls: string[];
  }>({
    Boys: [],
    Girls: [],
  });

  const [editInfo, setEditInfo] = useState<{ type: HostelType; index: number } | null>(null);

  const handleAddBlock = () => {
    setBlocks([...blocks, ""]);
  };

  useEffect(() => {
  const fetchSavedHostels = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) return;

      const response = await fetch("http://192.168.29.83:5000/api/hostels/create", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedHostels({
          Boys: data.Boys || [],
          Girls: data.Girls || [],
        });
      } else {
        console.warn("Failed to fetch hostels");
      }
    } catch (err) {
      console.error("Error loading hostels:", err);
    }
  };

  fetchSavedHostels();
}, []);

  const handleBlockChange = (text: string, index: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[index] = text;
    setBlocks(updatedBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks.splice(index, 1);
    setBlocks(updatedBlocks);
  };

  const handleSave = () => {
    if (!hostelType) {
      Alert.alert("Validation", "Please select hostel type");
      return;
    }

    const validBlocks = blocks.filter((b) => b.trim() !== "");
    if (validBlocks.length === 0) {
      Alert.alert("Validation", "Please enter valid block names");
      return;
    }

    const updated = { ...savedHostels };
    if (editInfo) {
      updated[editInfo.type][editInfo.index] = validBlocks[0];
      setEditInfo(null);
    } else {
      updated[hostelType] = [...updated[hostelType], ...validBlocks];
    }

    setSavedHostels(updated);
    setBlocks([""]);
    Alert.alert("Success", "Block(s) added successfully");
  };

  const handleEditBlock = (type: HostelType, index: number) => {
    setHostelType(type);
    setBlocks([savedHostels[type][index]]);
    setEditInfo({ type, index });
  };

  const handleDeleteSavedBlock = (type: HostelType, index: number) => {
    const updated = { ...savedHostels };
    updated[type].splice(index, 1);
    setSavedHostels(updated);
  };

const handleSaveToBackend = async () => {
  try {
    const token = await AsyncStorage.getItem("adminToken");
    if (!token) {
      Alert.alert("Auth Error", "User not logged in");
      return;
    }

    const response = await fetch("http://192.168.29.83:5000/api/hostels/update", {
      method: "PUT", // <-- use PUT
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        boys: savedHostels.Boys.map(b => b.trim()),
        girls: savedHostels.Girls.map(g => g.trim()),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Success", "Hostel data updated on backend!");
    } else {
      console.error("Save failed:", data);
      Alert.alert("Failed", data.message || data.error || "Something went wrong");
    }
  } catch (error) {
    console.error("Backend error:", error);
    Alert.alert("Error", "Could not connect to backend");
  }
};



  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Select Hostel Type:</Text>
      <View style={styles.typeContainer}>
        {(["Boys", "Girls"] as HostelType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              hostelType === type && styles.typeButtonSelected,
            ]}
            onPress={() => {
              setHostelType(type);
              setEditInfo(null);
              setBlocks([""]);
            }}
          >
            <Text
              style={[
                styles.typeText,
                hostelType === type && styles.typeTextSelected,
              ]}
            >
              {type} Hostel
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Enter Block(s):</Text>
      {blocks.map((block, index) => (
        <View key={index} style={styles.blockRow}>
          <TextInput
            placeholder={`Block ${index + 1}`}
            style={styles.input}
            value={block}
            onChangeText={(text) => handleBlockChange(text, index)}
          />
          {blocks.length > 1 && (
            <TouchableOpacity
              onPress={() => handleDeleteBlock(index)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
        <Text style={styles.addButtonText}>+ Add Block</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {editInfo ? "Update Block" : "Save Block"}
        </Text>
      </TouchableOpacity>

      {/* Boys Hostel List */}
      {savedHostels.Boys.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏢 Boys Hostel Blocks:</Text>
          {savedHostels.Boys.map((block, index) => (
            <View key={index} style={styles.blockItem}>
              <Text style={styles.blockText}>{block}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleEditBlock("Boys", index)}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteSavedBlock("Boys", index)}
                >
                  <Text style={[styles.actionText, { color: "red" }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Girls Hostel List */}
      {savedHostels.Girls.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🏢 Girls Hostel Blocks:</Text>
          {savedHostels.Girls.map((block, index) => (
            <View key={index} style={styles.blockItem}>
              <Text style={styles.blockText}>{block}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleEditBlock("Girls", index)}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteSavedBlock("Girls", index)}
                >
                  <Text style={[styles.actionText, { color: "red" }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {(savedHostels.Boys.length > 0 || savedHostels.Girls.length > 0) && (
        <TouchableOpacity style={styles.finalSaveButton} onPress={handleSaveToBackend}>
          <Text style={styles.finalSaveText}>Save All to Backend</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop:5,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#34495e",
  },
  typeContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#aaa",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  typeButtonSelected: {
    backgroundColor: "#2980b9",
    borderColor: "#2980b9",
  },
  typeText: {
    fontSize: 16,
    color: "#333",
  },
  typeTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  deleteButton: {
    marginLeft: 10,
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#e67e22",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#2c3e50",
  },
  blockItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  blockText: {
    fontSize: 16,
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 20,
  },
  actionText: {
    fontWeight: "bold",
    color: "#2980b9",
  },
  finalSaveButton: {
    backgroundColor: "#2ecc71",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 50,
  },
  finalSaveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
