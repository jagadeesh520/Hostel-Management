// components/FaceModalCamera.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export const FaceModalCamera = ({
  visible,
  onClose,
  student,
  onMatchSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  student: any;
  onMatchSuccess: () => void;
}) => {
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        setCapturedUri(uri);
        sendToBackend(uri);
      }
    }
  };

 const sendToBackend = async (uri: string) => {
  setLoading(true);
  const token = await AsyncStorage.getItem("wardenToken");

  const formData = new FormData();
  formData.append("faceImage", {
    uri,
    name: "face.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("rollNo", student.rollNo); // Optional debug info

  try {
    const res = await axios.post(
      "http://192.168.29.83:5000/api/attendance/recognize",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data", // ✅ Important
        },
      }
    );

    const matched = res.data?.student;

    if (
      matched?.rollNo === student.rollNo &&
      matched?.studentName === student.studentName
    ) {
      Alert.alert("✅ Recognized", `${student.studentName} marked as present.`);
      onMatchSuccess();
      onClose();
    } else {
      Alert.alert("❌ Not Matched", "Face does not match selected student.");
    }
  } catch (error) {
    console.error("Recognition Error:", error);
    Alert.alert("❌ Error", "Something went wrong during face recognition.");
  } finally {
    setLoading(false);
  }
};


  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 10 }}>
          Scan Face of: {student.studentName}
        </Text>

        <TouchableOpacity
          onPress={handleCapture}
          style={{
            backgroundColor: "#2c3e50",
            padding: 12,
            borderRadius: 6,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#fff" }}>📷 Capture Face</Text>
        </TouchableOpacity>

        {capturedUri && (
          <Image
            source={{ uri: capturedUri }}
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              borderRadius: 8,
              marginTop: 10,
            }}
          />
        )}

        {loading && (
          <ActivityIndicator size="large" color="#2c3e50" style={{ marginTop: 20 }} />
        )}

        <TouchableOpacity onPress={onClose} style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "#e74c3c" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
