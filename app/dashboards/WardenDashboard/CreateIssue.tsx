import React, { useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Issue = { _id: string; title: string; status: string };

export default function IssuesChild() {
  const [issues, setIssues] = useState<Issue[]>([]);

 /*  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) return Alert.alert("Error", "Warden not logged in.");
      const res = await axios.get("http://192.168.29.83:5000/api/issues", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIssues(res.data || []);
    } catch (e) { console.error(e); Alert.alert("Error", "Unable to load issues."); }
  }; */

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Open Request</Text>
      <FlatList
        data={issues}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[
              styles.card,
              { borderLeftColor: item.status === "open" ? "#EB5757" : "#6FCF97" }
            ]}>
            <MaterialCommunityIcons
              name={item.status === "open" ? "alert-circle-outline" : "check-circle-outline"}
              size={22}
              color={item.status === "open" ? "#EB5757" : "#27AE60"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.issueTitle}>{item.title}</Text>
              <Text style={styles.issueSub}>Status: {item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: "#6B7280" }}>No issues.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  title: { fontSize: 20, fontWeight: "800", margin: 16, color: "#2D3436" },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2, borderLeftWidth: 5 },
  issueTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  issueSub: { color: "#6B7280", marginTop: 2 },
});
