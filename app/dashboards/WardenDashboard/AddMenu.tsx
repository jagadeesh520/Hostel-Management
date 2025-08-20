import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import React, { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type MenuItem = { name: string; category: string };

const CATEGORIES = [
  "Veg",
  "NonVeg",
];

const BASE_URL = "http://192.168.29.83:5000";

export default function AddMenu() {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Rice");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [saving, setSaving] = useState(false);

  const todayIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const addItem = () => {
    const name = itemName.trim();
    if (!name) return;
    setItems((prev) => [...prev, { name, category }]);
    setItemName("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const it of items) {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it.name);
    }
    return map;
  }, [items]);

  const saveMenu = async () => {
    if (items.length === 0) {
      Alert.alert("Add at least one item");
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        date: todayIST(),
        // blockName: "Godavari", // OPTIONAL if you want block-wise menus
        items,
      };

      await axios.post(`${BASE_URL}/api/menu`, payload, { headers });
      Alert.alert("Success", "Today's menu saved.");
      setItems([]);
    } catch (e: any) {
      console.error(e?.response?.data || e.message);
      Alert.alert("Error", e?.response?.data?.message || "Failed to save menu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Add Today’s Menu</Text>

      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={category}
              onValueChange={(v) => setCategory(String(v))}
              style={{ height: 55 }}
            >
              {CATEGORIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Item form */}
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g., Plain Rice"
            style={styles.input}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={addItem}>
        <MaterialCommunityIcons name="plus" size={18} color="#fff" />
        <Text style={styles.addBtnText}>Add Item</Text>
      </TouchableOpacity>

      {/* Preview */}
      <View style={styles.preview}>
        <Text style={styles.sectionTitle}>Preview</Text>
        {Object.keys(grouped).length === 0 && (
          <Text style={{ color: "#6B7280" }}>No items added yet</Text>
        )}
        {Object.entries(grouped).map(([cat, names]) => (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupTitle}>{cat}</Text>
            <View style={styles.chips}>
              {names.map((n, idx) => (
                <View key={`${cat}-${n}-${idx}`} style={styles.chip}>
                  <Text style={styles.chipText}>{n}</Text>
                  <TouchableOpacity onPress={() => {
                    // remove only this occurrence
                    const indexInItems = items.findIndex(it => it.name === n && it.category === cat);
                    if (indexInItems > -1) removeItem(indexInItems);
                  }}>
                    <MaterialCommunityIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={saveMenu}
        disabled={saving}
      >
        <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Today’s Menu"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB", padding: 16 },
  header: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 12 },

  row: { flexDirection: "row", gap: 12, marginBottom: 10 },
  inputWrap: { flex: 1 },
  label: { color: "#374151", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },

  preview: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  sectionTitle: { fontWeight: "800", color: "#111827", marginBottom: 10 },
  group: { marginBottom: 8 },
  groupTitle: { fontWeight: "700", color: "#1F2937", marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: "#fff", fontWeight: "700" },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 16,
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
