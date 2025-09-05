import { API_BASE_URL } from "@/constants/config";
import axios from "axios";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height, width } = Dimensions.get("window");

// Define a type for location options to fix the timeout issue
interface CustomLocationOptions {
  accuracy?: Location.LocationAccuracy;
  maximumAge?: number;
  timeout?: number; // Add timeout to the interface
}

export default function CampusLocationPicker() {
  const [collegeName, setCollegeName] = useState("JNTUACEP");
  const [radius, setRadius] = useState("150");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({
    latitude: 17.385,
    longitude: 78.4867,
  });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null); // Provide type for useRef

  console.log("radius",radius)

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
  fetchCampusLocation();
}, []);

const fetchCampusLocation = async () => {
  try {
    const url = `${API_BASE_URL.replace(/\/$/, "")}/api/campusLocation/${collegeName}`;
    const res = await axios.get(url);

    if (res.data?.data) {
      const loc = res.data.data;
      setLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setRadius(String(loc.radius));  // 👈 now your state matches DB
    }
  } catch (err: any) {
    console.error("❌ Error fetching campus location:", err.message);
  }
};


  const getLocation = async () => {
    try {
      setLoading(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setPermissionGranted(false);
        setLocationError("Location permission denied");
        Alert.alert(
          "Permission required",
          "Location permission is needed to show your current location",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        setLoading(false);
        return;
      }

      setPermissionGranted(true);

      let currentLocation;
      try {
        // Create a custom options object that includes timeout
        const options: CustomLocationOptions = {
          accuracy: Location.LocationAccuracy.High,
        };

        // For the actual implementation, we need to handle timeout differently
        // as Expo's getCurrentPositionAsync doesn't support timeout directly
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.LocationAccuracy.High,
        });
      } catch (err) {
        console.warn(
          "⚠️ getCurrentPositionAsync failed, trying fallback:",
          err
        );
        currentLocation = await Location.getLastKnownPositionAsync();

        if (currentLocation) {
          Alert.alert(
            "Location Note",
            "Using last known location. For better accuracy, ensure location services are enabled."
          );
        }
      }

      if (currentLocation) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } else {
        const errorMsg =
          "Unable to fetch location data. Please check your location services.";
        setLocationError(errorMsg);
        Alert.alert("Location Error", errorMsg);
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Error getting location:", error);
      setLocationError("An unexpected error occurred while fetching location");
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!collegeName.trim()) {
      Alert.alert("Error", "Please enter a college name");
      return;
    }

    const radiusValue = parseInt(radius, 10);
    if (isNaN(radiusValue) || radiusValue <= 0 || radiusValue > 10000) {
      Alert.alert(
        "Error",
        "Please enter a valid radius between 1 and 10000 meters"
      );
      return;
    }

    try {
      const url = API_BASE_URL.endsWith("/")
        ? `${API_BASE_URL}api/campusLocation`
        : `${API_BASE_URL}/api/campusLocation`;

      const res = await axios.post(url, {
        collegeName,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: radiusValue,
      });

      if (res.status === 201 || res.status === 200) {
        Alert.alert("✅ Success", res.data.message || "Campus location saved!");
      } else {
        Alert.alert(
          "❌ Error",
          res.data.message || "Failed to save campus location"
        );
      }
    } catch (err: any) {
      console.error("❌ Error saving campus location:", err.message || err);
      Alert.alert(
        "❌ Error",
        "Unable to update campus location. Please try again."
      );
    }
  };

  const openMapsApp = () => {
    const url =
      Platform.select({
        ios: `maps:0,0?q=${location.latitude},${
          location.longitude
        }(${encodeURIComponent(collegeName)})`,
        android: `geo:0,0?q=${location.latitude},${
          location.longitude
        }(${encodeURIComponent(collegeName)})`,
      }) ||
      `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      );
    });
  };

  const CustomMapVisualization = () => {
    const circleSize = Math.min(width * 0.5, 200); // Responsive circle size

    return (
      <View style={styles.customMapContainer}>
        <Text style={styles.customMapTitle}>📍 Location Preview</Text>

        <View style={styles.mapGrid}>
          {[...Array(5)].map((_, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {[...Array(5)].map((_, cellIndex) => {
                if (rowIndex === 2 && cellIndex === 2) {
                  return (
                    <View key={cellIndex} style={styles.mapMarker}>
                      <Text style={styles.markerText}>📍</Text>
                    </View>
                  );
                }
                return <View key={cellIndex} style={styles.gridCell} />;
              })}
            </View>
          ))}
        </View>

        <View
          style={[
            styles.radiusCircle,
            { width: circleSize, height: circleSize },
          ]}
        >
          <Text style={styles.radiusText}>Radius: {radius}m</Text>
        </View>

        <Text style={styles.coordinates}>
          {location.latitude.toFixed(6)}° N, {location.longitude.toFixed(6)}° E
        </Text>

        {locationError && <Text style={styles.errorText}>{locationError}</Text>}
      </View>
    );
  };

  const MapDisplay = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Getting your location...</Text>
          <TouchableOpacity onPress={getLocation} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <CustomMapVisualization />

        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={getLocation}>
            <Text style={styles.refreshButtonText}>Refresh Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openMapsButton} onPress={openMapsApp}>
            <Text style={styles.openMapsText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Location</Text>
        <Text style={styles.subHeader}>Campus Location Picker</Text>

        <MapDisplay />

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>College Name</Text>
            <TextInput
              style={styles.input}
              value={collegeName}
              onChangeText={setCollegeName}
              placeholder="Enter college name"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Radius (meters)</Text>
            <TextInput
              style={styles.input}
              value={radius}
              onChangeText={(text) => {
                // Allow only numbers
                if (/^\d*$/.test(text)) {
                  setRadius(text);
                }
              }}
              keyboardType="number-pad"
              placeholder="Enter radius in meters"
              maxLength={5}
            />
            <Text style={styles.hintText}>Recommended: 100-200 meters</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSaveLocation}>
            <Text style={styles.buttonText}>Save Campus Location</Text>
          </TouchableOpacity>

          <View style={styles.troubleshootSection}>
            <Text style={styles.troubleshootTitle}>Location Tips:</Text>
            <Text style={styles.troubleshootText}>
              • Enable GPS for better accuracy
            </Text>
            <Text style={styles.troubleshootText}>
              • Go outdoors for more precise location
            </Text>
            <Text style={styles.troubleshootText}>
              • Refresh location if it seems inaccurate
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 15,
    marginBottom: 5,
    color: "#2c3e50",
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#7f8c8d",
  },
  mapContainer: {
    minHeight: height * 0.5,
    marginHorizontal: 15,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  customMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#e8f4f8",
  },
  customMapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2c3e50",
  },
  mapGrid: {
    width: "80%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 5,
    backgroundColor: "#ecf0f1",
    padding: 5,
    marginBottom: 15,
  },
  gridRow: {
    flex: 1,
    flexDirection: "row",
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#dce0e0",
    margin: 2,
    borderRadius: 3,
    backgroundColor: "#f9f9f9",
  },
  mapMarker: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  markerText: {
    fontSize: 24,
  },
  radiusCircle: {
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "rgba(0, 122, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    marginBottom: 15,
  },
  radiusText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    padding: 5,
  },
  coordinates: {
    fontSize: 14,
    color: "#2c3e50",
    fontWeight: "500",
    marginBottom: 5,
  },
  errorText: {
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
  mapActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#f8f8f8",
  },
  refreshButton: {
    backgroundColor: "#5cb85c",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "600",
  },
  openMapsButton: {
    backgroundColor: "#4285F4",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  openMapsText: {
    color: "white",
    fontWeight: "bold",
  },
  loadingContainer: {
    height: height * 0.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    marginHorizontal: 15,
    borderRadius: 12,
    marginBottom: 20,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  hintText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 5,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  troubleshootSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  troubleshootText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
});
