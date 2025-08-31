// AttendanceScanner.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FaceModalScanner } from "../WardenDashboard/FaceModalCamera";

interface CampusInfo {
  latitude: number;
  longitude: number;
  radius: number;
}

interface Student {
  rollNo: string;
  studentName: string;
  roomNo: string;
  blockName?: string;
}

type BannerType = "success" | "info" | "error" | null;

export default function AttendanceScanner() {
  const [student, setStudent] = useState<Student | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<
    boolean | null
  >(null);
  const [campusInfo, setCampusInfo] = useState<CampusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [faceModalVisible, setFaceModalVisible] = useState(false);

  // Inline banner (replaces Alert)
  const [bannerType, setBannerType] = useState<BannerType>(null);
  const [bannerTitle, setBannerTitle] = useState<string>("");
  const [bannerSubtitle, setBannerSubtitle] = useState<string>("");
  const bannerY = useRef(new Animated.Value(-80)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (
    type: BannerType,
    title: string,
    subtitle?: string,
    autoHide: boolean = true
  ) => {
    setBannerType(type);
    setBannerTitle(title);
    setBannerSubtitle(subtitle || "");

    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(bannerY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (autoHide) {
        autoHideTimer.current = setTimeout(hideBanner, 1600);
      }
    });
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(bannerY, {
        toValue: -80,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    const init = async () => {
      try {
        // Load student
        const stored = await AsyncStorage.getItem("currentStudent");
        if (!stored) {
          showBanner(
            "error",
            "Student data not found",
            "Please log in again.",
            false
          );
          setLoading(false);
          return;
        }
        const parsedStudent: Student = JSON.parse(stored);
        setStudent(parsedStudent);

        // Request location permission
        const locStatus = await Location.requestForegroundPermissionsAsync();
        setHasLocationPermission(locStatus.granted);
        if (!locStatus.granted) {
          showBanner(
            "error",
            "Location permission required",
            "Enable location to mark attendance.",
            false
          );
          setLoading(false);
          return;
        }

        // Fetch campus info
        const res = await fetch(
          "https://api.sjtechsol.com/api/campusLocation/JNTUACEP"
        );
        if (!res.ok) throw new Error("Failed to fetch campus location");
        const json = await res.json();
        setCampusInfo(json.data);

        // Check student location immediately
        await validateLocation(parsedStudent, json.data);
      } catch (err) {
        console.error("Init failed:", err);
        showBanner(
          "error",
          "Initialization failed",
          "Please try again.",
          false
        );
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, []);

  // In AttendanceScanner.tsx, modify the validateLocation function

  const validateLocation = async (student: Student, campus: CampusInfo) => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const distance = getDistanceFromLatLonInMeters(
        loc.coords.latitude,
        loc.coords.longitude,
        campus.latitude,
        campus.longitude
      );

      if (distance > campus.radius) {
        showBanner(
          "error",
          "Outside Campus",
          "You are not within campus premises.",
          false
        );
        return;
      }

      // Check if attendance already exists
      const today = new Date().toISOString().split("T")[0];
      const rollNo = student.rollNo;
      const res = await fetch(
        `https://api.sjtechsol.com/api/studentAuth/check/${rollNo}?date=${today}`,
        { headers: { Accept: "application/json" } }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Invalid server response:", text);
        showBanner("error", "Server error", "Invalid response.", false);
        return;
      }

      const json = await res.json();
      if (json.status === "Present") {
        showBanner(
          "info",
          "Already Marked",
          "You are present for today.",
          false
        );
        return;
      }

      // ✅ Inside campus & not marked: show success banner and open scanner
      showBanner("success", "Inside Campus", "You may proceed to scan.", true);

      // Open scanner after banner shows for a moment
      setTimeout(() => {
        setFaceModalVisible(true);
      }, 1000); // Reduced delay to 1 second
    } catch (err) {
      console.error("Location validation failed:", err);
      showBanner(
        "error",
        "Location check failed",
        "Could not get location or status.",
        false
      );
    }
  };

  const bannerBg = useMemo(() => {
    if (bannerType === "success") return "#1ABC9C";
    if (bannerType === "info") return "#2980B9";
    if (bannerType === "error") return "#C0392B";
    return "transparent";
  }, [bannerType]);

  const bannerIcon = useMemo(() => {
    if (bannerType === "success") return "✔";
    if (bannerType === "info") return "ℹ";
    if (bannerType === "error") return "✖";
    return "";
  }, [bannerType]);

  if (loading || hasLocationPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00bfff" />
        <Text>Checking location and campus info...</Text>
      </View>
    );
  }

  if (!hasLocationPermission) {
    return (
      <View style={styles.center}>
        <Text>No location access</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Top banner */}
      {bannerType && (
        <Animated.View
          style={[
            styles.banner,
            {
              backgroundColor: bannerBg,
              opacity: bannerOpacity,
              transform: [{ translateY: bannerY }],
            },
          ]}
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconCircle}>
              <Text style={styles.bannerIcon}>{bannerIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{bannerTitle}</Text>
              {!!bannerSubtitle && (
                <Text style={styles.bannerSubtitle}>{bannerSubtitle}</Text>
              )}
            </View>
            <TouchableOpacity onPress={hideBanner} style={styles.bannerClose}>
              <Text style={styles.bannerCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {student && (
        <FaceModalScanner
          visible={faceModalVisible}
          student={student}
          onClose={() => setFaceModalVisible(false)}
          onMatchSuccess={() => {
            // Silent success; no system Alert here.
            showBanner(
              "success",
              "Attendance Marked",
              `${student.studentName} is present.`
            );
          }}
          onResult={(r: any) => {
            // Mirror scanner status to this screen (optional)
            if (r.type === "success" || r.type === "already") {
              showBanner("success", r.title, r.subtitle);
            } else if (r.type === "mismatch" || r.type === "notfound") {
              showBanner("info", r.title, r.subtitle);
            } else if (r.type === "network" || r.type === "error") {
              showBanner("error", r.title, r.subtitle);
            }
          }}
        />
      )}
    </View>
  );
}

function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Banner styles
  banner: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    zIndex: 5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  bannerIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  bannerTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "white",
    fontSize: 12,
    opacity: 0.95,
  },
  bannerClose: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerCloseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
});
