import { API_BASE_URL } from "@/constants/config";
import axios from "axios";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function FaceUpdateChainScreen() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [doneEmbed, setDoneEmbed] = useState(false);
  const [doneIndex, setDoneIndex] = useState(false);

  const makeUrl = (endpoint: string) => {
    return API_BASE_URL.endsWith("/")
      ? `${API_BASE_URL}api/attendance/${endpoint}`
      : `${API_BASE_URL}/api/attendance/${endpoint}`;
  };

  const runChain = async () => {
    try {
      setLoading(true);
      setDoneEmbed(false);
      setDoneIndex(false);

      // Step 1: Store embeddings
      setStep("Storing embeddings...");
      const embedUrl = makeUrl("store-embeddings");
      const res1 = await axios.post(embedUrl, {}, { timeout: 60000 });
      console.log("Embeddings response:", res1.data);
      if (!res1.data.success) throw new Error(res1.data.message);
      setDoneEmbed(true);

      // Step 2: Build FAISS index
      setStep("Building FAISS index...");
      const indexUrl = makeUrl("build-index");
      const res2 = await axios.post(indexUrl, {}, { timeout: 60000 });
      console.log("Index response:", res2.data);
      if (!res2.data.success) throw new Error(res2.data.message);
      setDoneIndex(true);

      // Final message
      Alert.alert("✅ Completed", "Embeddings stored & FAISS index built successfully.");
      setStep("All steps done ✅");
    } catch (err: any) {
      console.error("❌ Error:", err?.response?.data || err.message || err);
      Alert.alert("❌ Error", err?.response?.data?.message || err.message || "Process failed");
      setStep("Failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face Recognition Update</Text>

      <TouchableOpacity style={styles.button} onPress={runChain} disabled={loading}>
        <Text style={styles.buttonText}>Run Full Update</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="blue" />
          <Text style={{ marginTop: 10 }}>{step}</Text>
        </View>
      )}

      <View style={styles.steps}>
        <Text style={doneEmbed ? styles.done : styles.pending}>
          {doneEmbed ? "✔" : "○"} Embeddings
        </Text>
        <Text style={doneIndex ? styles.done : styles.pending}>
          {doneIndex ? "✔" : "○"} FAISS Index
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  button: { backgroundColor: "#1E90FF", padding: 15, marginVertical: 10, borderRadius: 8, width: "70%" },
  buttonText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
  loading: { marginTop: 20, alignItems: "center" },
  steps: { marginTop: 30, alignItems: "flex-start" },
  done: { fontSize: 16, color: "green", marginVertical: 5 },
  pending: { fontSize: 16, color: "gray", marginVertical: 5 },
});
