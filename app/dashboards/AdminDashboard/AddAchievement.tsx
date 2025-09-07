// AddAchievement.tsx
import { API_BASE_URL } from "@/constants/config";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface Student {
  _id: string;
  studentName: string;
  rollNo: string;
  year: string;
  blockName: string;
  collegeName?: string;
  gender?: string;
  roomNo?: string;
  address?: string;
  studentPhone?: string;
  parentPhone?: string;
  faceImage?: string;
  isCompleted?: boolean;
}

const AddAchievement = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [level, setLevel] = useState("gold");
  const [awardedBy, setAwardedBy] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ref to scroll form into view
  const formScrollRef = useRef<ScrollView | null>(null);
  const [showStudentList, setShowStudentList] = useState(true);

  // Fetch all students
  const fetchStudents = async () => {
    if (isLoadingStudents) return;

    setIsLoadingStudents(true);
    try {
      const token = await AsyncStorage.getItem("adminToken");
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const studentsData = await response.json();
        setStudents(studentsData);
        setFilteredStudents(studentsData.slice(0, 50));
        console.log(`Loaded ${studentsData.length} students`);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      Alert.alert("Error", "Failed to fetch students. Please try again.");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as ReturnType<typeof setTimeout>);
      timeoutRef.current = null;
    }
    timeoutRef.current = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredStudents(students.slice(0, 50));
        return;
      }
      const q = searchQuery.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.studentName?.toLowerCase().includes(q) ||
          student.rollNo?.toLowerCase().includes(q)
      );
      setFilteredStudents(filtered.slice(0, 100));
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as ReturnType<typeof setTimeout>);
        timeoutRef.current = null;
      }
    };
  }, [searchQuery, students]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedStudent) {
      newErrors.student = "Please select a student";
    } else if (!selectedStudent.rollNo || !selectedStudent.rollNo.trim()) {
      newErrors.student = "Selected student has no roll number";
    }
    if (!title.trim()) newErrors.title = "Achievement title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant camera roll permissions to upload images"
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant camera permissions to take photos"
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Make selection obvious with an Alert + banner + auto-open form
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setErrors({});
    setShowStudentList(false);
    setFormVisible(true);

    console.log("Selected student:", student);
    Alert.alert(
      "Student selected",
      `${student.studentName}\nRoll: ${student.rollNo}`
    );

    setTimeout(() => {
      try {
        formScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      } catch (e) {}
    }, 200);
  };

  // Main submit: sends multipart if image selected, otherwise JSON
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedStudent) {
      Alert.alert("Error", "No student selected");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("adminToken");

      // Build textual fields to send as form parameters
      const params = {
        studentId: selectedStudent._id,
        rollNo: selectedStudent.rollNo || "",
        studentName: selectedStudent.studentName || "",
        title,
        description,
        category,
        level,
        awardedBy: awardedBy || "Administration",
        date: date.toISOString().split("T")[0],
      };

      // If an image is selected -> multipart request
      if (image) {
        // normalize uri for iOS
        const normalizedUri =
          Platform.OS === "ios" ? image.replace("file://", "") : image;

        // Build query string (defensive: put fields also on URL so server can read req.query if req.body isn't populated)
        const qs = Object.entries(params)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
          )
          .join("&");

        const uploadUrl = `${API_BASE_URL}/api/achievements?${qs}`;

        console.log(
          "Submitting multipart to /api/achievements, params:",
          params
        );

        // FileSystem.uploadAsync sends multipart/form-data and supports `parameters`
        const result = await FileSystem.uploadAsync(uploadUrl, normalizedUri, {
          fieldName: "image", // must match multer.single('image')
          httpMethod: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            Accept: "application/json",
          },
          parameters: params,
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        });

        console.log("FileSystem.uploadAsync result:", result);

        if (result.status < 200 || result.status >= 300) {
          let parsed;
          try {
            parsed = JSON.parse(result.body);
          } catch (e) {
            parsed = { raw: result.body };
          }
          throw new Error(
            `Server returned ${result.status}: ${JSON.stringify(parsed)}`
          );
        }

        let data;
        try {
          data = JSON.parse(result.body);
        } catch (e) {
          data = { raw: result.body };
        }

        Alert.alert("Success", "Achievement added successfully!");
        console.log("Create response:", data);

        resetForm();
        router.back();
        return;
      }

      // No image chosen — fallback to JSON POST
      const payload = {
        ...params,
        image: null,
      };

      console.log("Submitting JSON to /api/achievements payload:", payload);

      const response = await fetch(`${API_BASE_URL}/api/achievements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert("Success", "Achievement added successfully!");
        resetForm();
        router.back();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server responded with error:", errorData);
        throw new Error(errorData.message || "Failed to add achievement");
      }
    } catch (err: any) {
      console.error("Error in submit:", err);
      Alert.alert("Error", err.message || "Failed to add achievement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setSearchQuery("");
    setTitle("");
    setDescription("");
    setCategory("Academic");
    setLevel("gold");
    setAwardedBy("");
    setImage(null);
    setDate(new Date());
    setErrors({});
    setShowStudentList(true);
    setFormVisible(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const clearSelection = () => {
    setSelectedStudent(null);
    setSearchQuery("");
    setErrors({});
    setShowStudentList(true);
    setFormVisible(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={[
        styles.studentItem,
        selectedStudent?._id === item._id && styles.selectedStudentItem,
      ]}
      onPress={() => handleSelectStudent(item)}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>
          {item.studentName || "Unknown Student"}
        </Text>
        <Text style={styles.studentDetails}>
          {item.rollNo || "N/A"} • {item.year || "N/A"} • {item.blockName || "N/A"}
        </Text>
      </View>
      {selectedStudent?._id === item._id && (
        <Ionicons name="checkmark-circle" size={24} color="#4CD964" />
      )}
    </TouchableOpacity>
  );

  const StudentListFooter = () => {
    if (!isLoadingStudents) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6a4cff" />
        <Text style={styles.footerText}>Loading students...</Text>
      </View>
    );
  };

  const StudentListEmpty = () => {
    if (isLoadingStudents) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6a4cff" />
          <Text style={styles.emptyText}>Loading students...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>
          {searchQuery ? "No students found" : "No students available"}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? "Try a different search term"
            : "Check your connection and try again"}
        </Text>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* header removed as requested */}

        {selectedStudent && (
          <View style={styles.stickySelectedBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedStudentNameBanner}>
                {selectedStudent.studentName}
              </Text>
              <Text style={styles.selectedStudentDetailsBanner}>
                {selectedStudent.rollNo} • {selectedStudent.year} • {selectedStudent.blockName}
              </Text>
            </View>
            <TouchableOpacity onPress={clearSelection} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.label}>Select Student *</Text>
            {errors.student && <Text style={styles.errorText}>{errors.student}</Text>}

            {showStudentList && (
              <>
                <TextInput
                  ref={searchInputRef}
                  style={[styles.searchInput, errors.student && styles.inputError]}
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={!selectedStudent}
                />
                <View style={styles.studentListContainer}>
                  <FlatList
                    data={filteredStudents}
                    renderItem={renderStudentItem}
                    keyExtractor={(item) => item._id}
                    style={styles.studentList}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={StudentListFooter}
                    ListEmptyComponent={StudentListEmpty}
                    getItemLayout={(data, index) => ({
                      length: 68,
                      offset: 68 * index,
                      index,
                    })}
                  />
                </View>
              </>
            )}

            {selectedStudent && (
              <ScrollView
                ref={formScrollRef}
                style={[styles.formScrollView, { flex: 1 }]}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>Achievement Title *</Text>
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="e.g., Academic Excellence Award"
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    if (errors.title) setErrors({ ...errors, title: "" });
                  }}
                />

                <Text style={styles.label}>Description *</Text>
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    errors.description && styles.inputError,
                  ]}
                  placeholder="Describe the achievement..."
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (errors.description) setErrors({ ...errors, description: "" });
                  }}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.row}>
                  <View style={styles.column}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
                        <Picker.Item label="Academic" value="Academic" />
                        <Picker.Item label="Sports" value="Sports" />
                        <Picker.Item label="Leadership" value="Leadership" />
                        <Picker.Item label="Cultural" value="Cultural" />
                        <Picker.Item label="Technology" value="Technology" />
                        <Picker.Item label="Other" value="Other" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.column}>
                    <Text style={styles.label}>Level</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={level} onValueChange={setLevel} style={styles.picker}>
                        <Picker.Item label="Bronze" value="bronze" />
                        <Picker.Item label="Silver" value="silver" />
                        <Picker.Item label="Gold" value="gold" />
                        <Picker.Item label="Platinum" value="platinum" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>Awarded By</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Principal, Sports Committee"
                  value={awardedBy}
                  onChangeText={setAwardedBy}
                />

                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                  <Text>{date.toDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (d) setDate(d);
                    }}
                  />
                )}

                <Text style={styles.label}>Achievement Image (Optional)</Text>
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    <Ionicons name="image" size={20} color="#fff" />
                    <Text style={styles.imageButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.imageButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {image && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: image }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome5 name="trophy" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Add Achievement</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  stickySelectedBanner: {
    backgroundColor: "#6a4cff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedStudentNameBanner: { color: "#fff", fontWeight: "700", fontSize: 16 },
  selectedStudentDetailsBanner: { color: "#fff", fontSize: 13, marginTop: 2 },
  content: { flex: 1 },
  formContainer: { padding: 20, flex: 1 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  errorText: { color: "#FF3B30", fontSize: 14, marginBottom: 8 },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputError: { borderColor: "#FF3B30" },
  selectedStudentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    marginBottom: 16,
  },
  selectedStudentInfo: { flex: 1 },
  selectedStudentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  selectedStudentDetails: { fontSize: 14, color: "#6b7280" },
  clearButton: { padding: 4 },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectedStudentItem: { backgroundColor: "#f0f7ff" },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  studentDetails: { fontSize: 14, color: "#6b7280" },
  footerLoader: {
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: { color: "#6b7280", fontSize: 14 },
  emptyState: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  column: { flex: 1 },
  pickerContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: { height: 50 },
  imageButtons: { flexDirection: "row", gap: 12, marginBottom: 16 },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6a4cff",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: { color: "#fff", fontWeight: "600" },
  imagePreview: { position: "relative", marginBottom: 16 },
  previewImage: { width: "100%", height: 200, borderRadius: 8 },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9800",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 12,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  formScrollView: { flex: 1 },
  studentListContainer: {
    height: 300,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 16,
    overflow: "hidden",
  },
  studentList: { flex: 1 },
});

export default AddAchievement;
