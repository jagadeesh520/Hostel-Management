import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Warden = { _id: string; name: string; block: string };

export default function BlocksChild() {
  const router = useRouter();
  const [wardens, setWardens] = useState<Warden[]>([]);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const res = await axios.get("https://api.sjtechsol.com/api/wardens", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWardens(res.data || []);
    } catch (e) {
      console.error(e); Alert.alert("Error", "Failed to load blocks.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Blocks</Text>
      <FlatList
        data={wardens}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/dashboards/WardenDashboard/StudentListScreen", params: { blockName: item.block } })}
          >
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons name="office-building" size={22} color="#2D3436" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.block} Block</Text>
              <Text style={styles.cardSub}>Warden: {item.name}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9AA0A6" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: "#6B7280" }}>No blocks found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  title: { fontSize: 20, fontWeight: "800", margin: 16, color: "#2D3436" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 16, marginBottom: 10, borderRadius: 14, elevation: 2 },
  iconBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "700", fontSize: 16, color: "#111827" },
  cardSub: { color: "#6B7280", marginTop: 2 },
});
