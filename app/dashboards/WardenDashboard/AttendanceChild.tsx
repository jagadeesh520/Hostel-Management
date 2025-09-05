import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type AttendanceListItem = {
  studentId: string;
  studentName: string;
  roomNo: string;
  status: "Present" | "Absent" | "NotMarked";
  marked: boolean;
  blockName: string;
};

// Safe percentage formatter
const safePct = (n: number) => (isFinite(n) && !isNaN(n) ? Math.round(n) : 0);

// Define props interface for CircularProgress
interface CircularProgressProps {
  presentPercentage: number;
  absentPercentage: number;
  size?: number;
  strokeWidth?: number;
}

const { width } = Dimensions.get('window');

export default function AttendanceChild() {
  const [total, setTotal] = useState(0);
  const [present, setPresent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const todayIST = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60 * 1000); // UTC+5:30
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const load = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) {
        Alert.alert("Error", "Warden not logged in.");
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const date = todayIST();

      const { data } = await axios.get<AttendanceListItem[]>(
        `${API_BASE_URL}/api/attendance/list?date=${date}`,
        { headers }
      );

      const list = data || [];
      const totalStudents = list.length;
      const presentStudents = list.filter((x) => x.status === "Present").length;

      setTotal(totalStudents);
      setPresent(presentStudents);
    } catch (e) {
      console.error("Attendance load error:", e);
      Alert.alert("Error", "Unable to load attendance.");
      setTotal(0);
      setPresent(0);
    } finally {
      setLoading(false);
    }
  };

  const presentPct = useMemo(
    () => (total > 0 ? (present / total) * 100 : 0),
    [present, total]
  );
  const absentPct = Math.max(0, 100 - presentPct);

  // Custom circular progress component with proper visual representation
  const CircularProgress = ({ 
    presentPercentage, 
    absentPercentage, 
    size = 200, 
    strokeWidth = 20 
  }: CircularProgressProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate dasharray and dashoffset for present percentage
    const presentDasharray = circumference;
    const presentDashoffset = circumference - (presentPercentage / 100) * circumference;
    
    // Calculate dasharray and dashoffset for absent percentage (the remaining part)
    const absentDasharray = circumference;
    const absentDashoffset = circumference - (absentPercentage / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgressBase, { width: size, height: size }]}>
          {/* Background circle for absent */}
          <View style={[styles.circularProgressTrack, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#EB5757' // Red for absent
          }]} />
          
          {/* Foreground circle for present */}
          <View style={[styles.circularProgressFill, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#27AE60', // Green for present
            transform: [{ rotate: '-90deg' }],
            borderLeftColor: presentPercentage > 0 ? '#27AE60' : 'transparent',
            borderTopColor: presentPercentage > 0 ? '#27AE60' : 'transparent',
            borderRightColor: presentPercentage >= 50 ? '#27AE60' : 'transparent',
            borderBottomColor: presentPercentage >= 50 ? '#27AE60' : 'transparent',
          }]} />
          
          {/* Center content */}
          <View style={[styles.circularProgressCenter, { 
            width: size - strokeWidth * 2, 
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
          }]}>
            <Text style={styles.bigPct}>{safePct(presentPercentage)}%</Text>
            <Text style={styles.midText}>Present</Text>
            <Text style={styles.smallText}>
              {present} / {total}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today's Attendance</Text>
      
      <View style={styles.card}>
        <CircularProgress 
          presentPercentage={safePct(presentPct)} 
          absentPercentage={safePct(absentPct)} 
        />
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#27AE60" }]} />
            <Text style={styles.legendText}>
              Present {safePct(presentPct)}%
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#EB5757" }]} />
            <Text style={styles.legendText}>
              Absent {safePct(absentPct)}%
            </Text>
          </View>
        </View>
      </View>
      
      {/* Refresh button */}
      <TouchableOpacity style={styles.refreshButton} onPress={load}>
        <Text style={styles.refreshButtonText}>Refresh Attendance</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F6F7FB",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "800", 
    marginVertical: 16, 
    color: "#2D3436",
    textAlign: 'center',
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circularProgressBase: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressTrack: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  circularProgressFill: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  circularProgressCenter: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bigPct: { 
    fontSize: 36, 
    fontWeight: "800", 
    color: "#27AE60",
    marginBottom: 4,
  },
  midText: { 
    fontSize: 16, 
    color: "#2D3436",
    fontWeight: '600',
    marginBottom: 2,
  },
  smallText: { 
    fontSize: 14, 
    color: "#6B7280", 
  },
  legendRow: { 
    flexDirection: "row", 
    justifyContent: "center",
    gap: 24, 
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  legendText: { 
    color: "#374151",
    fontSize: 14,
    fontWeight: '600',
  },
  dot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});