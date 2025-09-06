// MessFeeCalculator.tsx
import { API_BASE_URL } from "@/constants/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const num = (v: string | number | undefined | null) => {
  const n = typeof v === "string" ? parseInt(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MessFeeCalculator = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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
  const [saving, setSaving] = useState(false);

  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const monthName = months[selectedMonth - 1];

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

  const est = useMemo(() => ({
    y1: num(estY1), y2: num(estY2), y3: num(estY3), y4: num(estY4)
  }), [estY1, estY2, estY3, estY4]);

  const examples = useMemo(() => ({
    boysVeg: { y1: boysVegFoodTotal + est.y1, y2: boysVegFoodTotal + est.y2, y3: boysVegFoodTotal + est.y3, y4: boysVegFoodTotal + est.y4 },
    boysNonVeg: { y1: boysNonVegFoodTotal + est.y1, y2: boysNonVegFoodTotal + est.y2, y3: boysNonVegFoodTotal + est.y3, y4: boysNonVegFoodTotal + est.y4 },
    girlsVeg: { y1: girlsVegFoodTotal + est.y1, y2: girlsVegFoodTotal + est.y2, y3: girlsVegFoodTotal + est.y3, y4: girlsVegFoodTotal + est.y4 },
    girlsNonVeg: { y1: girlsNonVegFoodTotal + est.y1, y2: girlsNonVegFoodTotal + est.y2, y3: girlsNonVegFoodTotal + est.y3, y4: girlsNonVegFoodTotal + est.y4 },
  }), [boysVegFoodTotal, boysNonVegFoodTotal, girlsVegFoodTotal, girlsNonVegFoodTotal, est]);

  const fetchExistingRate = async () => {
    try {
      setLoading(true);
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
    } catch (e) {
      setExistingRateId(null);
      setBoysVegRate(""); setBoysNonVegRate(""); setGirlsVegRate(""); setGirlsNonVegRate("");
      setEstY1(""); setEstY2(""); setEstY3(""); setEstY4("");
    } finally {
      setLoading(false);
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
      estCharges: { y1: num(estY1), y2: num(estY2), y3: num(estY3), y4: num(estY4) },
    };

    try {
      const token = await AsyncStorage.getItem("adminToken");
      if (!token) throw new Error("No token");

      setSaving(true);
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
      setSaving(false);
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

            await axios.delete(`${API_BASE_URL}/api/adminRates/delete-daily-rate/${existingRateId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            Alert.alert("Deleted", "Rates deleted successfully.");
            setExistingRateId(null);
            setBoysVegRate(""); setBoysNonVegRate(""); setGirlsVegRate(""); setGirlsNonVegRate("");
            setEstY1(""); setEstY2(""); setEstY3(""); setEstY4("");
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading rates...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mess Fee Calculator</Text>
        <Text style={styles.headerSubtitle}>{monthName} {selectedYear} • {daysInMonth} days</Text>
      </View>

      {/* Month & Year */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Month & Year</Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedMonth} onValueChange={(val) => setSelectedMonth(val)} style={styles.picker} dropdownIconColor="#6b7280">
              {months.map((m, i) => <Picker.Item key={i} label={m} value={i + 1} />)}
            </Picker>
          </View>
          <TextInput keyboardType="numeric" style={[styles.input, styles.yearInput]} value={String(selectedYear)} onChangeText={(t) => setSelectedYear(parseInt(t) || now.getFullYear())} />
        </View>
      </View>

      {/* Boys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Boys Hostel (per day)</Text>
        <View style={styles.rateRow}>
          <View style={[styles.rateInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>Veg Rate</Text>
            <TextInput keyboardType="numeric" placeholder="150" style={styles.input} value={boysVegRate} onChangeText={setBoysVegRate} />
          </View>
          <View style={[styles.rateInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>Non-Veg Rate</Text>
            <TextInput keyboardType="numeric" placeholder="170" style={styles.input} value={boysNonVegRate} onChangeText={setBoysNonVegRate} />
          </View>
        </View>

        {/* NEW robust totals block for Boys */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total:</Text>

          <View style={styles.totalValues}>
            <View style={styles.amountColumn}>
              <Text style={styles.totalAmountLabel}>Veg</Text>
              <Text style={styles.totalAmountValue}>₹{boysVegFoodTotal}</Text>
            </View>

            <View style={styles.amountColumn}>
              <Text style={styles.totalAmountLabel}>Non-Veg</Text>
              <Text style={styles.totalAmountValue}>₹{boysNonVegFoodTotal}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Girls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Girls Hostel (per day)</Text>
        <View style={styles.rateRow}>
          <View style={[styles.rateInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>Veg Rate</Text>
            <TextInput keyboardType="numeric" placeholder="120" style={styles.input} value={girlsVegRate} onChangeText={setGirlsVegRate} />
          </View>
          <View style={[styles.rateInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>Non-Veg Rate</Text>
            <TextInput keyboardType="numeric" placeholder="140" style={styles.input} value={girlsNonVegRate} onChangeText={setGirlsNonVegRate} />
          </View>
        </View>

        {/* NEW robust totals block for Girls (uses girls totals) */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total:</Text>

          <View style={styles.totalValues}>
            <View style={styles.amountColumn}>
              <Text style={styles.totalAmountLabel}>Veg</Text>
              <Text style={styles.totalAmountValue}>₹{girlsVegFoodTotal}</Text>
            </View>

            <View style={styles.amountColumn}>
              <Text style={styles.totalAmountLabel}>Non-Veg</Text>
              <Text style={styles.totalAmountValue}>₹{girlsNonVegFoodTotal}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Establishment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Establishment Charges (per month)</Text>
        <View style={styles.estContainer}>
          <View style={[styles.estInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>1st Year</Text>
            <TextInput keyboardType="numeric" placeholder="500" style={styles.input} value={estY1} onChangeText={setEstY1} />
          </View>
          <View style={[styles.estInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>2nd Year</Text>
            <TextInput keyboardType="numeric" placeholder="400" style={styles.input} value={estY2} onChangeText={setEstY2} />
          </View>
          <View style={[styles.estInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>3rd Year</Text>
            <TextInput keyboardType="numeric" placeholder="300" style={styles.input} value={estY3} onChangeText={setEstY3} />
          </View>
          <View style={[styles.estInputContainer, isNarrow && styles.fullWidth]}>
            <Text style={styles.inputLabel}>4th Year</Text>
            <TextInput keyboardType="numeric" placeholder="300" style={styles.input} value={estY4} onChangeText={setEstY4} />
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <>
            <Ionicons name={existingRateId ? "refresh" : "checkmark-circle"} size={20} color="#fff" />
            <Text style={styles.buttonText}>{existingRateId ? "Update Rates" : "Submit Rates"}</Text>
          </>}
        </TouchableOpacity>

        {existingRateId && (
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.buttonText}>Delete Rates</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6b7280" },
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#6b7280" },
  section: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },

  pickerRow: { flexDirection: "row", alignItems: "center" },
  pickerContainer: { flex: 1, minWidth: 140, height: 46, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, backgroundColor: "#fff", justifyContent: "center", overflow: "hidden", marginRight: 12, paddingHorizontal: 6 },
  picker: { height: 56 },

  input: { borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 8, fontSize: 14, backgroundColor: "#fff" },
  yearInput: { flex: 1, textAlign: "center", minWidth: 72 },

  rateRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 12 },
  rateInputContainer: { flexBasis: "48%", marginBottom: 8 },
  fullWidth: { flexBasis: "100%" },
  inputLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },

  // ---- UPDATED totals styles ----
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "space-between",
    minHeight: 72,       // ensure the background covers the content
  },
  totalText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    flex: 0.45,          // label takes ~45% of width
    paddingRight: 8,
  },
  totalValues: {
    flex: 0.55,          // values take ~55% of width
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 160,       // ensure the two columns have room
  },
  amountColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  totalAmountLabel: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 4,
  },
  totalAmountValue: {
    fontSize: 16,
    color: "#059669",
    fontWeight: "700",
  },

  estContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  estInputContainer: { flexBasis: "48%", marginBottom: 8 },

  exampleContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  exampleCategory: { flexBasis: "48%", minWidth: 150, padding: 12, backgroundColor: "#f0f9ff", borderRadius: 8, borderWidth: 1, borderColor: "#e0f2fe", marginBottom: 8 },
  exampleCategoryTitle: { fontSize: 14, fontWeight: "600", color: "#0369a1", marginBottom: 6 },
  exampleAmount: { fontSize: 12, color: "#0c4a6e", marginBottom: 2 },

  buttonContainer: { marginTop: 8 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 8, gap: 8, marginBottom: 12 },
  submitButton: { backgroundColor: "#6366f1" },
  deleteButton: { backgroundColor: "#ef4444" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default MessFeeCalculator;
