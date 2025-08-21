import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type MenuItem = { name: string; category: string; imageUrl?: string | null };
type MenuDoc = { date: string; items: MenuItem[] };

const BASE_URL = "http://192.168.29.83:5000";

export default function MenuChild() {
  const [menu, setMenu] = useState<MenuDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWarden, setIsWarden] = useState(false); // token presence == warden UI

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
      setIsWarden(!!token);

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const date = todayIST();

      // GET does NOT need token. We pass it only if present.
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
    if (!isWarden) {
      Alert.alert("Not allowed", "Only wardens can modify the menu.");
      return;
    }
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
      if (!token) {
        Alert.alert("Not allowed", "Only wardens can modify the menu.");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const date = menu?.date || todayIST();

      // Try DELETE with query params; fallback to POST body
      try {
        await axios.delete(`${BASE_URL}/api/menu/item`, {
          headers,
          params: { date, category, name },
        });
      } catch {
        await axios.post(
          `${BASE_URL}/api/menu/removeItem`,
          { date, category, name },
          { headers }
        );
      }

      // Optimistic update
      setMenu((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter(
            (it) => !(it.category === category && it.name === name)
          ),
        };
      });
    } catch (e: any) {
      console.error(e?.response?.data || e.message);
      Alert.alert(
        "Delete failed",
        e?.response?.data?.message || "Unable to delete item"
      );
    }
  };

  // Flatten list (sorted by category then name for stable render)
  const flatItems = useMemo(() => {
    const arr = [...(menu?.items || [])];
    arr.sort((a, b) => {
      if (a.category === b.category) return a.name.localeCompare(b.name);
      return a.category.localeCompare(b.category);
    });
    return arr;
  }, [menu]);

  const renderItem = ({ item }: { item: MenuItem }) => {
    const hasImg = !!item.imageUrl;
    const uri =
      hasImg && item.imageUrl?.startsWith("http")
        ? item.imageUrl!
        : hasImg
        ? `${BASE_URL}${item.imageUrl}`
        : null;

    return (
      <View style={styles.row}>
        <View style={styles.thumbWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <MaterialCommunityIcons
                name="image-off"
                size={20}
                color="#9CA3AF"
              />
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.secondary} numberOfLines={1}>
            {item.category}
          </Text>
        </View>

        {isWarden ? (
          <TouchableOpacity
            onPress={() => confirmDelete(item.category, item.name)}
            style={styles.trailingBadge}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.trailingBadgeText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        Today’s Menu{" "}
        <Text style={styles.headerCount}>({flatItems.length})</Text>
        {loading ? " …" : ""}
      </Text>

      <FlatList
        data={flatItems}
        keyExtractor={(it, idx) => `${it.category}-${it.name}-${idx}`}
        contentContainerStyle={styles.listPad}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No menu items for today.</Text>
        }
        refreshing={loading}
        onRefresh={load}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  headerCount: { color: "#6B7280", fontWeight: "700" },
  listPad: { paddingHorizontal: 14, paddingBottom: 28 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14, // bigger padding
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  thumbWrap: {
    width: 60, // bigger image
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 14,
  },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  meta: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" }, // bigger font
  secondary: { marginTop: 4, fontSize: 13, color: "#6B7280" },

  trailingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  trailingBadgeText: {
    fontSize: 18,
    lineHeight: 18,
    color: "#6B7280",
    fontWeight: "900",
  },

  sep: { height: 12 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 28, fontSize: 15 },
});
