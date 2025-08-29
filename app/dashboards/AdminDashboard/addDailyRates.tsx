import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const API_BASE = "http://192.168.29.83:5000";

const num = (v: string | number | undefined | null) => {
  const n = typeof v === "string" ? parseInt(v) : Number(v);
  return isNaN(n) ? 0 : n;
};

const MessFeeCalculator = () => {
  // NEW: split rates by Veg/Non-Veg and by gender
  const [boysVegRate, setBoysVegRate] = useState("");
  const [boysNonVegRate, setBoysNonVegRate] = useState("");
  const [girlsVegRate, setGirlsVegRate] = useState("");
  const [girlsNonVegRate, setGirlsNonVegRate] = useState("");

  // NEW: establishment charges year-wise (per month)
  const [estY1, setEstY1] = useState("");
  const [estY2, setEstY2] = useState("");
  const [estY3, setEstY3] = useState("");
  const [estY4, setEstY4] = useState("");

  const [existingRateId, setExistingRateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = now.toLocaleString("default", { month: "long" });

  // Backward compatible totals
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

  // Quick examples (combined = food total + establishment charge for that year)
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
      // Boys
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
      // Girls
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
      const url = `${API_BASE}/api/adminRates/rate?month=${month}&year=${year}`;
      const res = await axios.get(url);
      const rate = res.data || {};

      // Backward compatibility: if only boysRate/girlsRate exist, map to Veg and leave Non-Veg empty for admin to fill
      const _boysVeg = rate.boysVegRate ?? rate.boys_rate_veg ?? rate.boysRate ?? "";
      const _boysNonVeg =
        rate.boysNonVegRate ?? rate.boys_rate_nonveg ?? rate.boysNonVeg ?? "";
      const _girlsVeg = rate.girlsVegRate ?? rate.girls_rate_veg ?? rate.girlsRate ?? "";
      const _girlsNonVeg =
        rate.girlsNonVegRate ?? rate.girls_rate_nonveg ?? rate.girlsNonVeg ?? "";

      setBoysVegRate(String(_boysVeg ?? ""));
      setBoysNonVegRate(String(_boysNonVeg ?? ""));
      setGirlsVegRate(String(_girlsVeg ?? ""));
      setGirlsNonVegRate(String(_girlsNonVeg ?? ""));

      const ec = rate.estCharges || rate.establishmentCharges || {};
      setEstY1(String(ec.y1 ?? ec.year1 ?? ""));
      setEstY2(String(ec.y2 ?? ec.year2 ?? ""));
      setEstY3(String(ec.y3 ?? ec.year3 ?? ""));
      setEstY4(String(ec.y4 ?? ec.year4 ?? ""));

      setExistingRateId(rate._id ?? null);
    } catch (err) {
      // Not set yet or error
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
    // Validate required daily rates (you can relax this if you want partial)
    const hasAnyRate =
      boysVegRate || boysNonVegRate || girlsVegRate || girlsNonVegRate;
    if (!hasAnyRate) {
      Alert.alert("Validation", "Enter at least one daily rate.");
      return;
    }

    const payload = {
      month,
      year,
      // NEW fields expected by backend
      boysVegRate: num(boysVegRate),
      boysNonVegRate: num(boysNonVegRate),
      girlsVegRate: num(girlsVegRate),
      girlsNonVegRate: num(girlsNonVegRate),

      // Keep your old totals if backend still uses them (backward compatible)
      // We'll set boysTotal/girlsTotal as Veg totals if only one category is used.
      boysTotal:
        (boysVegRate ? boysVegFoodTotal : 0) ||
        (boysNonVegRate ? boysNonVegFoodTotal : 0),
      girlsTotal:
        (girlsVegRate ? girlsVegFoodTotal : 0) ||
        (girlsNonVegRate ? girlsNonVegFoodTotal : 0),

      // NEW: establishment charges by academic year (monthly)
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
        ? `${API_BASE}/api/adminRates/update-daily-rate/${existingRateId}`
        : `${API_BASE}/api/adminRates/set-daily-rate`;
      const method = existingRateId ? "put" : "post";

      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", existingRateId ? "Rates updated!" : "Rates submitted!");
      fetchExistingRate(); // refresh
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Error submitting rates";
      Alert.alert("Error", msg);
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
              `${API_BASE}/api/adminRates/delete-daily-rate/${existingRateId}`,
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
            const msg = err?.response?.data?.message || err.message || "Error deleting rate";
            Alert.alert("Error", msg);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchExistingRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Mess Fee — {monthName} {year}</Text>
      <Text style={styles.subtle}>Days in month: {daysInMonth}</Text>

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
      <Text style={styles.totalLine}>Monthly Food Total (Veg): ₹{boysVegFoodTotal}</Text>
      <Text style={styles.totalLine}>Monthly Food Total (Non-Veg): ₹{boysNonVegFoodTotal}</Text>

      {/* Girls */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Girls Hostel (per day)</Text>
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
      <Text style={styles.totalLine}>Monthly Food Total (Veg): ₹{girlsVegFoodTotal}</Text>
      <Text style={styles.totalLine}>Monthly Food Total (Non-Veg): ₹{girlsNonVegFoodTotal}</Text>

      {/* Establishment Charges */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Establishment Charges (per month)</Text>
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

      {/* Example combined totals box */}
      <View style={styles.exampleBox}>
        <Text style={styles.exampleTitle}>Examples — Combined Monthly Totals</Text>
        <Text style={styles.exampleLine}>Boys Veg:    Y1 ₹{examples.boysVeg.y1} | Y2 ₹{examples.boysVeg.y2} | Y3 ₹{examples.boysVeg.y3} | Y4 ₹{examples.boysVeg.y4}</Text>
        <Text style={styles.exampleLine}>Boys Non-Veg:Y1 ₹{examples.boysNonVeg.y1} | Y2 ₹{examples.boysNonVeg.y2} | Y3 ₹{examples.boysNonVeg.y3} | Y4 ₹{examples.boysNonVeg.y4}</Text>
        <Text style={styles.exampleLine}>Girls Veg:   Y1 ₹{examples.girlsVeg.y1} | Y2 ₹{examples.girlsVeg.y2} | Y3 ₹{examples.girlsVeg.y3} | Y4 ₹{examples.girlsVeg.y4}</Text>
        <Text style={styles.exampleLine}>Girls Non-Veg:Y1 ₹{examples.girlsNonVeg.y1} | Y2 ₹{examples.girlsNonVeg.y2} | Y3 ₹{examples.girlsNonVeg.y3} | Y4 ₹{examples.girlsNonVeg.y4}</Text>
      </View>

      <View style={{ marginTop: 24 }}>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: { fontWeight: "bold", fontSize: 18, marginBottom: 4 },
  subtle: { color: "#666", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 10,
    marginVertical: 6,
    borderRadius: 5,
  },
  sectionTitle: { fontWeight: "bold", fontSize: 16, marginTop: 8, marginBottom: 8 },
  totalLine: { marginTop: 2, marginBottom: 2, fontWeight: "600" },
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
});

export default MessFeeCalculator;
