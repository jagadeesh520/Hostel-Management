import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios, { AxiosError } from "axios";
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


export default function ManageWardens() {
  const [wardenName, setWardenName] = useState("");
  const [assignedBlock, setAssignedBlock] = useState("");
  const [hostelBlocks, setHostelBlocks] = useState<string[]>([]);
  const [wardens, setWardens] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchHostelBlocks();
    fetchWardens();
  }, []);

  const fetchHostelBlocks = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");

      if (!token) {
        Alert.alert("Authentication Error", "User not logged in.");
        return;
      }

      const res = await axios.get(
        "https://api.sjtechsol.com/api/hostels/create",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { Boys, Girls } = res.data;

      const combined = [
        ...Boys.map((b: string) => `${b} - Boys`),
        ...Girls.map((g: string) => `${g} - Girls`),
      ];

      setHostelBlocks(combined);
    } catch (err: any) {
      console.error("Fetch hostel blocks failed:", err);
      if (err.response?.status === 401) {
        Alert.alert("Unauthorized", "Session expired or invalid token.");
      } else if (err.response?.status === 404) {
        Alert.alert(
          "Not Found",
          "The hostel fetch route does not exist on the server."
        );
      } else {
        Alert.alert("Error", "Failed to load hostel blocks");
      }
    }
  };
  const fetchWardens = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get("https://api.sjtechsol.com/api/wardens", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (Array.isArray(res.data) && res.data.length === 0) {
        console.log("No wardens found.");
        setWardens([]); // or set empty list
      } else {
        setWardens(res.data);
      }
    } catch (err) {
      console.error("Error fetching wardens:");
      Alert.alert("Error", "Failed to fetch wardens. Please try again.");
    }
  };

  const parseBlock = (blockStr: string) => {
    const [block, type] = blockStr.split(" - ").map((s) => s.trim());
    return { block, hostelType: type };
  };

  const handleAssignOrUpdateWarden = async () => {
    if (!wardenName || !assignedBlock) {
      Alert.alert(
        "Validation Error",
        "Please enter warden name and select a block."
      );
      return;
    }

    const { block, hostelType } = parseBlock(assignedBlock);

    try {
      const token = await AsyncStorage.getItem("adminToken");

      if (!token) {
        Alert.alert("Authentication Error", "User not logged in.");
        return;
      }

      const payload = {
        name: wardenName,
        phone: "0000000000", // Optionally replace this with a phone input field later
        block,
        hostelType,
      };

      const url = isEditing
        ? `https://api.sjtechsol.com/api/wardens/${editId}` // ✅ PUT with id
        : "https://api.sjtechsol.com/api/wardens"; // ✅ POST for new

      const method = isEditing ? "put" : "post";

      const response = await axios[method](url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          "Success",
          isEditing
            ? "Warden updated successfully"
            : "Warden assigned successfully"
        );
      } else {
        Alert.alert("Error", "Unexpected response from server");
      }

      // Clear form and refresh
      setWardenName("");
      setAssignedBlock("");
      setIsEditing(false);
      setEditId(null);
      fetchWardens(); // Refresh list
    } catch (error) {
      const err = error as AxiosError;

      console.error("Save warden failed:", err);

      const backendError = err.response?.data as { message?: string }; // ✅ Type assertion here

      const message = backendError?.message || "Failed to save warden";

      Alert.alert("Error", message);
    }
  };

  const handleEdit = (warden: any) => {
    setWardenName(warden.name);
    setAssignedBlock(`${warden.block} - ${warden.hostelType}`);
    setIsEditing(true);
    setEditId(warden._id);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isEditing ? "Update Warden" : "Assign Warden to Hostel Block"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Warden Name"
        value={wardenName}
        onChangeText={setWardenName}
      />

      <View style={styles.dropdown}>
        <Picker
          selectedValue={assignedBlock}
          onValueChange={(value: string) => setAssignedBlock(value)}
        >
          <Picker.Item label="Select Hostel Block" value="" />
          {hostelBlocks.map((block, index) => (
            <Picker.Item key={index} label={block} value={block} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleAssignOrUpdateWarden}
      >
        <Text style={styles.buttonText}>
          {isEditing ? "Update Warden" : "Assign Warden"}
        </Text>
      </TouchableOpacity>

      <View style={styles.wardenList}>
        <Text style={styles.sectionTitle}>Assigned Wardens:</Text>
        {wardens.length > 0 ? (
          wardens.map((warden, index) => (
            <TouchableOpacity key={index} onPress={() => handleEdit(warden)}>
              <Text style={styles.wardenItem}>
                {warden.name} ➝ {warden.block} - {warden.hostelType}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            No wardens assigned yet.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#34495e",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#2ecc71",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2c3e50",
  },
  wardenList: {
    marginTop: 10,
  },
  wardenItem: {
    fontSize: 16,
    paddingVertical: 8,
    color: "#555",
    backgroundColor: "#ecf0f1",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 5,
  },
});
