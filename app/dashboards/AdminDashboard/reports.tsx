import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Ticket = {
  resolutionImage: string;
  studentName: string;
  roomNo: string;
  _id: string;
  description: string;
  issueType: string;
  status: "pending" | "resolved";
  rollNo: string;
  createdAt?: string;
  imagePath?: string;
};

const AdminTicketScreen = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [zoomVisible, setZoomVisible] = useState(false);
  const [resolvedImage, setResolvedImage] = useState<any>(null);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(
        "http://192.168.29.83:5000/api/issueTicket/tickets"
      );
      setTickets(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    }
  };

  const pickResolvedImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setResolvedImage(result.assets[0]);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;

    if (!resolvedImage) {
      Alert.alert("Capture Required", "Please capture a resolved image.");
      return;
    }

    const formData = new FormData();
    formData.append("reply", "Issue resolved successfully."); // Optional text reply
    formData.append("resolutionImage", {
      uri: resolvedImage.uri,
      name: `resolved_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any); // for TypeScript

    try {
      await axios.post(
        `http://192.168.29.83:5000/api/issueTicket/tickets/${selectedTicket._id}/resolve`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Alert.alert("Success", "Ticket marked as resolved.");
      setModalVisible(false);
      setResolvedImage(null);
      fetchTickets();
    } catch (error) {
      console.error("Error resolving ticket:", error);
      Alert.alert("Error", "Failed to mark ticket as resolved.");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const description = ticket.description?.toLowerCase() || "";
    const issueType = ticket.issueType?.toLowerCase() || "";
    const status = ticket.status?.toLowerCase() || "";

    const matchesQuery =
      description.includes(searchQuery.toLowerCase()) ||
      issueType.includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || status === filterStatus.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  const renderItem = ({ item }: { item: Ticket }) => {
    const status = item.status?.toLowerCase();

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            borderLeftColor: status === "resolved" ? "#28a745" : "#dc3545",
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
        onPress={() => {
          setSelectedTicket(item);
          setResolvedImage(null);
          setModalVisible(true);
        }}
      >
        {/* Images side-by-side */}
        <View style={{ flexDirection: "column", marginRight: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setSelectedTicket(item);
              setZoomImageUri(
                `http://192.168.29.83:5000/uploads/faces/${item.imagePath}`
              );
              setZoomVisible(true);
            }}
          >
            <Image
              source={{
                uri: `http://192.168.29.83:5000/uploads/faces/${item.imagePath}`,
              }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 8,
                marginBottom:
                  status === "resolved" && item.resolutionImage ? 5 : 0,
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {status === "resolved" && item.resolutionImage && (
            <TouchableOpacity
              onPress={() => {
                setSelectedTicket(item);
                setZoomImageUri(
                  `http://192.168.29.83:5000/uploads/faces/${item.resolutionImage}`
                );
                setZoomVisible(true);
              }}
            >
              <Image
                source={{
                  uri: `http://192.168.29.83:5000/uploads/faces/${item.resolutionImage}`,
                }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 8,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Ticket Info */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.issueType}</Text>
          <Text style={styles.cardText}>Description: {item.description}</Text>
          <Text style={styles.cardText}>Roll No: {item.rollNo}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: status === "resolved" ? "#28a745" : "#dc3545",
                marginTop: 5,
                alignSelf: "flex-start",
              },
            ]}
          >
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets..."
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
        <Picker
          selectedValue={filterStatus}
          style={styles.picker}
          onValueChange={(itemValue) => setFilterStatus(itemValue)}
        >
          <Picker.Item label="All" value="all" />
          <Picker.Item label="Pending" value="pending" />
          <Picker.Item label="Resolved" value="resolved" />
        </Picker>
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Modal for Ticket Details */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedTicket && (
              <>
                <Text style={styles.modalTitle}>Ticket Details</Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Type:</Text>{" "}
                  {selectedTicket.issueType}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Description:</Text>{" "}
                  {selectedTicket.description}
                </Text>

                {resolvedImage && (
                  <Image
                    source={{ uri: resolvedImage.uri }}
                    style={{
                      width: 150,
                      height: 100,
                      borderRadius: 8,
                      marginVertical: 10,
                    }}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#007bff" }]}
                    onPress={pickResolvedImage}
                  >
                    <Text style={styles.modalButtonText}>
                      Capture Resolved Image
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#28a745" }]}
                    onPress={handleResolve}
                  >
                    <Text style={styles.modalButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
      {zoomVisible && zoomImageUri && (
        <Modal visible={zoomVisible} transparent={true}>
          <View style={{ flex: 1, backgroundColor: "black" }}>
            {/* Close Icon */}
            <TouchableOpacity
              onPress={() => {
                setZoomVisible(false);
                setZoomImageUri(null);
              }}
              style={{
                position: "absolute",
                top: 40,
                right: 20,
                zIndex: 2,
              }}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>

            {/* Zoom Image */}
            <Image
              source={{ uri: zoomImageUri }}
              style={{ flex: 1, resizeMode: "contain" }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

export default AdminTicketScreen;

// Styles (same as before, kept unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f4f4f4",
  },
  filters: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  picker: {
    backgroundColor: "#fff",
    borderRadius: 8,
    height: 50,
  },
  card: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
    color: "#333",
  },
  cardText: {
    fontSize: 14,
    color: "#444",
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  modalText: {
    fontSize: 15,
    marginBottom: 8,
    color: "#444",
  },
  bold: {
    fontWeight: "bold",
    color: "#222",
  },
  modalButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    justifyContent: "space-between",
  },
  modalButton: {
    flexGrow: 1,
    backgroundColor: "#007bff",
    paddingVertical: 12,
    marginHorizontal: 5,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomedImage: {
    width: "90%",
    height: "70%",
    borderRadius: 10,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  closeText: {
    fontWeight: "bold",
    color: "#000",
  },
});
