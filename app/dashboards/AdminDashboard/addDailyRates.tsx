import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const MessFeeCalculator = () => {
  const [boyRate, setBoyRate] = useState("");
  const [girlRate, setGirlRate] = useState("");
  const [existingRateId, setExistingRateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed for UI & query
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = now.toLocaleString("default", { month: "long" });

  const calculateTotal = (rate: string) => {
    const num = parseInt(rate);
    return isNaN(num) ? 0 : num * daysInMonth;
  };

  const fetchExistingRate = async () => {
    try {
      const res = await axios.get(
        `http://192.168.29.83:5000/api/adminRates/rate?month=${month}&year=${year}`
      );
      const rate = res.data;
      if (rate) {
        setBoyRate(rate.boysRate.toString());
        setGirlRate(rate.girlsRate.toString());
        setExistingRateId(rate._id);
      }
    } catch (err) {
      console.log("No existing rate or error fetching");
      setExistingRateId(null);
      setBoyRate("");
      setGirlRate("");
    }
  };

  const handleSubmit = async () => {
    const boysRateNum = parseInt(boyRate);
    const girlsRateNum = parseInt(girlRate);

    if (isNaN(boysRateNum) || isNaN(girlsRateNum)) {
      Alert.alert("Validation Error", "Enter valid numeric rates.");
      return;
    }

    const payload = {
      month,
      year,
      boysRate: boysRateNum,
      girlsRate: girlsRateNum,
      boysTotal: calculateTotal(boyRate),
      girlsTotal: calculateTotal(girlRate),
    };

    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) throw new Error("No token");

      setLoading(true);
      const url = existingRateId
        ? `http://192.168.29.83:5000/api/adminRates/update-daily-rate/${existingRateId}`
        : "http://192.168.29.83:5000/api/adminRates/set-daily-rate";

      const method = existingRateId ? "put" : "post";

      const res = await axios[method](url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert("Success", existingRateId ? "Rates updated!" : "Rates submitted!");
      fetchExistingRate(); // Refresh UI
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Error submitting rates";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRateId) return;

    Alert.alert("Confirm", "Are you sure you want to delete this month's rates?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("adminToken");
            if (!token) throw new Error("No token");

            await axios.delete(
              `http://192.168.29.83:5000/api/adminRates/delete-daily-rate/${existingRateId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            Alert.alert("Deleted", "Rates deleted successfully.");
            setBoyRate("");
            setGirlRate("");
            setExistingRateId(null);
          } catch (err: any) {
            const msg =
              err?.response?.data?.message ||
              err.message ||
              "Error deleting rate";
            Alert.alert("Error", msg);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchExistingRate();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Mess Fee - {monthName} {year}
      </Text>

      <Text>Boys Amount (per day)</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 300"
        style={styles.input}
        value={boyRate}
        onChangeText={setBoyRate}
      />
      <Text>Total for Boys: ₹{calculateTotal(boyRate)}</Text>

      <Text style={{ marginTop: 20 }}>Girls Amount (per day)</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 250"
        style={styles.input}
        value={girlRate}
        onChangeText={setGirlRate}
      />
      <Text>Total for Girls: ₹{calculateTotal(girlRate)}</Text>

      <View style={{ marginTop: 30 }}>
        <Button
          title={loading ? "Submitting..." : existingRateId ? "Update Rates" : "Submit Rates"}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>

      {existingRateId && (
        <View style={{ marginTop: 10 }}>
          <Button title="Delete Rates" color="red" onPress={handleDelete} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
});

export default MessFeeCalculator;
