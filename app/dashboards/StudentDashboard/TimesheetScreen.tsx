import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { WebView } from "react-native-webview";

//const API_BASE = "https://api.sjtechsol.com";

type MarkedDateProps = {
  customStyles: {
    container?: object;
    text?: object;
  };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

// Normalize to YYYY-MM-DD regardless of 2025-7-1, 01/07/2025, ISO, etc.
const normalizeDate = (input: string) => {
  if (!input) return input as any;
  const m = String(input).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  const dt = new Date(input);
  if (!isNaN(dt.getTime())) {
    dt.setUTCHours(12, 0, 0, 0);
    return dt.toISOString().slice(0, 10);
  }
  return String(input);
};

// extract date arrays from many shapes
const coerceDateStrings = (val: any, wantStatus?: string): string[] => {
  if (!val) return [];
  if (Array.isArray(val) && val.every((x) => typeof x === "string")) {
    return val.map((d) => normalizeDate(d));
  }
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
    const arr = val as Array<Record<string, any>>;
    const maybeStatus = wantStatus?.toLowerCase();
    return arr
      .filter((it) =>
        maybeStatus
          ? String(it.status || it.type || "").toLowerCase() === maybeStatus
          : true
      )
      .map((it) =>
        normalizeDate(
          it.date || it.day || it.d || it.when || it.ts || it.createdAt
        )
      )
      .filter(Boolean) as string[];
  }
  if (typeof val === "object") {
    return Object.keys(val)
      .filter((k) => {
        if (!wantStatus) return true;
        const v = (val as any)[k];
        const st = String((v && (v.status || v.type)) || "").toLowerCase();
        return st === wantStatus.toLowerCase();
      })
      .map(normalizeDate);
  }
  return [];
};

// Extended rate extractor: reads veg/nonveg + estCharges; falls back to boysRate/girlsRate
const extractExtendedRates = (raw: any) => {
  const base =
    raw?.rate ?? raw?.data ?? (Array.isArray(raw) ? raw[0] : raw) ?? raw ?? {};
  const boysVegRate = Number(base.boysVegRate ?? 0);
  const boysNonVegRate = Number(base.boysNonVegRate ?? 0);
  const girlsVegRate = Number(base.girlsVegRate ?? 0);
  const girlsNonVegRate = Number(base.girlsNonVegRate ?? 0);

  // Backward-compat fallback: if only boysRate/girlsRate exist, map them as Veg
  const _boysRate = Number(base.boysRate ?? 0);
  const _girlsRate = Number(base.girlsRate ?? 0);

  return {
    boysVegRate: boysVegRate || _boysRate || 0,
    boysNonVegRate: boysNonVegRate || 0,
    girlsVegRate: girlsVegRate || _girlsRate || 0,
    girlsNonVegRate: girlsNonVegRate || 0,
    estCharges: {
      y1: Number(base.estCharges?.y1 ?? 0),
      y2: Number(base.estCharges?.y2 ?? 0),
      y3: Number(base.estCharges?.y3 ?? 0),
      y4: Number(base.estCharges?.y4 ?? 0),
    },
  };
};

const isMaleGender = (g: string | null) => {
  const s = (g || "").trim().toLowerCase();
  return (
    s === "male" || s === "m" || s === "boy" || s === "boys" || s === "man"
  );
};

// Robust diet normalizer
const normDiet = (t: string | null): "veg" | "non-veg" => {
  const s = (t || "").trim().toLowerCase();
  // matches: "non-veg", "non veg", "nonveg", "nv", "non"
  if (/^nv$/.test(s)) return "non-veg";
  if (/(^|[^a-z])non($|[^a-z])/.test(s)) return "non-veg";
  if (/non[\s-]?veg/.test(s)) return "non-veg";
  return "veg";
};

// Robust year → y1..y4
const pickYearKey = (yearText: string | null) => {
  const digit = (yearText || "").replace(/\D/g, ""); // keep only digits
  if (digit === "1") return "y1";
  if (digit === "2") return "y2";
  if (digit === "3") return "y3";
  return "y4";
};

type PayKind = "mess" | "establishment";

const TimesheetScreen = () => {
  const [markedDates, setMarkedDates] = useState<
    Record<string, MarkedDateProps>
  >({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [presentDays, setPresentDays] = useState(0);
  const [messRatePerDay, setMessRatePerDay] = useState(0);
  const [messAmount, setMessAmount] = useState(0);
  const [establishmentAmount, setEstablishmentAmount] = useState(0);

  // separate toggles if you want different availability windows later
  const [canPayMess, setCanPayMess] = useState(false);
  const [canPayEst, setCanPayEst] = useState(false);

  // student info
  const [studentGender, setStudentGender] = useState<string | null>(null);
  const [studentDiet, setStudentDiet] = useState<string | null>(null); // "veg" | "non-veg"
  const [studentYear, setStudentYear] = useState<string | null>(null); // "1st Year" etc
  const [rollNo, setRollNo] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [payKind, setPayKind] = useState<PayKind>("mess");

  // debug
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [messOverdue, setMessOverdue] = useState(0);
  const [estOverdue, setEstOverdue] = useState(0);
  const [payAmount, setPayAmount] = useState("");
  const [webviewHtml, setWebviewHtml] = useState<string | null>(null);

  console.log("messOverdue", messOverdue, estOverdue);

  useEffect(() => {
    if (!rollNo) return;
    (async () => {
      try {
        const messRes = await axios.get(
          `${API_BASE_URL}/api/mess/dues/${rollNo}`
        );
        console.log("messRes.data", messRes.data);
        setMessOverdue(messRes.data?.overdue || 0); // FIXED
        // keep for UI
        setDebugInfo((prev: any) => ({
          ...prev,
          messPaid: messRes.data?.paid || 0,
        }));

        const estRes = await axios.get(
          `${API_BASE_URL}/api/establishment/dues/${rollNo}`
        );
        console.log("estRes", estRes.data);
        setEstOverdue(estRes.data?.overdue || 0); // FIXED
        setDebugInfo((prev: any) => ({
          ...prev,
          estPaid: estRes.data?.paid || 0,
        }));
      } catch (err) {
        console.error("Overdue fetch failed", err);
      }
    })();
  }, [rollNo]);

  // Load identity basics
  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem("rollNo");
      const g = await AsyncStorage.getItem("gender");
      const t = await AsyncStorage.getItem("type"); // "veg" | "non-veg" | "NV" etc.
      const y = await AsyncStorage.getItem("year"); // "1st Year", etc.

      setRollNo(r);
      if (g) setStudentGender(g);
      if (t) setStudentDiet(normDiet(t));
      if (y) setStudentYear(y);

      // if diet/year/gender missing, try to fetch from backend student profile
      if (r && (!t || !y || !g)) {
        try {
          const resp = await axios.get(`${API_BASE_URL}/api/students/${r}`);
          const s = resp.data || {};
          if (!t && s?.type) setStudentDiet(normDiet(String(s.type)));
          if (!y && s?.year) setStudentYear(String(s.year));
          if (!g && s?.gender) setStudentGender(String(s.gender));
        } catch (e) {
          console.warn("profile fetch fail", (e as any)?.message);
        }
      }
    })();
  }, []);

  // Compute bills once we know month/year + student attributes
  useEffect(() => {
    if (!rollNo) return;
    if (!studentGender || !studentYear || !studentDiet) return; // wait until all are ready

    fetchTimesheetAndRates(
      selectedMonth,
      selectedYear,
      studentGender,
      studentDiet,
      studentYear
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMonth,
    selectedYear,
    rollNo,
    studentGender,
    studentDiet,
    studentYear,
  ]);

  // month: 1..12 (human), JS Date month is 0..11
  const fetchTimesheetAndRates = async (
    month: number,
    year: number,
    genderArg: string,
    dietArg: string | null,
    yearTextArg: string | null
  ) => {
    try {
      // Reset states
      setMessRatePerDay(0);
      setMessAmount(0);
      setPresentDays(0);
      setMarkedDates({});
      setEstablishmentAmount(0);
      setMessOverdue(0);
      setEstOverdue(0);

      if (!rollNo) return;

      const daysInMonth = new Date(year, month, 0).getDate();
      const monthPrefix = `${year}-${pad2(month)}`;

      // ---- attendance ----
      const timesheetRes = await axios.get(
        `${API_BASE_URL}/api/timesheetRoutes/${rollNo}`
      );
      const tData = timesheetRes.data || {};

      const present = coerceDateStrings(tData.presentDates);
      const absent = coerceDateStrings(tData.absentDates);
      const approved = coerceDateStrings(tData.approvedLeaveDates);

      const fPresent = present.filter((d) => d && d.startsWith(monthPrefix));
      const fAbsent = absent.filter((d) => d && d.startsWith(monthPrefix));
      const fApproved = approved.filter((d) => d && d.startsWith(monthPrefix));

      const style = {
        present: {
          container: { backgroundColor: "#00c853", borderRadius: 100 },
          text: { color: "white", fontWeight: "bold" },
        },
        absent: {
          container: { backgroundColor: "#d32f2f", borderRadius: 100 },
          text: { color: "white", fontWeight: "bold" },
        },
        leave: {
          container: { backgroundColor: "#ff9800", borderRadius: 100 },
          text: { color: "white", fontWeight: "bold" },
        },
        empty: {
          container: {
            backgroundColor: "#ccc",
            opacity: 0.5,
            borderRadius: 100,
          },
          text: { color: "#888" },
        },
      } as const;

      const marked: Record<string, MarkedDateProps> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
        if (fPresent.includes(dateStr))
          marked[dateStr] = { customStyles: style.present };
        else if (fApproved.includes(dateStr))
          marked[dateStr] = { customStyles: style.leave };
        else if (fAbsent.includes(dateStr))
          marked[dateStr] = { customStyles: style.absent };
        else marked[dateStr] = { customStyles: style.empty };
      }
      setMarkedDates(marked);

      // ---- rates ----
      let ratesData: any = null;
      const tryUrls = [
        `${API_BASE_URL}/api/adminRates/rate?month=${month}&year=${year}`,
        `${API_BASE_URL}/api/adminRates/rate?month=${String(month).padStart(
          2,
          "0"
        )}&year=${year}`,
      ];
      for (const url of tryUrls) {
        try {
          const resp = await axios.get(url);
          ratesData = resp.data;
          break;
        } catch (e: any) {
          if (e?.response?.status !== 404) {
            console.error("Rate fetch error", url, e?.message);
          }
        }
      }

      const rates = extractExtendedRates(ratesData || {});
      const gender = genderArg;
      const diet = normDiet(dietArg);
      const isMale = isMaleGender(gender);

      let perDay = 0;
      if (isMale) {
        perDay = diet === "non-veg" ? rates.boysNonVegRate : rates.boysVegRate;
      } else {
        perDay =
          diet === "non-veg" ? rates.girlsNonVegRate : rates.girlsVegRate;
      }

      const presentDaysCount = fPresent.length;
      const mess = presentDaysCount * (perDay || 0);

      const yrKey = pickYearKey(yearTextArg);
      const estAmount = Number(rates.estCharges?.[yrKey] ?? 0);

      // Save current month info (just display)
      setPresentDays(presentDaysCount);
      setMessRatePerDay(perDay || 0);
      setMessAmount(mess);
      setEstablishmentAmount(estAmount);

      // ---- fetch dues from backend (truth source) ----
      const [messRes, estRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/mess/dues/${rollNo}`),
        axios.get(`${API_BASE_URL}/api/establishment/dues/${rollNo}`),
      ]);

      const backendMessOverdue = messRes.data?.overdue || 0;
      const backendMessPaid = messRes.data?.paid || 0;
      const backendEstOverdue = estRes.data?.overdue || 0;
      const backendEstPaid = estRes.data?.paid || 0;

      // ✅ Use backend directly, don’t add bills again
      setMessOverdue(backendMessOverdue);
      setEstOverdue(backendEstOverdue);

      // Enable pay buttons only for current month
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      setCanPayMess(
        year === currentYear && month === currentMonth && backendMessOverdue > 0
      );
      setCanPayEst(
        year === currentYear && month === currentMonth && backendEstOverdue > 0
      );

      setDebugInfo({
        month,
        year,
        gender,
        diet,
        studentYear: yearTextArg,
        perDay,
        presentDaysCount,
        estCharges: rates.estCharges,
        usedYearKey: yrKey,
        messOverdue: backendMessOverdue,
        messPaid: backendMessPaid,
        estOverdue: backendEstOverdue,
        estPaid: backendEstPaid,
      });
    } catch (err) {
      console.error("Failed to fetch timesheet/rates:", err);
      setMessRatePerDay(0);
      setMessAmount(0);
      setPresentDays(0);
      setEstablishmentAmount(0);
      setMessOverdue(0);
      setEstOverdue(0);
    }
  };

  // generic UPI opener + record
  const pay = async (kind: PayKind) => {
    try {
      if (!rollNo) return;

      // fetch admin UPI
      const upiRes = await axios.get(
        `${API_BASE_URL}/api/timesheetRoutes/admin-upi`
      );
      const { upiId, name } = upiRes.data || {};
      if (!upiId || !name) {
        alert("UPI details not available. Please contact admin.");
        return;
      }

      const amount = kind === "mess" ? messOverdue : estOverdue;

      if (!amount || amount <= 0) {
        alert("Amount is zero or invalid.");
        return;
      }

      const txnNote = `${
        kind === "mess" ? "Mess" : "Establishment"
      } for ${selectedMonth}-${selectedYear}`;
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        name
      )}&tn=${encodeURIComponent(txnNote)}&am=${amount}&cu=INR`;

      const supported = await Linking.canOpenURL(upiUrl);
      if (!supported) {
        alert("No UPI-compatible app found on your device.");
        return;
      }

      await Linking.openURL(upiUrl);

      // record payment
      const payload: any = {
        rollNo,
        month: selectedMonth,
        year: selectedYear,
        amount,
        feeType: kind, // "mess" | "establishment"
        paymentMethod: "UPI",
      };
      if (kind === "mess") {
        payload.days = presentDays;
        payload.perDayRate = messRatePerDay;
        payload.diet = normDiet(studentDiet);
        payload.gender = studentGender;
      } else {
        payload.yearKey = pickYearKey(studentYear);
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/timesheetRoutes/payment`,
        payload
      );
      if (res.data?.success) {
        alert(
          `${
            kind === "mess" ? "Mess" : "Establishment"
          } payment recorded successfully!`
        );
      } else {
        alert("Payment failed to record.");
      }

      setModalVisible(false);
    } catch (err) {
      console.error("UPI Payment error:", err);
      alert("Payment failed. Try again.");
      setModalVisible(false);
    }
  };

  const openPayModal = (kind: PayKind) => {
    setPayKind(kind);
    setModalVisible(true);
  };

  const ready = Boolean(rollNo && studentGender && studentYear && studentDiet);

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 8,
        }}
      >
        {[
          { label: "Present", bg: "#00c853" },
          { label: "Absent", bg: "#d32f2f" },
          { label: "Approved Leave", bg: "#ff9800" },
        ].map((it) => (
          <View
            key={it.label}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: it.bg,
              }}
            />
            <Text>{it.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.title}>Timesheet Calendar</Text>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Calendar
          enableSwipeMonths
          hideExtraDays
          markingType="custom"
          markedDates={markedDates}
          theme={{ todayTextColor: "#00C853", arrowColor: "#00C853" }}
          onMonthChange={(month) => {
            setSelectedMonth(month.month); // 1-12
            setSelectedYear(month.year);
          }}
        />

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            Current Period: {pad2(selectedMonth)}/{selectedYear}
          </Text>

          {!ready && (
            <Text style={{ color: "#444", marginBottom: 8 }}>
              Loading student details…
            </Text>
          )}

          <View style={styles.summaryRow}>
            <Text>Days Present</Text>
            <Text>{presentDays} days</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>
              Per Day Mess Rate (
              {(normDiet(studentDiet || "") || "").toUpperCase()} •{" "}
              {String(studentGender || "").toUpperCase()})
            </Text>
            <Text>₹{messRatePerDay}</Text>
          </View>

          {/* Show current month bill separately (just info) */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Current Mess Bill: ₹{messAmount}
            </Text>
            <Text style={styles.infoText}>
              Current Establishment Charges: ₹{establishmentAmount}
            </Text>
          </View>

          {/* Mess Overdue Box */}
          <View style={[styles.card, { borderColor: "#00C853" }]}>
            <Text style={styles.cardTitle}>Mess Overdue</Text>

            <View style={styles.summaryRow}>
              <Text>Overdue Amount</Text>
              <Text style={{ color: messOverdue > 0 ? "red" : "green" }}>
                ₹{messOverdue}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text>Already Paid</Text>
              <Text style={{ color: "green" }}>
                ₹{debugInfo?.messPaid || 0}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.payButton,
                { backgroundColor: messOverdue > 0 ? "#00C853" : "#ccc" },
              ]}
              disabled={messOverdue <= 0}
              onPress={() => openPayModal("mess")}
            >
              <Text style={styles.payButtonText}>
                {messOverdue > 0 ? "Pay Overdue" : "No Overdue"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Establishment Overdue Box */}
          <View style={[styles.card, { borderColor: "#2196f3" }]}>
            <Text style={styles.cardTitle}>Establishment Overdue</Text>

            <View style={styles.summaryRow}>
              <Text>Overdue Amount</Text>
              <Text style={{ color: estOverdue > 0 ? "red" : "green" }}>
                ₹{estOverdue}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text>Already Paid</Text>
              <Text style={{ color: "green" }}>₹{debugInfo?.estPaid || 0}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.payButton,
                { backgroundColor: estOverdue > 0 ? "#2196f3" : "#ccc" },
              ]}
              disabled={estOverdue <= 0}
              onPress={() => openPayModal("establishment")}
            >
              <Text style={styles.payButtonText}>
                {estOverdue > 0 ? "Pay Overdue" : "No Overdue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            {webviewHtml ? (
              // Show BillDesk inside WebView
              <WebView
                originWhitelist={["*"]}
                source={{ html: webviewHtml }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                onNavigationStateChange={async (event) => {
                  if (event.url.includes("sjtechsol.com/payment/response")) {
                    setWebviewHtml(null);
                    setModalVisible(false);

                    // 🔄 Refresh dues after payment
                    try {
                      const messRes = await axios.get(
                        `${API_BASE_URL}/api/mess/dues/${rollNo}`
                      );
                      setMessOverdue(messRes.data?.overdue || 0);

                      const estRes = await axios.get(
                        `${API_BASE_URL}/api/establishment/dues/${rollNo}`
                      );
                      setEstOverdue(estRes.data?.overdue || 0);
                    } catch (err) {
                      console.error("Failed to refresh dues", err);
                    }
                  }
                }}
              />
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  {payKind === "mess" ? "Mess Bill" : "Establishment"} Payment
                </Text>

                <Text style={{ marginBottom: 6 }}>
                  Total Overdue: ₹
                  {payKind === "mess" ? messOverdue : estOverdue}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter amount to pay"
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                />

                <View style={styles.modalButtons}>
                  <Pressable
                    onPress={async () => {
                      try {
                        if (!payAmount || Number(payAmount) <= 0) {
                          alert("Enter valid amount");
                          return;
                        }

                        const res = await axios.post(
                          `${API_BASE_URL}/api/payment/initiate`,
                          {
                            rollNo,
                            feeType: payKind,
                            amount: Number(payAmount),
                          }
                        );

                        const { bdorderid, merchantid, rdata } = res.data || {};
                        if (bdorderid && merchantid && rdata) {
                          // Build BillDesk form
                          const htmlForm = `
                      <html>
                      <body>
                        <form id="payForm" action="https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk" method="POST">
                          <input type="hidden" name="bdorderid" value="${bdorderid}" />
                          <input type="hidden" name="merchantid" value="${merchantid}" />
                          <input type="hidden" name="rdata" value="${rdata}" />
                        </form>
                        <script>document.getElementById('payForm').submit();</script>
                      </body>
                      </html>
                    `;
                          setWebviewHtml(htmlForm);
                        } else {
                          alert("Payment initiation failed.");
                        }
                      } catch (err) {
                        console.error("Payment error:", err);
                        alert("Payment failed. Try again.");
                      }
                    }}
                    style={styles.modalPayButton}
                  >
                    <Text style={{ color: "#fff" }}>Pay via BillDesk</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCancelButton}
                  >
                    <Text style={{ color: "#333" }}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f9ff", padding: 6 },
  scrollBody: {
    flexGrow: 1,
    paddingBottom: 80, // ensures you can scroll past the last card
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    color: "#fff",
    backgroundColor: "#2196f3",
    paddingVertical: 10,
    fontWeight: "bold",
  },
  summary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 10,
  },
  summaryTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  card: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "bold", marginBottom: 8 },
  amount: { fontWeight: "bold", color: "#00C853" },
  payButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalButtons: { flexDirection: "row", marginTop: 20, gap: 12 },
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
  debugBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    gap: 4,
  },
  debugTitle: { fontWeight: "bold", marginBottom: 4 },
  infoBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginVertical: 8,
  },
});

export default TimesheetScreen;
