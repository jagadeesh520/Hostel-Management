import { API_BASE_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TOAST_DURATION = 3500;
const SUCCESS_COLOR = "#27AE60"; // green
const ERROR_COLOR = "#E74C3C"; // red

// ---- result types sent to the parent via onResult ----
export type ResultType =
  | "success"
  | "already"
  | "mismatch"
  | "notfound"
  | "network"
  | "error";

export type ScannerResult = {
  type: ResultType;
  title: string;
  subtitle: string;
};

export const FaceModalScanner = ({
  visible,
  onClose,
  student,
  onMatchSuccess,
  onResult, // optional emitter to parent
}: {
  visible: boolean;
  onClose: () => void;
  student: any;
  onMatchSuccess: () => void;
  onResult?: (result: ScannerResult) => void;
}) => {
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(50);
  const cameraRef = useRef<CameraView>(null);
  const processingRef = useRef(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // --- Toast state (in its own modal) ---
  const [toastText, setToastText] = useState<string>("");
  const [toastBg, setToastBg] = useState<string>(SUCCESS_COLOR);
  const toastY = useRef(new Animated.Value(120)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.95)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Queue parent result until after toast hides
  const pendingResultRef = useRef<ScannerResult | null>(null);

  const safeDefer = (fn: () => void) => {
    setTimeout(() => requestAnimationFrame(fn), 0);
  };

  const showToast = useCallback(
    (text: string, bgColor: string, onHidden?: () => void) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastText(text);
      setToastBg(bgColor);
      setToastVisible(true);

      toastY.setValue(120);
      toastOpacity.setValue(0);
      toastScale.setValue(0.95);

      Animated.parallel([
        Animated.timing(toastY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(toastScale, {
          toValue: 1,
          stiffness: 220,
          damping: 18,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start(() => {
        toastTimerRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(toastY, {
              toValue: 120,
              duration: 220,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(toastOpacity, {
              toValue: 0,
              duration: 220,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(toastScale, {
              toValue: 0.98,
              duration: 200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setToastVisible(false);

            if (pendingResultRef.current) {
              const queued = pendingResultRef.current;
              pendingResultRef.current = null;
              safeDefer(() => {
                try {
                  onResult?.(queued);
                } catch {}
              });
            }

            if (onHidden) {
              safeDefer(onHidden);
            }
          });
        }, TOAST_DURATION);
      });
    },
    [toastOpacity, toastY, toastScale, onResult]
  );

  const hideToastImmediately = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    toastY.setValue(120);
    toastOpacity.setValue(0);
    toastScale.setValue(0.95);
    setToastVisible(false);
  }, [toastOpacity, toastY, toastScale]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

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

    hideToastImmediately();
    pendingResultRef.current = null;

    setCountdown(50);
    setProcessing(true);

    const settleTimer = setTimeout(() => setProcessing(false), 1500);

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          safeDefer(onClose);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(settleTimer);
      clearInterval(countdownTimer);
    };
  }, [visible, onClose, hideToastImmediately]);

  const handleManualScan = async () => {
    if (!cameraRef.current || processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    fadeOut();

    try {
      const photo = await (cameraRef.current as any).takePictureAsync({
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
    const normalizedUri =
      Platform.OS === "ios" ? uri.replace("file://", "") : uri;

    const formData = new FormData();
    formData.append("faceImage", {
      uri: normalizedUri,
      name: "scan.jpg",
      type: "image/jpeg",
    } as any);
    formData.append("rollNo", student.rollNo);

    const sendRequest = async () => {
      const url = API_BASE_URL.endsWith("/")
        ? `${API_BASE_URL}api/attendance/recognize`
        : `${API_BASE_URL}/api/attendance/recognize`;

      return axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
    };

    try {
      let res;
      try {
        res = await sendRequest();
      } catch (error: any) {
        if (error.message === "Network Error") {
          console.warn("⚠️ Network error, retrying once...");
          await new Promise((r) => setTimeout(r, 1000));
          res = await sendRequest(); // retry once
        } else {
          throw error;
        }
      }

      console.log("📡 API response:", res.data);

      const { status, message, recognizedId } = res.data || {};

      if (!status) {
        showToast("Invalid server response", ERROR_COLOR);
        return;
      }

      if (status === "matched") {
        const subtitle = `${student.studentName} is present.`;
        pendingResultRef.current = {
          type: "success",
          title: "Attendance Marked",
          subtitle,
        };

        showToast(subtitle, SUCCESS_COLOR, () => {
          safeDefer(() => {
            try {
              onMatchSuccess();
            } catch {}
            onClose();
          });
        });
        return;
      }

      if (status === "already") {
        pendingResultRef.current = {
          type: "already",
          title: "Already Marked",
          subtitle: `${student.studentName} is already present.`,
        };
        showToast(
          `${student.studentName} is already marked present.`,
          SUCCESS_COLOR
        );
        return;
      }

      if (status === "mismatch") {
        const subtitle = `Logged in as ${student.rollNo}, scanned face: ${recognizedId}.`;
        pendingResultRef.current = {
          type: "mismatch",
          title: "Face Mismatch",
          subtitle,
        };
        showToast("Face mismatch.", ERROR_COLOR);
        return;
      }

      if (status === "unmatched") {
        pendingResultRef.current = {
          type: "notfound",
          title: "Not Recognized",
          subtitle: "Face did not match any student record.",
        };
        showToast("Face not recognized.", ERROR_COLOR);
        return;
      }

      if (status === "error") {
        pendingResultRef.current = {
          type: "error",
          title: "Error",
          subtitle: message || "Recognition error",
        };
        showToast(message || "Recognition error", ERROR_COLOR);
        return;
      }

      showToast("Unexpected response", ERROR_COLOR);
    } catch (error: any) {
      console.error("❌ Axios error:", error.message);

      if (
        error.message?.includes("Network Error") ||
        error.code === "ECONNABORTED"
      ) {
        safeDefer(() => {
          try {
            onResult?.({
              type: "network",
              title: "Network Issue",
              subtitle: "Check your connection and try again.",
            });
          } catch {}
        });
        Alert.alert(
          "Network Issue",
          "Unable to reach recognition service. Please check your connection and try again."
        );
      } else {
        safeDefer(() => {
          try {
            onResult?.({
              type: "error",
              title: "Service Unavailable",
              subtitle: "Please try again.",
            });
          } catch {}
        });
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
                <ActivityIndicator size="large" />
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
            disabled={processing}
            style={[
              styles.actionButton,
              {
                backgroundColor: processing ? "#888" : "#00FF00",
                marginTop: 20,
              },
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
            onPress={() => {
              hideToastImmediately();
              safeDefer(onClose);
            }}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* 🔔 Scanner Toast Modal */}
        <Modal
          visible={toastVisible}
          transparent
          animationType="none"
          statusBarTranslucent
          presentationStyle="overFullScreen"
        >
          <View style={styles.toastModalLayer} pointerEvents="box-none">
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toast,
                {
                  backgroundColor: toastBg,
                  opacity: toastOpacity,
                  transform: [{ translateY: toastY }, { scale: toastScale }],
                },
              ]}
            >
              <View style={styles.toastContent}>
                {toastBg === SUCCESS_COLOR && (
                  <Ionicons
                    name="checkmark-circle"
                    size={28}
                    color="white"
                    style={{ marginRight: 10 }}
                  />
                )}
                {toastBg === ERROR_COLOR && (
                  <Ionicons
                    name="close-circle"
                    size={28}
                    color="white"
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text style={styles.toastText}>{toastText}</Text>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", position: "relative" },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
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
  countdownText: { color: "white", fontSize: 18, marginTop: 10 },
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
  cancelButton: { backgroundColor: "rgba(255,50,50,0.8)" },
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#2c3e50",
    marginBottom: 16,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "500" },
  scanningText: { color: "white", fontSize: 14, marginTop: 8 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.7)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  scanningIndicator: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
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
  toastModalLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingBottom: 110,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    marginHorizontal: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 70,
    justifyContent: "center",
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
