import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const num = (v: string | number | undefined | null) => {
  const n = typeof v === "string" ? parseInt(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MessFeeCalculator = () => {
  // Manual month/year selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1–12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Rates
  const [boysVegRate, setBoysVegRate] = useState("");
  const [boysNonVegRate, setBoysNonVegRate] = useState("");
  const [girlsVegRate, setGirlsVegRate] = useState("");
  const [girlsNonVegRate, setGirlsNonVegRate] = useState("");

  const [estY1, setEstY1] = useState("");
  const [estY2, setEstY2] = useState("");
  const [estY3, setEstY3] = useState("");
  const [estY4, setEstY4] = useState("");

  const [existingRateId, setExistingRateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const monthName = months[selectedMonth - 1];

  // Totals
  const boysVegFoodTotal = useMemo(
    () => num(boysVegRate) * daysInMonth,
    [boysVegRate, daysInMonth]
  );
  const boysNonVegFoodTotal = useMemo(
    () => num(boysNonVegRate) * daysInMonth,
    [boysNonVegRate, daysInMonth]
  );
  const girlsVegFoodTotal = useMemo(
    () => num(girlsVegRate) * daysInMonth,
    [girlsVegRate, daysInMonth]
  );
  const girlsNonVegFoodTotal = useMemo(
    () => num(girlsNonVegRate) * daysInMonth,
    [girlsNonVegRate, daysInMonth]
  );

  const est = useMemo(
    () => ({
      y1: num(estY1),
      y2: num(estY2),
      y3: num(estY3),
      y4: num(estY4),
    }),
    [estY1, estY2, estY3, estY4]
  );

  const examples = useMemo(
    () => ({
      boysVeg: {
        y1: boysVegFoodTotal + est.y1,
        y2: boysVegFoodTotal + est.y2,
        y3: boysVegFoodTotal + est.y3,
        y4: boysVegFoodTotal + est.y4,
      },
      boysNonVeg: {
        y1: boysNonVegFoodTotal + est.y1,
        y2: boysNonVegFoodTotal + est.y2,
        y3: boysNonVegFoodTotal + est.y3,
        y4: boysNonVegFoodTotal + est.y4,
      },
      girlsVeg: {
        y1: girlsVegFoodTotal + est.y1,
        y2: girlsVegFoodTotal + est.y2,
        y3: girlsVegFoodTotal + est.y3,
        y4: girlsVegFoodTotal + est.y4,
      },
      girlsNonVeg: {
        y1: girlsNonVegFoodTotal + est.y1,
        y2: girlsNonVegFoodTotal + est.y2,
        y3: girlsNonVegFoodTotal + est.y3,
        y4: girlsNonVegFoodTotal + est.y4,
      },
    }),
    [
      boysVegFoodTotal,
      boysNonVegFoodTotal,
      girlsVegFoodTotal,
      girlsNonVegFoodTotal,
      est,
    ]
  );

  const fetchExistingRate = async () => {
    try {
      const url = `${API_BASE_URL}/api/adminRates/rate?month=${selectedMonth}&year=${selectedYear}`;
      const res = await axios.get(url);
      const rate = res.data || {};

      setBoysVegRate(String(rate.boysVegRate ?? ""));
      setBoysNonVegRate(String(rate.boysNonVegRate ?? ""));
      setGirlsVegRate(String(rate.girlsVegRate ?? ""));
      setGirlsNonVegRate(String(rate.girlsNonVegRate ?? ""));

      const ec = rate.estCharges || {};
      setEstY1(String(ec.y1 ?? ""));
      setEstY2(String(ec.y2 ?? ""));
      setEstY3(String(ec.y3 ?? ""));
      setEstY4(String(ec.y4 ?? ""));

      setExistingRateId(rate._id ?? null);
    } catch {
      setExistingRateId(null);
      setBoysVegRate("");
      setBoysNonVegRate("");
      setGirlsVegRate("");
      setGirlsNonVegRate("");
      setEstY1("");
      setEstY2("");
      setEstY3("");
      setEstY4("");
    }
  };

  const handleSubmit = async () => {
    const payload = {
      month: selectedMonth,
      year: selectedYear,
      boysVegRate: num(boysVegRate),
      boysNonVegRate: num(boysNonVegRate),
      girlsVegRate: num(girlsVegRate),
      girlsNonVegRate: num(girlsNonVegRate),
      estCharges: {
        y1: num(estY1),
        y2: num(estY2),
        y3: num(estY3),
        y4: num(estY4),
      },
    };

    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) throw new Error("No token");

      setLoading(true);
      const url = existingRateId
        ? `${API_BASE_URL}/api/adminRates/update-daily-rate/${existingRateId}`
        : `${API_BASE_URL}/api/adminRates/set-daily-rate`;
      const method = existingRateId ? "put" : "post";

      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", existingRateId ? "Rates updated!" : "Rates submitted!");
      fetchExistingRate();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRateId) return;
    Alert.alert("Confirm", "Delete this month's rates?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("adminToken");
            if (!token) throw new Error("No token");

            await axios.delete(
              `${API_BASE_URL}/api/adminRates/delete-daily-rate/${existingRateId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            Alert.alert("Deleted", "Rates deleted successfully.");
            setExistingRateId(null);
            setBoysVegRate("");
            setBoysNonVegRate("");
            setGirlsVegRate("");
            setGirlsNonVegRate("");
            setEstY1("");
            setEstY2("");
            setEstY3("");
            setEstY4("");
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || err.message);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchExistingRate();
  }, [selectedMonth, selectedYear]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Mess Fee — {monthName} {selectedYear}</Text>
      <Text style={styles.subtle}>Days in month: {daysInMonth}</Text>

      {/* Month & Year Picker */}
      <Text style={styles.sectionTitle}>Select Month & Year</Text>
      <Picker
        selectedValue={selectedMonth}
        onValueChange={(val) => setSelectedMonth(val)}
        style={styles.picker}
      >
        {months.map((m, i) => (
          <Picker.Item key={i} label={m} value={i + 1} />
        ))}
      </Picker>
      <TextInput
        keyboardType="numeric"
        style={styles.input}
        value={String(selectedYear)}
        onChangeText={(t) => setSelectedYear(parseInt(t) || now.getFullYear())}
      />

      {/* Boys */}
      <Text style={styles.sectionTitle}>Boys Hostel (per day)</Text>
      <Text>Veg Rate</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 150"
        style={styles.input}
        value={boysVegRate}
        onChangeText={setBoysVegRate}
      />
      <Text>Non-Veg Rate</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 170"
        style={styles.input}
        value={boysNonVegRate}
        onChangeText={setBoysNonVegRate}
      />
      <Text style={styles.totalLine}>
        Monthly Food Total (Veg): ₹{boysVegFoodTotal}
      </Text>
      <Text style={styles.totalLine}>
        Monthly Food Total (Non-Veg): ₹{boysNonVegFoodTotal}
      </Text>

      {/* Girls */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Girls Hostel (per day)
      </Text>
      <Text>Veg Rate</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 120"
        style={styles.input}
        value={girlsVegRate}
        onChangeText={setGirlsVegRate}
      />
      <Text>Non-Veg Rate</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 140"
        style={styles.input}
        value={girlsNonVegRate}
        onChangeText={setGirlsNonVegRate}
      />
      <Text style={styles.totalLine}>
        Monthly Food Total (Veg): ₹{girlsVegFoodTotal}
      </Text>
      <Text style={styles.totalLine}>
        Monthly Food Total (Non-Veg): ₹{girlsNonVegFoodTotal}
      </Text>

      {/* Establishment */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Establishment Charges (per month)
      </Text>
      <Text>1st Year</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 500"
        style={styles.input}
        value={estY1}
        onChangeText={setEstY1}
      />
      <Text>2nd Year</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 400"
        style={styles.input}
        value={estY2}
        onChangeText={setEstY2}
      />
      <Text>3rd Year</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 300"
        style={styles.input}
        value={estY3}
        onChangeText={setEstY3}
      />
      <Text>4th Year</Text>
      <TextInput
        keyboardType="numeric"
        placeholder="e.g. 300"
        style={styles.input}
        value={estY4}
        onChangeText={setEstY4}
      />

      {/* Examples */}
      <View style={styles.exampleBox}>
        <Text style={styles.exampleTitle}>
          Examples — Combined Monthly Totals
        </Text>
        <Text style={styles.exampleLine}>
          Boys Veg: Y1 ₹{examples.boysVeg.y1} | Y2 ₹{examples.boysVeg.y2} | Y3 ₹
          {examples.boysVeg.y3} | Y4 ₹{examples.boysVeg.y4}
        </Text>
        <Text style={styles.exampleLine}>
          Boys Non-Veg: Y1 ₹{examples.boysNonVeg.y1} | Y2 ₹
          {examples.boysNonVeg.y2} | Y3 ₹{examples.boysNonVeg.y3} | Y4 ₹
          {examples.boysNonVeg.y4}
        </Text>
        <Text style={styles.exampleLine}>
          Girls Veg: Y1 ₹{examples.girlsVeg.y1} | Y2 ₹{examples.girlsVeg.y2} | Y3
          ₹{examples.girlsVeg.y3} | Y4 ₹{examples.girlsVeg.y4}
        </Text>
        <Text style={styles.exampleLine}>
          Girls Non-Veg: Y1 ₹{examples.girlsNonVeg.y1} | Y2 ₹
          {examples.girlsNonVeg.y2} | Y3 ₹{examples.girlsNonVeg.y3} | Y4 ₹
          {examples.girlsNonVeg.y4}
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#2196f3", marginTop: 20 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading
            ? "Submitting..."
            : existingRateId
            ? "Update Rates"
            : "Submit Rates"}
        </Text>
      </TouchableOpacity>

      {existingRateId && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "red", marginTop: 12, marginBottom: 40 }]}
          onPress={handleDelete}
        >
          <Text style={styles.btnText}>Delete Rates</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 80 },
  heading: { fontWeight: "bold", fontSize: 18, marginBottom: 4 },
  subtle: { color: "#666", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 10,
    marginVertical: 6,
    borderRadius: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#aaa",
    marginVertical: 6,
    borderRadius: 5,
  },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginTop: 8, marginBottom: 8 },
  totalLine: { marginVertical: 2, fontWeight: "600" },
  exampleBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f7f9ff",
    borderRadius: 8,
    borderColor: "#dfe7ff",
    borderWidth: 1,
  },
  exampleTitle: { fontWeight: "bold", marginBottom: 6 },
  exampleLine: { marginBottom: 2 },
  btn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default MessFeeCalculator;
