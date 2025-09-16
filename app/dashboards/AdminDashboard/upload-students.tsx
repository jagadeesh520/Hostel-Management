import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
  FlatList,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import * as XLSX from "xlsx";

export default function StudentUploadScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = createStyles(isDark);

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

      const response = await fetch(`${API_BASE_URL}/api/students/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students }),
      });

      const data = await response.json();
      console.log("data", data);

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

  const renderStudentItem = ({ item }: { item: any }) => (
    <View style={styles.studentItem}>
      <Text style={styles.studentText}>
        {item["Student Name"]} | {item["College Name"]} | {item["Gender"]} |{" "}
        {item["Roll No"]} | {item["Year"]} | {item["Room No"]} |{" "}
        {item["Block Name"]} | {item["Address"] || "-"} |{" "}
        {item["Student Phone"] || "-"} | {item["Parent Phone"] || "-"}
      </Text>
    </View>
  );

  const listHeader = () => (
    <>
      <Text style={styles.infoTitle}>📄 Excel File Format Required:</Text>
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          data={[
            "College Name",
            "Student Name",
            "Gender",
            "Roll No",
            "Year",
            "Room No",
            "Block Name",
            "Address",
            "Student Phone",
            "Parent Phone",
          ]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={styles.table}>
              <Text style={styles.tableHeader}>{item}</Text>
              <Text style={styles.tableCell}>Example 1</Text>
              <Text style={styles.tableCell}>Example 2</Text>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

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
        <Text style={styles.previewTitle}>👀 Preview Data:</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#000" : "#fff"}
      />

      <FlatList
        data={students}
        keyExtractor={(item, index) => item["Roll No"] || index.toString()}
        renderItem={renderStudentItem}
        ListHeaderComponent={listHeader}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={21}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {students.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadToServer}
          >
            <Text style={styles.uploadText}>🚀 Upload to Server</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
    },
    container: {
      padding: 16,
      backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      color: isDark ? "#ffffff" : "#111111",
    },
    table: {
      marginRight: 16,
    },
    tableHeader: {
      fontWeight: "bold",
      fontSize: 16,
      backgroundColor: isDark ? "#1f2937" : "#e0e0e0",
      padding: 8,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#ccc",
      textAlign: "center",
      color: isDark ? "#fff" : "#111",
    },
    tableCell: {
      padding: 8,
      fontSize: 14,
      borderWidth: 1,
      borderColor: isDark ? "#333" : "#ccc",
      textAlign: "center",
      color: isDark ? "#ddd" : "#222",
      backgroundColor: isDark ? "#0f1720" : "#fff",
    },
    sampleButton: {
      backgroundColor: isDark ? "#2563eb" : "#007bff",
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
      backgroundColor: isDark ? "#16a34a" : "#28a745",
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
      color: isDark ? "#fff" : "#111",
    },
    studentItem: {
      backgroundColor: isDark ? "#0b1220" : "#f8f9fa",
      padding: 10,
      marginBottom: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? "#23303b" : "#ddd",
    },
    studentText: {
      fontSize: 14,
      color: isDark ? "#e6eef6" : "#111",
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      paddingBottom: 40,
      width: "100%",
      padding: 10,
      backgroundColor: isDark ? "#071022" : "#fff",
      borderTopWidth: 1,
      borderColor: isDark ? "#203243" : "#ddd",
    },
    uploadButton: {
      backgroundColor: isDark ? "#f59e0b" : "#ffc107",
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    uploadText: {
      fontWeight: "bold",
      color: isDark ? "#0b0b0b" : "#111",
    },
  });
