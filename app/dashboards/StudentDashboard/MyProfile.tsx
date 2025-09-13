import { API_BASE_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  gender: string;
  year: string;
  roomNo: string;
  blockName: string;
  collegeName: string;
  faceImage: string;
  createdAt: string;
  updatedAt: string;
}

const StudentProfile = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [activeTab, setActiveTab] = useState("profile");
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

  const fetchStudent = async () => {
    try {
      const rollNo = await AsyncStorage.getItem("rollNo");
      if (!rollNo) return;

      const res = await axios.get(
        `${API_BASE_URL}/api/studentAuth/roll/${rollNo}`
      );
      setStudent(res.data);
    } catch (err) {
      console.error("Error fetching student:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  const handleImagePick = async () => {
    const rollNo = await AsyncStorage.getItem("rollNo");
    if (!rollNo) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "You need to allow camera access.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const localUri = pickerResult.assets[0].uri;
      const filename = localUri.split("/").pop()!;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append("faceImage", {
        uri: localUri,
        name: filename,
        type,
      } as any);

      try {
        setLoading(true);
        await axios.put(
          `${API_BASE_URL}/api/students/upload-face-image/${rollNo}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        Alert.alert("Success", "Profile picture updated!");
        fetchStudent();
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Error", "Failed to upload image");
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }

    const rollNo = await AsyncStorage.getItem("rollNo");
    if (!rollNo || !oldPassword || !newPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/studentAuth/change-password`, {
        rollNo,
        oldPassword,
        newPassword,
      });

      Alert.alert("Success", "Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalVisible(false);
      Keyboard.dismiss();
    } catch (error: any) {
      console.error("Password update error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update password");
    }
  };

  const togglePasswordVisibility = (field: keyof typeof isPasswordVisible) => {
    setIsPasswordVisible({
      ...isPasswordVisible,
      [field]: !isPasswordVisible[field]
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4b7bec" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ff6b6b" />
        <Text style={styles.errorText}>Student not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {student.faceImage ? (
            <Image
              source={{ uri: `${API_BASE_URL}${student.faceImage}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.initialCircle}>
              <Text style={styles.initialText}>
                {student.studentName?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton} onPress={handleImagePick}>
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{student.studentName}</Text>
        <Text style={styles.userRollNo}>{student.rollNo}</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === "profile" && styles.activeTab]} 
            onPress={() => setActiveTab("profile")}
          >
            <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === "security" && styles.activeTab]} 
            onPress={() => setActiveTab("security")}
          >
            <Text style={[styles.tabText, activeTab === "security" && styles.activeTabText]}>
              Security
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === "profile" ? (
            <View style={styles.profileSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>
              
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="person-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Full Name</Text>
                    <Text style={styles.infoValue}>{student.studentName}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="id-card-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Roll Number</Text>
                    <Text style={styles.infoValue}>{student.rollNo}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="male-female-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{student.gender}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="school-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Year</Text>
                    <Text style={styles.infoValue}>{student.year}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Accommodation Details</Text>
              </View>
              
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="bed-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Room Number</Text>
                    <Text style={styles.infoValue}>{student.roomNo}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="business-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Block Name</Text>
                    <Text style={styles.infoValue}>{student.blockName}</Text>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="library-outline" size={20} color="#4b7bec" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>College</Text>
                    <Text style={styles.infoValue}>{student.collegeName}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.securitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Security Settings</Text>
              </View>
              
              <View style={styles.infoCard}>
                <TouchableOpacity 
                  style={styles.securityOption}
                  onPress={() => setIsPasswordModalVisible(true)}
                >
                  <View style={styles.securityOptionContent}>
                    <View style={styles.securityIcon}>
                      <Ionicons name="lock-closed-outline" size={22} color="#4b7bec" />
                    </View>
                    <View>
                      <Text style={styles.securityOptionTitle}>Change Password</Text>
                      <Text style={styles.securityOptionSubtitle}>Update your login password</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#a0a0a0" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Password Change Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPasswordModalVisible}
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayInner}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change Password</Text>
                  <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.passwordInput}>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter current password"
                        secureTextEntry={!isPasswordVisible.old}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                      />
                      <TouchableOpacity onPress={() => togglePasswordVisibility('old')}>
                        <Ionicons 
                          name={isPasswordVisible.old ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#a0a0a0" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.passwordInput}>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter new password"
                        secureTextEntry={!isPasswordVisible.new}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TouchableOpacity onPress={() => togglePasswordVisibility('new')}>
                        <Ionicons 
                          name={isPasswordVisible.new ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#a0a0a0" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.passwordInput}>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Confirm new password"
                        secureTextEntry={!isPasswordVisible.confirm}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                      <TouchableOpacity onPress={() => togglePasswordVisibility('confirm')}>
                        <Ionicons 
                          name={isPasswordVisible.confirm ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#a0a0a0" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsPasswordModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.saveButton, (!oldPassword || !newPassword || !confirmPassword) && styles.saveButtonDisabled]}
                    onPress={handlePasswordChange}
                    disabled={!oldPassword || !newPassword || !confirmPassword}
                  >
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 18,
    color: "#495057",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#e9ecef",
  },
  initialCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4b7bec",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#e9ecef",
  },
  initialText: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "bold",
  },
  editAvatarButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#4b7bec",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2d3436",
    marginBottom: 5,
  },
  userRollNo: {
    fontSize: 16,
    color: "#636e72",
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#4b7bec",
  },
  tabText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4b7bec",
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  profileSection: {
    marginBottom: 20,
  },
  securitySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 15,
    paddingLeft: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2d3436",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(75, 123, 236, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    color: "#2d3436",
    fontWeight: "500",
  },
  securityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  securityOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(75, 123, 236, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  securityOptionTitle: {
    fontSize: 16,
    color: "#2d3436",
    fontWeight: "500",
  },
  securityOptionSubtitle: {
    fontSize: 13,
    color: "#6c757d",
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d3436",
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 8,
    fontWeight: "500",
  },
  passwordInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#4b7bec",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#a0b8f0",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default StudentProfile;