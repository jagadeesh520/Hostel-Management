import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Warden = {
  _id: string;
  name: string;
  block: string;
};

export default function WardenBlockSelector() {
  const router = useRouter();
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const pastelColors = [
    "#e67c73", // darker pink/red
    "#f4a261", // soft orange
    "#e9c46a", // golden yellow
    "#90be6d", // olive green
    "#4dabf7", // sky blue
    "#9b59b6", // purple
    "#f78fb3", // deeper pink
    "#38ada9", // teal
    "#b8e994", // light olive
    "#706fd3", // deep lavender
  ];

  useEffect(() => {
    fetchWardens();
  }, []);

  const fetchWardens = async () => {
    try {
      const token = await AsyncStorage.getItem("wardenToken");
      if (!token) {
        Alert.alert("Error", "Warden not logged in.");
        return;
      }

      const res = await axios.get("http://192.168.29.83:5000/api/wardens", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWardens(res.data);
    } catch (err) {
      console.error("Failed to fetch wardens:", err);
      Alert.alert("Error", "Could not fetch wardens");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: () => {
          router.replace("/(tabs)/Admin/admin-login");
        },
      },
    ]);
  };

  const handleViewStudents = () => {
    if (selectedBlock) {
      router.push({
        pathname: "/dashboards/WardenDashboard/StudentListScreen",
        params: { blockName: selectedBlock },
      });
    } else {
      Alert.alert("Please select a block.");
    }
  };

  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const intToHSL = (i: number) => {
    const hue = i % 360;
    const sat = 50 + (i % 20); // 50%–70% saturation
    const light = 60 + (i % 15); // 60%–75% lightness
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  const getCardColor = (block: string) => {
    const hash = hashCode(block.trim().toUpperCase());
    const index = hash % pastelColors.length;
    return pastelColors[index]; // ✅ pastelColors now exists
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Assigned Wardens</Text>
      <FlatList
        data={wardens}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          console.log("Raw block value:", item.block);
          const isSelected = selectedBlock === item.block;
          return (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: getCardColor(item.block) },
                isSelected && styles.selectedCard,
              ]}
              onPress={() => setSelectedBlock(item.block)}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🏢</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>{item.block} Block</Text>
                  <Text style={styles.cardSubtitle}>{item.name}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.noData}>No wardens found.</Text>
        }
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            !selectedBlock && styles.viewButtonDisabled,
          ]}
          onPress={handleViewStudents}
          disabled={!selectedBlock}
        >
          <Text style={styles.viewButtonText}>View Students</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6fa",
    paddingBottom: 40,
  },

  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#2f3640",
  },

  card: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
  },

  selectedCard: {
    borderWidth: 3,
    borderColor: "#2f3640", // Dark gray for contrast
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6, // For Android
  },

  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ffffff55", // or remove transparency entirely
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },

  cardSubtitle: {
    fontSize: 14,
    color: "#f0f0f0",
  },

  noData: {
    textAlign: "center",
    marginTop: 30,
    color: "#888",
  },
  buttonContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    gap: 15,
  },

  viewButton: {
    backgroundColor: "#3498db", // Primary blue
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  viewButtonDisabled: {
    backgroundColor: "#bdc3c7", // Grey when disabled
  },

  viewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  logoutButton: {
    backgroundColor: "#e74c3c", // Tomato red
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
