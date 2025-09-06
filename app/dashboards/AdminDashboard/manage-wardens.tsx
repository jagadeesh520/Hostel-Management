import { API_BASE_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Block {
  name: string;
  floors: any[];
  _id: string;
}

interface HostelData {
  Boys: Block[];
  Girls: Block[];
}

interface Warden {
  _id: string;
  name: string;
  block: string;
  hostelType: string;
  phone?: string;
  createdAt?: string;
  __v?: number;
}

export default function ManageWardens() {
  const [wardenName, setWardenName] = useState("");
  const [assignedBlock, setAssignedBlock] = useState("");
  const [hostelBlocks, setHostelBlocks] = useState<string[]>([]);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(true);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchHostelBlocks();
    fetchWardens();
  }, []);

  const fetchHostelBlocks = async () => {
    try {
      setBlocksLoading(true);
      const token = await AsyncStorage.getItem("adminToken");

      if (!token) {
        Alert.alert("Authentication Error", "User not logged in.");
        return;
      }

      const res = await axios.get<HostelData>(
        `${API_BASE_URL}/api/hostels/create`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Hostel API Response:", res.data);

      // Extract block names from the Boys and Girls arrays
      const { Boys, Girls } = res.data;
      
      const boysBlocks = Boys.map(block => `${block.name} - Boys`);
      const girlsBlocks = Girls.map(block => `${block.name} - Girls`);
      
      const combined = [...boysBlocks, ...girlsBlocks];
      setHostelBlocks(combined);
      
      if (combined.length === 0) {
        Alert.alert("Info", "No hostel blocks found. Please create blocks first.");
      }
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
        Alert.alert("Error", "Failed to load hostel blocks. Please check the server response structure.");
      }
    } finally {
      setBlocksLoading(false);
      setLoading(false);
    }
  };

  const fetchWardens = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get<Warden[]>(`${API_BASE_URL}/api/wardens`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Wardens API Response:", res.data);
      setWardens(res.data);
    } catch (err) {
      console.error("Error fetching wardens:", err);
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
      setSubmitting(true);
      const token = await AsyncStorage.getItem("adminToken");

      if (!token) {
        Alert.alert("Authentication Error", "User not logged in.");
        return;
      }

      const payload = {
        name: wardenName,
        phone: "0000000000",
        block,
        hostelType,
      };

      const url = isEditing
        ? `${API_BASE_URL}/api/wardens/${editId}`
        : `${API_BASE_URL}/api/wardens`;

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
      }

      // Clear form and refresh
      setWardenName("");
      setAssignedBlock("");
      setIsEditing(false);
      setEditId(null);
      fetchWardens();
    } catch (error) {
      const err = error as AxiosError;
      console.error("Save warden failed:", err);

      const backendError = err.response?.data as { message?: string };
      const message = backendError?.message || "Failed to save warden";

      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (warden: Warden) => {
    setWardenName(warden.name);
    setAssignedBlock(`${warden.block} - ${warden.hostelType}`);
    setIsEditing(true);
    setEditId(warden._id);
  };

  const handleDelete = async (wardenId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this warden?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("adminToken");
              await axios.delete(`${API_BASE_URL}/api/wardens/${wardenId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              
              Alert.alert("Success", "Warden deleted successfully");
              fetchWardens();
            } catch (error) {
              console.error("Delete warden failed:", error);
              Alert.alert("Error", "Failed to delete warden");
            }
          }
        }
      ]
    );
  };

  const handleCancelEdit = () => {
    setWardenName("");
    setAssignedBlock("");
    setIsEditing(false);
    setEditId(null);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={[
        styles.container, 
        { paddingBottom: insets.bottom + 20 } // Added bottom padding for safe area
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditing ? "Update Warden" : "Assign Warden to Block"}
        </Text>
        <Text style={styles.subtitle}>
          Manage warden assignments to hostel blocks
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Warden Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter warden's full name"
            value={wardenName}
            onChangeText={setWardenName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Assign to Block</Text>
          {blocksLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingTextSmall}>Loading blocks...</Text>
            </View>
          ) : hostelBlocks.length > 0 ? (
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
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <Text style={styles.errorText}>
                No blocks available. Please create hostel blocks first.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {isEditing && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancelEdit}
              disabled={submitting}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton, (hostelBlocks.length === 0 || submitting) && styles.buttonDisabled]}
            onPress={handleAssignOrUpdateWarden}
            disabled={hostelBlocks.length === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons 
                  name={isEditing ? "refresh" : "add"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.buttonText}>
                  {isEditing ? "Update Warden" : "Assign Warden"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.wardenList}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Wardens</Text>
          <TouchableOpacity onPress={fetchWardens} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        
        {wardens.length > 0 ? (
          wardens.map((warden) => (
            <View key={warden._id} style={styles.wardenItem}>
              <View style={styles.wardenInfo}>
                <Text style={styles.wardenName}>{warden.name}</Text>
                <Text style={styles.wardenBlock}>
                  {warden.block} - {warden.hostelType}
                </Text>
                {warden.createdAt && (
                  <Text style={styles.wardenDate}>
                    Assigned on: {new Date(warden.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.wardenActions}>
                <TouchableOpacity 
                  onPress={() => handleEdit(warden)}
                  style={styles.editButton}
                >
                  <Ionicons name="create" size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDelete(warden._id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No wardens assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Assign a warden to a hostel block to get started
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9fafb",
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    gap: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  loadingTextSmall: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    flex: 1,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  submitButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  wardenList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  refreshButton: {
    padding: 8,
  },
  wardenItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  wardenInfo: {
    flex: 1,
  },
  wardenName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  wardenBlock: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  wardenDate: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  wardenActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 6,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});