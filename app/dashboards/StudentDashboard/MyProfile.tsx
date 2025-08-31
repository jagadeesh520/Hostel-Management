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

  const fetchStudent = async () => {
    try {
      const rollNo = await AsyncStorage.getItem("rollNo");
      if (!rollNo) return;

      const res = await axios.get(
        `https://api.sjtechsol.com/api/studentAuth/roll/${rollNo}`
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
        await axios.put(
          `https://api.sjtechsol.com/api/students/upload-face-image/${rollNo}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        Alert.alert("Success", "Profile picture updated!");
        fetchStudent();
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Error", "Failed to upload image");
      }
    }
  };

  const handlePasswordChange = async () => {
    const rollNo = await AsyncStorage.getItem("rollNo");
    if (!rollNo || !oldPassword || !newPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      await axios.post("https://api.sjtechsol.com/api/studentAuth/change-password", {
        rollNo,
        oldPassword,
        newPassword,
      });

      Alert.alert("Success", "Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      Keyboard.dismiss(); // hide keyboard after update
    } catch (error) {
      console.error("Password update error:", error);
      Alert.alert("Error", "Failed to update password");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }

  if (!student) {
    return <Text style={styles.error}>Student not found.</Text>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              {student.faceImage ? (
                <Image
                  source={{ uri: `https://api.sjtechsol.com${student.faceImage}` }}
                  style={styles.faceImage}
                />
              ) : (
                <View style={styles.initialCircle}>
                  <Text style={styles.initialText}>
                    {student.studentName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{student.studentName}</Text>
                <Text style={styles.profileSubText}>Roll No: {student.rollNo}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleImagePick} style={styles.uploadButton}>
              <Text style={styles.uploadText}>Change Profile Picture</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{student.studentName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Roll No:</Text>
              <Text style={styles.value}>{student.rollNo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gender:</Text>
              <Text style={styles.value}>{student.gender}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Year:</Text>
              <Text style={styles.value}>{student.year}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Room No:</Text>
              <Text style={styles.value}>{student.roomNo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Block:</Text>
              <Text style={styles.value}>{student.blockName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>College:</Text>
              <Text style={styles.value}>{student.collegeName}</Text>
            </View>

            <View style={{ width: "100%", marginTop: 20 }}>
              <Text style={styles.label}>Change Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />

              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity onPress={handlePasswordChange} style={styles.uploadButton}>
                <Text style={styles.uploadText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f6fa",
    flexGrow: 1,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    alignItems: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f3fce6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: "100%",
  },
  faceImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#dcdcdc",
  },
  profileInfo: {
    flexShrink: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  profileSubText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginVertical: 6,
    width: "100%",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3542",
  },
  value: {
    fontSize: 16,
    fontWeight: "400",
    color: "#57606f",
  },
  error: {
    padding: 20,
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  uploadButton: {
    backgroundColor: "#4b7bec",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadText: {
    color: "#fff",
    textAlign:'center',
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#dcdcdc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  initialCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#dcdcdc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initialText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default StudentProfile;
