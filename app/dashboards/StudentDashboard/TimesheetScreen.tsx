import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

type MarkedDateProps = {
  customStyles: {
    container?: object;
    text?: object;
  };
};

const TimesheetScreen = () => {
  const [markedDates, setMarkedDates] = useState<
    Record<string, MarkedDateProps>
  >({});
  const [modalVisible, setModalVisible] = useState(false);
  const [amountDetails, setAmountDetails] = useState({
    presentDays: 0,
    dailyRate: 0,
    total: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTimesheetAndRates(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const fetchTimesheetAndRates = async (month: number, year: number) => {
  try {
    // Reset amount details and calendar
    setAmountDetails({ presentDays: 0, dailyRate: 0, total: 0 });
    setMarkedDates({});

    const rollNo = await AsyncStorage.getItem("rollNo");
    let gender = await AsyncStorage.getItem("gender");

    if (!rollNo || !gender) {
      console.warn("Missing roll number or gender.");
      return;
    }

    gender = gender.trim().toLowerCase(); // Normalize gender string

    const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based

    // Fetch timesheet
    const timesheetRes = await axios.get(
      `http://192.168.29.83:5000/api/timesheetRoutes/${rollNo}`
    );

    const { absentDates = [], presentDates = [] } = timesheetRes.data;

    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const filteredPresent = presentDates.filter((date: string) =>
      date.startsWith(monthPrefix)
    );
    const filteredAbsent = absentDates.filter((date: string) =>
      date.startsWith(monthPrefix)
    );

    const marked: Record<string, MarkedDateProps> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (filteredPresent.includes(dateStr)) {
        marked[dateStr] = {
          customStyles: {
            container: { backgroundColor: "#00c853", borderRadius: 100 },
            text: { color: "white", fontWeight: "bold" },
          },
        };
      } else if (filteredAbsent.includes(dateStr)) {
        marked[dateStr] = {
          customStyles: {
            container: { backgroundColor: "#d32f2f", borderRadius: 100 },
            text: { color: "white", fontWeight: "bold" },
          },
        };
      } else {
        marked[dateStr] = {
          customStyles: {
            container: {
              backgroundColor: "#ccc",
              opacity: 0.5,
              borderRadius: 100,
            },
            text: { color: "#888" },
          },
        };
      }
    }

    setMarkedDates(marked);

    // Fetch daily rate for the month/year
    let perDayRate = 0;
    try {
      const rateRes = await axios.get(
        `http://192.168.29.83:5000/api/adminRates/rate?month=${month}&year=${year}`
      );
      perDayRate = gender === "male" ? rateRes.data.boysRate : rateRes.data.girlsRate;
    } catch (rateErr: any) {
      if (rateErr.response?.status === 404) {
        console.warn("Rate not set for selected month/year.");
      } else {
        console.error("Error fetching rate:", rateErr);
      }
      // If not found, fallback to 0 rate
      perDayRate = 0;
    }

    const presentDaysCount = filteredPresent.length;
    const totalAmount = presentDaysCount * perDayRate;

    setAmountDetails({
      presentDays: presentDaysCount,
      dailyRate: perDayRate,
      total: totalAmount,
    });

  } catch (err) {
    console.error("Failed to fetch timesheet or rate:", err);
    setAmountDetails({ presentDays: 0, dailyRate: 0, total: 0 });
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timesheet Calendar</Text>
      <Calendar
        markingType="custom"
        markedDates={markedDates}
        theme={{
          todayTextColor: "#00C853",
          arrowColor: "#00C853",
        }}
        onMonthChange={(month) => {
          setSelectedMonth(month.month); // 1-12
          setSelectedYear(month.year);
        }}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Current Pay Period</Text>
        <Text style={styles.summaryDate}>
          Marked Dates: {Object.keys(markedDates).length}
        </Text>

        <View style={styles.summaryRow}>
          <Text>Current Month Amount</Text>
          <Text style={styles.hours}>₹{amountDetails.total}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Days Present</Text>
          <Text>{amountDetails.presentDays} days</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Per Day Rate</Text>
          <Text>₹{amountDetails.dailyRate}</Text>
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Payment Confirmation</Text>
            <Text>Total Amount: ₹{amountDetails.total}</Text>
            <Text>Proceed to Payment?</Text>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalPayButton}
              >
                <Text style={{ color: "#fff" }}>Pay</Text>
              </Pressable>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCancelButton}
              >
                <Text style={{ color: "#333" }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f9ff", padding: 6 },
  title: {
    fontSize: 20,
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#2196f3",
    paddingVertical: 10,
    fontWeight: "bold",
  },
  summary: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  hours: {
    fontWeight: "bold",
    color: "#00C853",
  },
  payButton: {
    marginTop: 20,
    backgroundColor: "#00C853",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalPayButton: {
    backgroundColor: "#00C853",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalCancelButton: {
    backgroundColor: "#ddd",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
});

export default TimesheetScreen;
