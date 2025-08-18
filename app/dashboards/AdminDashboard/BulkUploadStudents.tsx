// screens/BulkUploadStudents.tsx
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const BulkUploadStudents = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: "*/*", // allow all, filter manually
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const name = file.name;
        const uri = file.uri;

        // Only accept CSV files
        if (!name.toLowerCase().endsWith(".csv")) {
          Alert.alert("Invalid file", "Please select a CSV file");
          return;
        }

        setFileName(name);
        setFileUri(uri);
        console.log("Picked file:", name, uri);
      } else {
        Alert.alert("Cancelled", "No file selected");
      }
    } catch (err) {
      console.error("DocumentPicker Error:", err);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const uploadFile = async () => {
    if (!fileUri || !fileName) {
      Alert.alert("No file selected", "Please pick a CSV file first");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: "text/csv",
    } as any);

    try {
      const res = await axios.post(
        "http://192.168.29.83:5000/api/students/bulk-upload-students",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      Alert.alert("Success", `Uploaded ${res.data.count} students`);
      setFileName(null);
      setFileUri(null);
    } catch (err) {
      console.error("Upload Error:", err);
      Alert.alert("Error", "Failed to upload CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Students Login Details</Text>

      <TouchableOpacity style={styles.button} onPress={pickFile}>
        <Text style={styles.buttonText}>
          {fileName ? `Selected: ${fileName}` : "Pick CSV File"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#4b7bec" }]}
        onPress={uploadFile}
        disabled={loading || !fileUri}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Upload</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default BulkUploadStudents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f6fa",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2c3e50",
    marginBottom: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
