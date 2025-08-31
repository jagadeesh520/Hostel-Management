import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

const RaiseTicketScreen = () => {
  const [issueType, setIssueType] = useState("Water Problem");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Water Problem", value: "Water Problem" },
    { label: "Mess Food Issue", value: "Mess Food" },
    { label: "Cleaning Issue", value: "Cleaning" },
    { label: "Electricity Issue", value: "Electricity" },
    { label: "Other", value: "Other" },
  ]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!description || !photo) {
      Alert.alert("Please provide both description and image.");
      return;
    }
    const rollNo = await AsyncStorage.getItem("rollNo");
    const formData = new FormData();
    formData.append("issueType", issueType);
    formData.append("description", description);
    formData.append("rollNo", rollNo || "");

    if (photo?.uri) {
      formData.append("image", {
        uri: photo.uri,
        name: "issue.jpg",
        type: "image/jpeg",
      } as any); // You can refine this with `FormData.append()` type if needed
    }

    console.log("formData", formData);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/issueTicket/tickets`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("res", res);
      Alert.alert("Ticket raised successfully!");
      setDescription("");
      setPhoto(null);
    } catch (err) {
      console.error("Ticket submit error:", err);
      Alert.alert("Failed to raise ticket");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Raise a Ticket</Text>

      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder="Select Issue Type"
        style={{
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 10,
        }}
        dropDownContainerStyle={{
          borderColor: "#ccc",
        }}
      />

      {/* <Text style={styles.label}>Issue Type</Text>
      <Picker
        selectedValue={issueType}
        onValueChange={(value) => setIssueType(value)}
        style={styles.picker}
      >
        <Picker.Item label="Water Problem" value="Water Problem" />
        <Picker.Item label="Mess Food Issue" value="Mess Food" />
        <Picker.Item label="Cleaning Issue" value="Cleaning" />
        <Picker.Item label="Electricity Issue" value="Electricity" />
        <Picker.Item label="Other" value="Other" />
      </Picker> */}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Describe the issue..."
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Capture / Select Photo</Text>
      </TouchableOpacity>

      {photo && (
        <Image
          source={{ uri: photo.uri }}
          style={{ width: "100%", height: 200, marginVertical: 10 }}
        />
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit Ticket</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RaiseTicketScreen;

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#f8f9fa" },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { marginTop: 10, fontWeight: "bold" },
  picker: { backgroundColor: "#eee", borderRadius: 6 },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
    height: 100,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#00c2cb",
    padding: 12,
    marginTop: 15,
    borderRadius: 6,
  },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 6,
    marginTop: 20,
  },
  submitText: { color: "white", textAlign: "center", fontWeight: "bold" },
});
