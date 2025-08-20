import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type MenuItem = { name: string; category: string };
type MenuDoc = { date: string; items: MenuItem[] };

const BASE_URL = "http://192.168.29.83:5000";

export default function MenuChild() {
  const [menu, setMenu] = useState<MenuDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const todayIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const headers = { Authorization: `Bearer ${token}` };
      const date = todayIST();

      const res = await axios.get<MenuDoc>(`${BASE_URL}/api/menu`, {
        params: { date },
        headers,
      });
      setMenu(res.data || { date, items: [] });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Unable to load menu.");
      setMenu({ date: todayIST(), items: [] });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (category: string, name: string) => {
    Alert.alert(
      "Remove item",
      `Delete "${name}" from ${category}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem(category, name),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteItem = async (category: string, name: string) => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const headers = { Authorization: `Bearer ${token}` };
      const date = menu?.date || todayIST();
      // const blockName = "Godavari"; // <- include if you use block-wise menus

      // 1) Try DELETE with query params
      try {
        await axios.delete(`${BASE_URL}/api/menu/item`, {
          headers,
          params: { date, category, name /*, blockName*/ },
        });
      } catch (err: any) {
        // 2) Fallback: POST /removeItem with JSON body
        await axios.post(
          `${BASE_URL}/api/menu/removeItem`,
          { date, category, name /*, blockName*/ },
          { headers }
        );
      }

      // Optimistic UI update
      setMenu((prev) => {
        if (!prev) return prev;
        const items = (prev.items || []).filter(
          (it) => !(it.category === category && it.name === name)
        );
        return { ...prev, items };
      });
    } catch (e: any) {
      console.error(e?.response?.data || e.message);
      Alert.alert(
        "Delete failed",
        e?.response?.data?.message || "Unable to delete item"
      );
    }
  };

  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    (menu?.items || []).forEach((it) => {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it.name);
    });
    return Object.entries(map).map(([category, names]) => ({
      category,
      names,
    }));
  }, [menu]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Today’s Menu ({menu?.items?.length || 0}) {loading ? "…" : ""}
      </Text>

      <FlatList
        data={grouped}
        keyExtractor={(i) => i.category}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.category}>{item.category}</Text>
            <View style={styles.chips}>
              {item.names.map((name, idx) => (
                <View key={`${item.category}-${idx}`} style={styles.chip}>
                  <Text style={styles.chipText}>{name}</Text>
                  <TouchableOpacity
                    onPress={() => confirmDelete(item.category, name)}
                    style={styles.chipClose}
                  >
                    <Text style={styles.chipCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#6B7280" }}>
            No menu items for today.
          </Text>
        }
        refreshing={loading}
        onRefresh={load}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  title: { fontSize: 20, fontWeight: "800", margin: 16, color: "#2D3436" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  category: { fontWeight: "800", color: "#111827", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2994A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: "#fff", fontWeight: "700" },
  chipClose: {
    marginLeft: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipCloseText: { color: "#fff", fontWeight: "900", lineHeight: 18 },
});
