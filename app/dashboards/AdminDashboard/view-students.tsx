import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Student = {
  faceImages: string[];
  _id: string;
  studentName: string;
  rollNo: string;
  roomNo: string;
  year: string;
  blockName: string;
  studentPhone?: string;
  parentPhone?: string;
  isCompleted?: boolean;
};

export default function ViewStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [yearFilter, setYearFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"back" | "front">("back");
  const [showCamera, setShowCamera] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = await AsyncStorage.getItem("adminToken");
        const response = await fetch("http://192.168.29.83:5000/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStudents(data);
        setFilteredStudents(data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    let data = students;
    if (yearFilter) data = data.filter((s) => s.year === yearFilter);
    if (roomFilter) data = data.filter((s) => s.roomNo === roomFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q)
      );
    }
    setFilteredStudents(data);
  }, [yearFilter, roomFilter, searchQuery, students]);

  const takePicture = async () => {
    if (cameraRef.current && capturedImages.length < 5) {
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      setCapturedImages((prev) => [...prev, photoData.uri]);
      setShowCamera(false);
      setTimeout(() => setShowCamera(true), 50);
      setShowCameraModal(false);
    } else {
      alert("Maximum 5 images allowed.");
    }
  };

  const updateStudent = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const token = await AsyncStorage.getItem("adminToken");

    const formData = new FormData();
    formData.append("studentName", selectedStudent.studentName);
    formData.append("rollNo", selectedStudent.rollNo);
    formData.append("roomNo", selectedStudent.roomNo);
    formData.append("year", selectedStudent.year);
    formData.append("studentPhone", selectedStudent.studentPhone || "");
    formData.append("parentPhone", selectedStudent.parentPhone || "");
    formData.append("isCompleted", "true");

    capturedImages.forEach((imageUri, index) => {
      const fileName = imageUri.split("/").pop() || `face_${index + 1}.jpg`;
      formData.append("faceImages", {
        uri: imageUri,
        name: fileName,
        type: "image/jpeg",
      } as any);
    });

    try {
      const response = await fetch(
        `http://192.168.29.83:5000/api/students/${selectedStudent._id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const updatedStudent = { ...selectedStudent, isCompleted: true };
        const updatedList = students.map((s) =>
          s._id === selectedStudent._id ? updatedStudent : s
        );
        setStudents(updatedList);
        setFilteredStudents(updatedList);
        setSelectedStudent(null);
        setCapturedImages([]);
      } else {
        const data = await response.json();
        alert(`Failed to update: ${data.message}`);
      }
    } catch (err) {
      alert("Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const CameraModal = () => (
    <Modal visible={showCameraModal} transparent animationType="slide">
      <View style={styles.cameraModalContainer}>
        <View style={styles.cameraModalContent}>
          <CameraView 
            ref={cameraRef} 
            style={styles.fullScreenCamera} 
            facing={type}
          />
          <View style={styles.cameraModalButtons}>
            <TouchableOpacity 
              style={styles.captureButton} 
              onPress={takePicture}
            >
              <Text style={styles.buttonText}>📸 Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.closeCameraButton}
              onPress={() => setShowCameraModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎓 View & Update Students</Text>

      <TextInput
        placeholder="🔍 Search by Name or Roll No"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.filterRow}>
        <Picker
          selectedValue={yearFilter}
          onValueChange={setYearFilter}
          style={styles.picker}
        >
          <Picker.Item label="Filter by Year" value="" />
          <Picker.Item label="1st Year" value="1st Year" />
          <Picker.Item label="2nd Year" value="2nd Year" />
          <Picker.Item label="3rd Year" value="3rd Year" />
          <Picker.Item label="4th Year" value="4th Year" />
        </Picker>

        <Picker
          selectedValue={roomFilter}
          onValueChange={setRoomFilter}
          style={styles.picker}
        >
          <Picker.Item label="Filter by Room" value="" />
          {[...new Set(students.map((s) => s.roomNo))].map((room) => (
            <Picker.Item label={room} value={room} key={room} />
          ))}
        </Picker>
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedStudent(item)}
          >
            <View style={styles.cardContent}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.name}>{item.studentName}</Text>
                  {item.isCompleted && <Text style={{ color: "green", marginLeft: 6 }}>✅</Text>}
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Roll No:</Text>
                  <Text style={styles.value}>{item.rollNo}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Room:</Text>
                  <Text style={styles.value}>{item.roomNo}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Block:</Text>
                  <Text style={styles.value}>{item.blockName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Year:</Text>
                  <Text style={styles.value}>{item.year}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Student Phone:</Text>
                  <Text style={styles.value}>{item.studentPhone || "-"}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Parent Phone:</Text>
                  <Text style={styles.value}>{item.parentPhone || "-"}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 150 }}
      />

      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>✏️ Update Student</Text>

              {capturedImages.length < 5 && (
                <TouchableOpacity 
                  style={styles.openCameraButton}
                  onPress={() => setShowCameraModal(true)}
                >
                  <Text style={styles.buttonText}>📷 Open Camera</Text>
                </TouchableOpacity>
              )}

              {capturedImages.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>
                    Captured Images ({capturedImages.length}/5)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                    {capturedImages.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onLongPress={() =>
                          setCapturedImages((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Image
                          source={{ uri: img }}
                          style={{ width: 100, height: 100, borderRadius: 10, marginRight: 8 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
                    Long press an image to remove it.
                  </Text>
                </>
              )}

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.studentName}
                onChangeText={(text) =>
                  setSelectedStudent((prev) => prev && { ...prev, studentName: text })
                }
              />

              <Text style={styles.inputLabel}>Roll No</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.rollNo}
                onChangeText={(text) =>
                  setSelectedStudent((prev) => prev && { ...prev, rollNo: text })
                }
              />

              <Text style={styles.inputLabel}>Room No</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.roomNo}
                onChangeText={(text) =>
                  setSelectedStudent((prev) => prev && { ...prev, roomNo: text })
                }
              />

              <Text style={styles.inputLabel}>Year</Text>
              <Picker
                selectedValue={selectedStudent?.year}
                onValueChange={(value) =>
                  setSelectedStudent((prev) => prev && { ...prev, year: value })
                }
                style={styles.modalPicker}
              >
                <Picker.Item label="Select Year" value="" />
                <Picker.Item label="1st Year" value="1st Year" />
                <Picker.Item label="2nd Year" value="2nd Year" />
                <Picker.Item label="3rd Year" value="3rd Year" />
                <Picker.Item label="4th Year" value="4th Year" />
              </Picker>

              <Text style={styles.inputLabel}>Student Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.studentPhone}
                onChangeText={(text) =>
                  setSelectedStudent(prev => prev && { ...prev, studentPhone: text })
                }
              />

              <Text style={styles.inputLabel}>Parent Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.parentPhone}
                onChangeText={(text) =>
                  setSelectedStudent(prev => prev && { ...prev, parentPhone: text })
                }
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.saveButton, { flex: 1, marginRight: 5 }]}
                  onPress={updateStudent}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1, marginLeft: 5 }]}
                  onPress={() => setSelectedStudent(null)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CameraModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f2f9ff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  filterRow: { flexDirection: "row", marginBottom: 10 },
  picker: { flex: 1, marginHorizontal: 5, backgroundColor: "#fff" },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: { backgroundColor: "#fff", margin: 20, padding: 20, borderRadius: 10, elevation: 10, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginBottom: 10, borderRadius: 6 },
  modalPicker: { marginBottom: 10 },
  saveButton: { backgroundColor: "#28a745", padding: 10, borderRadius: 6, marginTop: 10 },
  saveButtonText: { color: "#fff", textAlign: "center" },
  cancelButton: { padding: 10, borderRadius: 6, marginTop: 10, borderWidth: 1, borderColor: "#ccc" },
  cancelText: { color: "#888", textAlign: "center" },
  card: { backgroundColor: "#fff", padding: 16, marginVertical: 8, borderRadius: 10, elevation: 6 },
  name: { fontSize: 18, fontWeight: "bold", marginBottom: 8, color: "#333" },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  label: { fontWeight: "600", color: "#555", width: 100 },
  value: { color: "#333" },
  cardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileImage: { width: 80, height: 80, borderRadius: 40, marginLeft: 10, borderWidth: 1, borderColor: "#ccc" },
  inputLabel: { fontSize: 14, fontWeight: "bold", marginTop: 10, marginBottom: 5, color: "#333" },
  cameraContainer: { height: 300, borderRadius: 10, overflow: "hidden", backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  camera: { flex: 1, width: "100%", height: "100%" },
  cameraButtonsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  captureButton: { padding: 10, backgroundColor: "#28a745", borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  buttonRow: { flexDirection: "row", marginTop: 10 },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  cameraModalContent: {
    flex: 1,
  },
  fullScreenCamera: {
    flex: 1,
  },
  cameraModalButtons: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  openCameraButton: {
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  closeCameraButton: {
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
});