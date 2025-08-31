import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const LOCATION_TASK_NAME = "background-location-task";

// Define the expected shape of the task data
interface LocationTaskData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("❌ Location task error:", error);
    return;
  }

  // Type assertion to ensure TypeScript understands the shape of `data`
  const { locations } = data as LocationTaskData;
  const location = locations?.[0];

  if (!location || !location.coords) {
    console.warn("⚠️ Invalid location data received.");
    return;
  }

  try {
    const studentRaw = await AsyncStorage.getItem("studentInfo");
    if (!studentRaw) {
      console.warn("⚠️ No student info found in AsyncStorage.");
      return;
    }

    const student = JSON.parse(studentRaw);
    console.log("welcome studentss",student)

    console.log("📍 Sending location:", {
      rollNo: student.rollNo,
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      time: location.timestamp,
    });

    await fetch("https://api.sjtechsol.com/api/attendance/location/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rollNo: student.rollNo,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      }),
    });
  } catch (err) {
    console.error("❌ Failed to send location:", err);
  }
});
