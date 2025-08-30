import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";

const API_BASE = "http://192.168.29.83:5000/api/hostels";

export default function AdminBlockRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  // Form state
  const [gender, setGender] = useState("Male");
  const [year, setYear] = useState("1st Year");
  const [ruleBlock, setRuleBlock] = useState("");
  const [editingRule, setEditingRule] = useState<any | null>(null);

  useEffect(() => {
    fetchRules();
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get(`${API_BASE}/create`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allBlocks = [...res.data.Boys, ...res.data.Girls];
      setBlocks(allBlocks);
      if (allBlocks.length > 0) setRuleBlock(allBlocks[0].name);
    } catch {
      Alert.alert("Error", "Failed to load blocks");
    }
  };

  const fetchRules = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const res = await axios.get(`${API_BASE}/admin/block-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules(res.data);
    } catch {
      Alert.alert("Error", "Failed to load rules");
    }
  };

  const saveRule = async () => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      await axios.post(
        `${API_BASE}/admin/set-block-rule`,
        { gender, year, blockName: ruleBlock },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Rule saved successfully");
      setEditingRule(null);
      fetchRules();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to save rule");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem("adminToken");
      await axios.delete(`${API_BASE}/admin/block-rule/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Deleted", "Rule removed");
      fetchRules();
    } catch {
      Alert.alert("Error", "Failed to delete rule");
    }
  };

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
  ];
  const yearOptions = [
    { label: "1st Year", value: "1st Year" },
    { label: "2nd Year", value: "2nd Year" },
    { label: "3rd Year", value: "3rd Year" },
    { label: "4th Year", value: "4th Year" },
  ];
  const blockOptions = blocks.map((b) => ({ label: b.name, value: b.name }));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Block Assignment Rules</Text>

      {/* Add Rule button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          setEditingRule({}); // empty object for new rule
          setGender("Male");
          setYear("1st Year");
          setRuleBlock(blocks.length > 0 ? blocks[0].name : "");
        }}
      >
        <Text style={styles.addBtnText}>+ Add Rule</Text>
      </TouchableOpacity>

      {/* List of rules */}
      <FlatList
        data={rules}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <Text style={styles.ruleText}>
              👤 {item.gender} | 🎓 {item.year} → 🏢 {item.blockName}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.updateBtn}
                onPress={() => {
                  setEditingRule(item);
                  setGender(item.gender);
                  setYear(item.year);
                  setRuleBlock(item.blockName);
                }}
              >
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteRule(item._id)}
              >
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Modal for Add/Edit */}
      <Modal visible={!!editingRule} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingRule && editingRule._id ? "Edit Rule" : "Add Rule"}
            </Text>

            {/* Gender */}
            <Dropdown
              style={styles.dropdown}
              data={genderOptions}
              labelField="label"
              valueField="value"
              value={gender}
              onChange={(item) => setGender(item.value)}
            />

            {/* Year */}
            <Dropdown
              style={styles.dropdown}
              data={yearOptions}
              labelField="label"
              valueField="value"
              value={year}
              onChange={(item) => setYear(item.value)}
            />

            {/* Block */}
            <Dropdown
              style={styles.dropdown}
              data={blockOptions}
              labelField="label"
              valueField="value"
              value={ruleBlock}
              onChange={(item) => setRuleBlock(item.value)}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRule}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingRule(null)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#F9FAFB" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  ruleCard: {
    backgroundColor: "#E0F2FE",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  ruleText: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  updateBtn: {
    backgroundColor: "#2563EB",
    padding: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  deleteBtn: { backgroundColor: "#DC2626", padding: 8, borderRadius: 6 },
  btnText: { color: "white", fontWeight: "600" },

  // Add Rule button
  addBtn: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  addBtnText: { color: "white", fontWeight: "700", fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  dropdown: {
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },
  saveBtn: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelBtn: { backgroundColor: "#6B7280", padding: 10, borderRadius: 8 },
});
