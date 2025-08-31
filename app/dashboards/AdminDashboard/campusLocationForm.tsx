import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import MapView, { Circle, Marker } from "react-native-maps";

const screen = Dimensions.get("window");

export default function CampusMapPicker() {
  const [location, setLocation] = useState<Region | null>(null);
  const [radius, setRadius] = useState("150");
  const [collegeName, setCollegeName] = useState("JNTUACEP");
  const [loading, setLoading] = useState(true); // Spinner state

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setLoading(false); // Map is ready
    })();
  }, []);

  const handleSubmit = async () => {
    if (!location || !radius || !collegeName) {
      Alert.alert("Missing Info", "Please provide all details.");
      return;
    }

    try {
      const response = await fetch(
        "https://api.sjtechsol.com/api/campusLocation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collegeName,
            latitude: location.latitude,
            longitude: location.longitude,
            radius: parseFloat(radius),
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", data.message || "Campus location saved.");
      } else {
        Alert.alert("Error", data.message || "Failed to save location.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍 Campus Location Picker</Text>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={{ marginTop: 10 }}>Loading map...</Text>
        </View>
      ) : (
        location && (
          <MapView
            style={styles.map}
            region={location}
            onRegionChangeComplete={(region) => setLocation(region)}
          >
            <Marker coordinate={location} />
            <Circle
              center={location}
              radius={parseFloat(radius) || 0}
              strokeColor="#007bff"
              fillColor="rgba(0,123,255,0.2)"
            />
          </MapView>
        )
      )}

      <View style={styles.form}>
        <Text style={styles.label}>College Name</Text>
        <TextInput
          style={styles.input}
          value={collegeName}
          onChangeText={setCollegeName}
        />

        <Text style={styles.label}>Radius (meters)</Text>
        <TextInput
          style={styles.input}
          value={radius}
          onChangeText={(text) => {
            const parsed = parseFloat(text);
            if (!isNaN(parsed) && parsed >= 0) {
              setRadius(text);
            } else {
              setRadius("0");
            }
          }}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save Campus Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  icon: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 10,
  },
  map: { width: screen.width, height: screen.height * 0.5 },
  form: { padding: 20, backgroundColor: "#fff" },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  loaderContainer: {
    height: screen.height * 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
});
