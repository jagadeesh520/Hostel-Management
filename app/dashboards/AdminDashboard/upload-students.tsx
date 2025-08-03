import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as XLSX from "xlsx";

export default function StudentUploadScreen() {
  const [students, setStudents] = useState<any[]>([]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });

      if (res.assets && res.assets.length > 0) {
        const fileUri = res.assets[0].uri;
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const parsedData = XLSX.utils.sheet_to_json(sheet);
          setStudents(parsedData as any[]);
        };

        reader.readAsArrayBuffer(blob);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file. Please try again.");
    }
  };

 const handleUploadToServer = async () => {
  try {
    const token = await AsyncStorage.getItem("adminToken");

    if (!token) {
      alert("Not authenticated. Please log in.");
      return;
    }

    const response = await fetch("http://192.168.29.83:5000/api/students/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ students }),
    });

    const data = await response.json();
    console.log("data",data)

    if (response.ok) {
      alert("✅ Upload successful!");
      setStudents([]);
    } else {
      alert(`❌ Upload failed: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Upload Error:", err);
    alert("🚫 Upload failed. Please try again.");
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.infoTitle}>📄 Excel File Format Required:</Text>
        <ScrollView horizontal style={styles.tableWrapper}>
          <View style={styles.table}>
            <Text style={styles.tableHeader}>College Name</Text>
            <Text style={styles.tableCell}>ABC Engineering College</Text>
            <Text style={styles.tableCell}>XYZ Institute of Tech</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Student Name</Text>
            <Text style={styles.tableCell}>John Doe</Text>
            <Text style={styles.tableCell}>Jane Smith</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Gender</Text>
            <Text style={styles.tableCell}>Male</Text>
            <Text style={styles.tableCell}>Female</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Roll No</Text>
            <Text style={styles.tableCell}>12345</Text>
            <Text style={styles.tableCell}>67890</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Year</Text>
            <Text style={styles.tableCell}>1</Text>
            <Text style={styles.tableCell}>2</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Room No</Text>
            <Text style={styles.tableCell}>A101</Text>
            <Text style={styles.tableCell}>B203</Text>
          </View>

          <View style={styles.table}>
            <Text style={styles.tableHeader}>Block Name</Text>
            <Text style={styles.tableCell}>Alpha Block</Text>
            <Text style={styles.tableCell}>Beta Block</Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.sampleButton}
          onPress={() =>
            Linking.openURL("https://yourdomain.com/sample-student-upload.xlsx")
          }
        >
          <Text style={styles.sampleText}>⬇ Download Sample Template</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handlePickFile}>
          <Text style={styles.buttonText}>📁 Select Excel File</Text>
        </TouchableOpacity>

        {students.length > 0 && (
          <>
            <Text style={styles.previewTitle}>👀 Preview Data:</Text>
            {students.map((student, index) => (
              <View key={index} style={styles.studentItem}>
                <Text style={styles.studentText}>
                  {student["Student Name"]} | {student["College Name"]} |{" "}
                  {student["Gender"]} | {student["Roll No"]} | {student["Year"]}{" "}
                  | {student["Room No"]} | {student["Block Name"]}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadToServer}
            >
              <Text style={styles.uploadText}>🚀 Upload to Server</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff", // solid white
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  tableWrapper: {
    marginBottom: 20,
  },
  table: {
    marginRight: 16,
  },
  tableHeader: {
    fontWeight: "bold",
    fontSize: 16,
    backgroundColor: "#e0e0e0",
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "center",
  },
  tableCell: {
    padding: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlign: "center",
  },
  sampleButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  sampleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  studentItem: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    marginBottom: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  studentText: {
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: "#ffc107",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },
  uploadText: {
    fontWeight: "bold",
  },
});
