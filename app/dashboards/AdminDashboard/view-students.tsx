import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const CARD_HEIGHT = 120; // fixed height for smooth getItemLayout

const StudentCard = memo(function StudentCard({
  item,
  onPress,
}: {
  item: Student;
  onPress: (s: Student) => void;
}) {
  const initials = useMemo(() => {
    const parts = item.studentName?.trim().split(" ");
    const a = parts?.[0]?.[0] || "";
    const b = parts?.[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [item.studentName]);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.name}>{item.studentName}</Text>
        {item.isCompleted ? (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeText}>Completed</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={styles.badgeText}>Pending</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.avatar}>
          {item.faceImages?.length ? (
            <Image source={{ uri: item.faceImages[0] }} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarInitials}>{initials || "ST"}</Text>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <View style={styles.rowCompact}>
            <Text style={styles.labelCompact}>Roll</Text>
            <Text style={styles.valueCompact} numberOfLines={1}>{item.rollNo}</Text>
          </View>
          <View style={styles.rowCompact}>
            <Text style={styles.labelCompact}>Room</Text>
            <Text style={styles.valueCompact} numberOfLines={1}>{item.roomNo}</Text>
          </View>
          <View style={styles.rowCompact}>
            <Text style={styles.labelCompact}>Block</Text>
            <Text style={styles.valueCompact} numberOfLines={1}>{item.blockName}</Text>
          </View>
          <View style={styles.rowCompact}>
            <Text style={styles.labelCompact}>Year</Text>
            <Text style={styles.valueCompact} numberOfLines={1}>{item.year}</Text>
          </View>
        </View>

        <View style={styles.chevWrap}>
          <Text style={styles.chev}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ViewStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [yearFilter, setYearFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<"back" | "front">("back");
  const [isSaving, setIsSaving] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = await AsyncStorage.getItem("adminToken");
        const response = await fetch("http://192.168.29.83:5000/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStudents(data || []);
      } catch (e) {
        console.error("Failed to fetch students:", e);
      }
    };
    fetchStudents();
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const roomOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.roomNo))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    let data = students;
    if (yearFilter) data = data.filter((s) => s.year === yearFilter);
    if (roomFilter) data = data.filter((s) => s.roomNo === roomFilter);
    if (statusFilter !== "all") {
      const wantCompleted = statusFilter === "completed";
      data = data.filter((s) => !!s.isCompleted === wantCompleted);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (s) => s.studentName?.toLowerCase().includes(q) || s.rollNo?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [students, yearFilter, roomFilter, statusFilter, searchQuery]);

  const takePicture = async () => {
    if (cameraRef.current && capturedImages.length < 5) {
      const photoData = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      setCapturedImages((prev) => [...prev, photoData.uri]);
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

    capturedImages.forEach((uri, idx) => {
      const fileName = uri.split("/").pop() || `face_${idx + 1}.jpg`;
      formData.append("faceImages", { uri, name: fileName, type: "image/jpeg" } as any);
    });

    try {
      const res = await fetch(`http://192.168.29.83:5000/api/students/${selectedStudent._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const updated = { ...selectedStudent, isCompleted: true };
        setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        setSelectedStudent(null);
        setCapturedImages([]);
      } else {
        const data = await res.json();
        alert(`Failed to update: ${data.message}`);
      }
    } catch {
      alert("Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const onPressCard = useCallback((s: Student) => setSelectedStudent(s), []);
  const keyExtractor = useCallback((item: Student) => item._id, []);
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const ListHeader = (
    <View style={styles.header}>
      <View style={styles.searchBox}>
        <TextInput
          placeholder="🔍 Search by name or roll no."
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, statusFilter === "all" && styles.chipActive]}
          onPress={() => setStatusFilter("all")}
        >
          <Text style={[styles.chipText, statusFilter === "all" && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, statusFilter === "completed" && styles.chipActive]}
          onPress={() => setStatusFilter("completed")}
        >
          <Text style={[styles.chipText, statusFilter === "completed" && styles.chipTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, statusFilter === "pending" && styles.chipActive]}
          onPress={() => setStatusFilter("pending")}
        >
          <Text style={[styles.chipText, statusFilter === "pending" && styles.chipTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>

        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{filteredStudents.length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={yearFilter} onValueChange={setYearFilter} style={styles.picker}>
            <Picker.Item label="Year (All)" value="" />
            <Picker.Item label="1st Year" value="1 Year" />
            <Picker.Item label="2nd Year" value="2 Year" />
            <Picker.Item label="3rd Year" value="3 Year" />
            <Picker.Item label="4th Year" value="4 Year" />
          </Picker>
        </View>

        <View style={styles.pickerWrap}>
          <Picker selectedValue={roomFilter} onValueChange={setRoomFilter} style={styles.picker}>
            <Picker.Item label="Room (All)" value="" />
            {roomOptions.map((room) => (
              <Picker.Item label={room} value={room} key={room} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );

  const Empty = (
    <View style={{ padding: 40, alignItems: "center" }}>
      <Text style={{ fontSize: 16, color: "#666", textAlign: "center" }}>
        No students match your filters.
      </Text>
    </View>
  );

  const CameraModal = () => (
    <Modal visible={showCameraModal} transparent animationType="slide">
      <View style={styles.cameraModalContainer}>
        <View style={styles.cameraModalContent}>
          <CameraView ref={cameraRef} style={styles.fullScreenCamera} facing={type} />
          <View style={styles.cameraModalButtons}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <Text style={styles.buttonText}>📸 Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowCameraModal(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredStudents}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <StudentCard item={item} onPress={onPressCard} />}
        numColumns={1}                           // ✅ single card per row
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={Empty}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 160 }}
        // performance for ~2000 items
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={12}
        removeClippedSubviews
        getItemLayout={getItemLayout}
      />

      {/* Edit / Update Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>✏️ Update Student</Text>

              {capturedImages.length < 5 && (
                <TouchableOpacity style={styles.openCameraButton} onPress={() => setShowCameraModal(true)}>
                  <Text style={styles.buttonText}>📷 Open Camera</Text>
                </TouchableOpacity>
              )}

              {capturedImages.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>Captured Images ({capturedImages.length}/5)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                    {capturedImages.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onLongPress={() => setCapturedImages((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Image source={{ uri: img }} style={{ width: 100, height: 100, borderRadius: 10, marginRight: 8 }} />
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
                onChangeText={(text) => setSelectedStudent((prev) => prev && { ...prev, studentName: text })}
              />

              <Text style={styles.inputLabel}>Roll No</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.rollNo}
                onChangeText={(text) => setSelectedStudent((prev) => prev && { ...prev, rollNo: text })}
              />

              <Text style={styles.inputLabel}>Room No</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedStudent?.roomNo}
                onChangeText={(text) => setSelectedStudent((prev) => prev && { ...prev, roomNo: text })}
              />

              <Text style={styles.inputLabel}>Year</Text>
              <Picker
                selectedValue={selectedStudent?.year}
                onValueChange={(value) => setSelectedStudent((prev) => prev && { ...prev, year: value })}
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
                keyboardType="phone-pad"
                value={selectedStudent?.studentPhone}
                onChangeText={(text) => setSelectedStudent((prev) => prev && { ...prev, studentPhone: text })}
              />

              <Text style={styles.inputLabel}>Parent Phone</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="phone-pad"
                value={selectedStudent?.parentPhone}
                onChangeText={(text) => setSelectedStudent((prev) => prev && { ...prev, parentPhone: text })}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.saveButton, { flex: 1, marginRight: 6 }]} onPress={updateStudent} disabled={isSaving}>
                  <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelButton, { flex: 1, marginLeft: 6 }]} onPress={() => setSelectedStudent(null)}>
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
  container: { flex: 1, backgroundColor: "#f7fbff" },

  header: {
    backgroundColor: "#f7fbff",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5eef7",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8, color: "#153e75" },
  searchBox: { marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cfe0f5",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  chipsRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0f5",
    backgroundColor: "#fff",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#e6f2ff", borderColor: "#7fb3ff" },
  chipText: { color: "#2c4b70", fontWeight: "600" },
  chipTextActive: { color: "#0b61d6" },
  countPill: {
    marginLeft: "auto",
    backgroundColor: "#0b61d6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countPillText: { color: "#fff", fontWeight: "700" },

  filterRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 6 },
  pickerWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cfe0f5",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: { width: "100%" },

  // single-column card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    width: "100%",
    minHeight: CARD_HEIGHT,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
    minWidth: 0,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1a3458" },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  badgeSuccess: { backgroundColor: "#e5f8ea" },
  badgePending: { backgroundColor: "#fff3d6" },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#2b2b2b" },

  cardBody: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#eaf2ff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitials: { fontWeight: "800", color: "#1f4fa3" },

  rowCompact: { flexDirection: "row", alignItems: "center", marginBottom: 4, minWidth: 0 },
  labelCompact: { width: 52, color: "#5a6f8c", fontSize: 12, fontWeight: "700", marginRight: 6 },
  valueCompact: { color: "#213a5a", fontSize: 12, fontWeight: "600", flexShrink: 1 },

  chevWrap: { marginLeft: 8, alignItems: "center", justifyContent: "center" },
  chev: { fontSize: 26, color: "#9db2cf", marginTop: -6 },

  // modal
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: {
    backgroundColor: "#fff",
    margin: 14,
    padding: 18,
    borderRadius: 14,
    elevation: 10,
    maxHeight: "92%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#153e75" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d7e6fb",
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  modalPicker: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d7e6fb",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  inputLabel: { fontSize: 13, fontWeight: "bold", marginTop: 8, marginBottom: 6, color: "#2c4b70" },
  saveButton: { backgroundColor: "#28a745", padding: 12, borderRadius: 10, marginTop: 10 },
  saveButtonText: { color: "#fff", textAlign: "center", fontWeight: "800" },
  cancelButton: { padding: 12, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: "#ccd7ea" },
  cancelText: { color: "#49618a", textAlign: "center", fontWeight: "700" },
  buttonRow: { flexDirection: "row", marginTop: 10 },

  // camera modal
  cameraModalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" },
  cameraModalContent: { flex: 1 },
  fullScreenCamera: { flex: 1 },
  cameraModalButtons: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  captureButton: { padding: 12, backgroundColor: "#28a745", borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  openCameraButton: { padding: 14, backgroundColor: "#007AFF", borderRadius: 10, alignItems: "center", marginBottom: 10 },
  closeCameraButton: { padding: 12, backgroundColor: "#FF3B30", borderRadius: 10 },
});
