import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const FaceModalScanner = ({
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
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(50);
  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const fadeOut = useCallback(() => {
    requestAnimationFrame(() => {
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [opacityAnim]);

  const fadeIn = useCallback(() => {
    requestAnimationFrame(() => {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setProcessing(false);
      });
    });
  }, [opacityAnim]);

  useEffect(() => {
    if (!visible) return;
    setCountdown(50);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const handleManualScan = async () => {
    if (!cameraRef.current || processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    fadeOut();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        base64: false,
      });
      await processImage(photo.uri);
    } catch (error) {
      console.error("Manual scan error:", error);
    } finally {
      processingRef.current = false;
      fadeIn();
    }
  };

  const processImage = async (uri: string) => {
    const token = await AsyncStorage.getItem("wardenToken");
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    const normalizedUri =
      Platform.OS === "ios" ? uri.replace("file://", "") : uri;

    const formData = new FormData();
    formData.append("faceImage", {
      uri: normalizedUri,
      name: "scan.jpg",
      type: "image/jpeg",
    } as any);
    formData.append("rollNo", student.rollNo);

    try {
      const res = await axios.post(
        "http://192.168.29.83:5000/api/attendance/recognize",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 15000,
        }
      );

      if (res.data?.student) {
        if (res.data.message?.includes("Already")) {
          Alert.alert(
            "Already Present",
            `${student.studentName} is already marked present.`
          );
        } else {
          Alert.alert(
            "Recognized",
            `${student.studentName} marked as present.`
          );
          onMatchSuccess();
        }
        onClose();
      } else {
        Alert.alert("Not Recognized", "Face did not match the student record.");
      }
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 403 && data?.message?.includes("Face mismatch")) {
        const scanned = data.recognizedId || "Unknown";
        Alert.alert(
          "Face Mismatch",
          `You're logged in as ${student.rollNo}, but scanned face belongs to ${scanned}.`
        );
      } else if (
        status === 404 &&
        data?.message?.includes("Student not recognized")
      ) {
        Alert.alert("Not Recognized", "Face did not match any student record.");
      } else {
        console.error("API Error:", data || error.message);
        Alert.alert(
          "Error",
          "Recognition service unavailable. Please try again."
        );
      }
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need camera permission to scan your face
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View
          style={[styles.cameraContainer, { opacity: opacityAnim }]}
        >
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
            enableTorch={false}
          />
        </Animated.View>

        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            {processing && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="large" color="#00FF00" />
                <Text style={styles.scanningText}>Scanning...</Text>
              </View>
            )}
          </View>

          <Text style={styles.instruction}>
            Position {student.studentName}'s face inside the frame
          </Text>
          <Text style={styles.countdownText}>{countdown}s</Text>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(countdown / 50) * 100}%` },
              ]}
            />
          </View>

          <TouchableOpacity
            onPress={handleManualScan}
            style={[
              styles.actionButton,
              { backgroundColor: "#00FF00", marginTop: 20 },
            ]}
          >
            <Text style={styles.buttonText}>Analyse</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setFacing(facing === "front" ? "back" : "front")}
            style={styles.actionButton}
          >
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    position: "relative",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  scanFrame: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.7)",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanningIndicator: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
  },
  scanningText: {
    color: "white",
    marginTop: 8,
    fontSize: 14,
  },
  instruction: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  countdownText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
  progressBarContainer: {
    height: 6,
    width: "80%",
    backgroundColor: "#444",
    borderRadius: 3,
    marginTop: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00FF00",
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255,50,50,0.8)",
  },
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2c3e50",
    marginBottom: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});
