// AddMenu.tsx
import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type MenuItem = { name: string; category: string; imageUri?: string | null };

const CATEGORIES = ["Veg", "NonVeg"];

/** ---------- helpers ---------- */

const guessMime = (ext: string) => {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  return "image/jpeg";
};

// Ensure we have a streamable file:// URI. For content://, try to copy into cache.
// Uses runtime-safe access to FileSystem cache/document directory to avoid TS typing issues.
async function ensureFileUri(inputUri: string | null | undefined) {
  try {
    if (!inputUri) return null;
    // already a file:// URI
    if (inputUri.startsWith("file://")) return inputUri;

    // runtime-safe access — cast to any to avoid TS errors if typings don't include cacheDirectory
    const fsAny = FileSystem as any;
    const runtimeCacheDir: string | undefined =
      fsAny.cacheDirectory ?? fsAny.documentDirectory ?? undefined;

    // determine extension from uri (or default to jpg)
    const extFromName = (() => {
      const tail = inputUri.split("?")[0].split("#")[0];
      const dot = tail.lastIndexOf(".");
      const ext = dot >= 0 ? tail.slice(dot + 1) : "";
      return ext && ext.length <= 5 ? ext : "jpg";
    })();

    // if we have a writable cache/document dir, attempt to copy into it
    if (runtimeCacheDir) {
      const dest = `${runtimeCacheDir}menu_${Date.now()}.${extFromName}`;
      try {
        await FileSystem.copyAsync({ from: inputUri, to: dest });
        return dest;
      } catch (copyErr) {
        // copy failed — fall through to getInfo check below
        // console.log("copyAsync failed:", copyErr);
      }
    }

    // Some URIs (content:// on Android) may be readable directly; check existence
    try {
      const info = await FileSystem.getInfoAsync(inputUri);
      if (info.exists) return inputUri;
    } catch (infoErr) {
      // getInfoAsync may throw for some schemes; ignore and return null
      // console.log("getInfoAsync failed:", infoErr);
    }

    return null;
  } catch {
    return null;
  }
}

async function probeServer(baseUrl: string) {
  try {
    await axios.get(`${baseUrl}/api/menu?date=1970-01-01`, { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

/** ---------- component ---------- */

export default function AddMenu() {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.log("Image picker error:", err?.message || err);
      Alert.alert("Error", "Could not open image library.");
    }
  };

  const addItem = () => {
    const name = itemName.trim();
    if (!name) {
      Alert.alert("Item name required");
      return;
    }
    setItems((prev) => [...prev, { name, category, imageUri: imageUri ?? null }]);
    setItemName("");
    setImageUri(null);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const it of items) {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it);
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

      // 0) Reachability probe (clear, early failure if LAN/bind issue)
      const reachable = await probeServer(`${API_BASE_URL}`);
      if (!reachable) {
        Alert.alert(
          "Cannot reach server",
          "Ensure phone & server are on the same Wi-Fi and server listens on 0.0.0.0. Try opening the URL on your phone’s browser."
        );
        return;
      }

      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) {
        Alert.alert("Error", "Warden not logged in.");
        return;
      }

      // 1) Prepare images in the SAME order as items to compute stable imageIndex per item.
      const imageFiles: { uri: string; name: string; type: string }[] = [];
      const imageIndexPerItem: (number | null)[] = new Array(items.length).fill(null);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.imageUri) {
          const ensured = await ensureFileUri(it.imageUri);
          if (ensured) {
            const ext =
              ensured.split(".").pop()?.toLowerCase() ||
              (Platform.OS === "ios" ? "jpg" : "jpeg");
            const name = `item_${imageFiles.length}.${ext}`;
            const type = guessMime(ext);
            imageIndexPerItem[i] = imageFiles.length;
            imageFiles.push({ uri: ensured, name, type });
          } else {
            imageIndexPerItem[i] = null;
          }
        }
      }

      // 2) Build form data
      const form = new FormData();
      const itemsWithImageIndex = items.map((it, i) => ({
        name: it.name,
        category: it.category,
        imageIndex: imageIndexPerItem[i],
      }));

      form.append("date", todayIST());
      form.append("items", JSON.stringify(itemsWithImageIndex));
      imageFiles.forEach((f) => {
        // @ts-ignore RN FormData file shape
        form.append("images", { uri: f.uri, name: f.name, type: f.type });
      });

      // 3) Send (explicit multipart header + RN-safe transform)
      await axios.post(`${API_BASE_URL}/api/menu`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 20000,
        transformRequest: (data) => data, // don't let axios stringify FormData in RN
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      Alert.alert("Success", "Today's menu saved.");
      setItems([]);
      setItemName("");
      setImageUri(null);
    } catch (e: any) {
      console.log("Upload error:", e?.message, e?.response?.data || "");
      Alert.alert(
        "Failed to save menu",
        e?.response?.data?.message || e?.message || "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Add Today’s Menu</Text>

      {/* Category */}
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

      {/* Image picker */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
          <MaterialCommunityIcons name="image-plus" size={18} color="#fff" />
          <Text style={styles.pickBtnText}>
            {imageUri ? "Change Image" : "Pick Image (optional)"}
          </Text>
        </TouchableOpacity>

        {imageUri ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: imageUri }} style={styles.thumb} />
          </View>
        ) : null}
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

        {Object.entries(grouped).map(([cat, list]) => (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupTitle}>{cat}</Text>
            <View style={styles.chips}>
              {list.map((it, idx) => {
                const indexInItems = items.findIndex(
                  (x) =>
                    x.name === it.name &&
                    x.category === it.category &&
                    x.imageUri === it.imageUri
                );
                return (
                  <View key={`${cat}-${it.name}-${idx}`} style={styles.chip}>
                    {it.imageUri ? (
                      <Image source={{ uri: it.imageUri }} style={styles.chipImg} />
                    ) : (
                      <View style={styles.chipImgPlaceholder}>
                        <MaterialCommunityIcons name="image-off" size={14} color="#fff" />
                      </View>
                    )}
                    <Text style={styles.chipText}>{it.name}</Text>
                    <TouchableOpacity
                      onPress={() => indexInItems > -1 && removeItem(indexInItems)}
                    >
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                );
              })}
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
        <Text style={styles.saveBtnText}>
          {saving ? "Saving..." : "Save Today’s Menu"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/** ---------- styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB", padding: 16 },
  header: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
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

  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6D28D9",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  pickBtnText: { color: "#fff", fontWeight: "700" },

  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  thumb: { width: "100%", height: "100%" },

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
  chipImg: { width: 20, height: 20, borderRadius: 999 },
  chipImgPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
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
