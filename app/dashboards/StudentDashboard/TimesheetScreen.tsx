// TimesheetScreen.tsx  — replace your existing file with this
import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
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

const pad2 = (n: number) => String(n).padStart(2, "0");

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

const extractExtendedRates = (raw: any) => {
  const base =
    raw?.rate ?? raw?.data ?? (Array.isArray(raw) ? raw[0] : raw) ?? raw ?? {};
  const boysVegRate = Number(base.boysVegRate ?? 0);
  const boysNonVegRate = Number(base.boysNonVegRate ?? 0);
  const girlsVegRate = Number(base.girlsVegRate ?? 0);
  const girlsNonVegRate = Number(base.girlsNonVegRate ?? 0);

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

const normDiet = (t: string | null): "veg" | "non-veg" => {
  const s = (t || "").trim().toLowerCase();
  if (/^nv$/.test(s)) return "non-veg";
  if (/(^|[^a-z])non($|[^a-z])/.test(s)) return "non-veg";
  if (/non[\s-]?veg/.test(s)) return "non-veg";
  return "veg";
};

const pickYearKey = (yearText: string | null) => {
  const digit = (yearText || "").replace(/\D/g, "");
  if (digit === "1") return "y1";
  if (digit === "2") return "y2";
  if (digit === "3") return "y3";
  return "y4";
};

type PayKind = "mess" | "establishment";

const TimesheetScreen = () => {
  const [markedDates, setMarkedDates] = useState<Record<string, MarkedDateProps>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [presentDays, setPresentDays] = useState(0);
  const [messRatePerDay, setMessRatePerDay] = useState(0);
  const [messAmount, setMessAmount] = useState(0);
  const [establishmentAmount, setEstablishmentAmount] = useState(0);

  const [studentGender, setStudentGender] = useState<string | null>(null);
  const [studentDiet, setStudentDiet] = useState<string | null>(null);
  const [studentYear, setStudentYear] = useState<string | null>(null);
  const [rollNo, setRollNo] = useState<string | null>(null);

  // legacy per-endpoint values (fallback)
  const [messOverdue, setMessOverdue] = useState(0);
  const [estOverdue, setEstOverdue] = useState(0);

  // authoritative StudentDue picked from /api/dues/:rollNo
  const [studentDue, setStudentDue] = useState<{ messDue: number; estDue: number; totalDue: number } | null>(null);

  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const r = await AsyncStorage.getItem("rollNo");
      const g = await AsyncStorage.getItem("gender");
      const t = await AsyncStorage.getItem("type");
      const y = await AsyncStorage.getItem("year");

      setRollNo(r);
      if (g) setStudentGender(g);
      if (t) setStudentDiet(normDiet(t));
      if (y) setStudentYear(y);

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

  // fetch timesheet/rates + dues (keeps most of your previous logic)
  useEffect(() => {
    if (!rollNo) return;
    if (!studentGender || !studentYear || !studentDiet) return;
    fetchTimesheetAndRates(selectedMonth, selectedYear, studentGender, studentDiet, studentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, rollNo, studentGender, studentDiet, studentYear]);

  const fetchRatesData = async (month: number, year: number) => {
    const tryUrls = [
      `${API_BASE_URL}/api/adminRates/rate?month=${month}&year=${year}`,
      `${API_BASE_URL}/api/adminRates/rate?month=${String(month).padStart(2, "0")}&year=${year}`,
    ];
    for (const url of tryUrls) {
      try {
        const resp = await axios.get(url);
        return resp.data;
      } catch (e: any) {
        if (e?.response?.status !== 404) {
          console.error("Rate fetch error", url, e?.message);
        }
      }
    }
    return null;
  };

  const fetchTimesheetAndRates = async (
    month: number,
    year: number,
    genderArg: string,
    dietArg: string | null,
    yearTextArg: string | null
  ) => {
    try {
      setMessRatePerDay(0);
      setMessAmount(0);
      setPresentDays(0);
      setMarkedDates({});
      setEstablishmentAmount(0);
      setMessOverdue(0);
      setEstOverdue(0);
      setStudentDue(null);

      if (!rollNo) return;

      const daysInMonth = new Date(year, month, 0).getDate();
      const monthPrefix = `${year}-${pad2(month)}`;

      // timesheet (single fetch)
      const timesheetRes = await axios.get(`${API_BASE_URL}/api/timesheetRoutes/${rollNo}`);
      const tData = timesheetRes.data || {};

      const present = coerceDateStrings(tData.presentDates);
      const absent = coerceDateStrings(tData.absentDates);
      const approved = coerceDateStrings(tData.approvedLeaveDates);

      const fPresent = present.filter((d) => d && d.startsWith(monthPrefix));
      const fAbsent = absent.filter((d) => d && d.startsWith(monthPrefix));
      const fApproved = approved.filter((d) => d && d.startsWith(monthPrefix));

      const style = {
        present: { container: { backgroundColor: "#00c853", borderRadius: 100 }, text: { color: "white", fontWeight: "bold" } },
        absent: { container: { backgroundColor: "#d32f2f", borderRadius: 100 }, text: { color: "white", fontWeight: "bold" } },
        leave: { container: { backgroundColor: "#ff9800", borderRadius: 100 }, text: { color: "white", fontWeight: "bold" } },
        empty: { container: { backgroundColor: "#ccc", opacity: 0.5, borderRadius: 100 }, text: { color: "#888" } },
      } as const;

      const marked: Record<string, MarkedDateProps> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
        if (fPresent.includes(dateStr)) marked[dateStr] = { customStyles: style.present };
        else if (fApproved.includes(dateStr)) marked[dateStr] = { customStyles: style.leave };
        else if (fAbsent.includes(dateStr)) marked[dateStr] = { customStyles: style.absent };
        else marked[dateStr] = { customStyles: style.empty };
      }
      setMarkedDates(marked);

      // rates for selected month
      const ratesData = await fetchRatesData(month, year);
      const rates = extractExtendedRates(ratesData || {});
      const isMale = isMaleGender(genderArg);
      let perDay = 0;
      if (isMale) perDay = dietArg === "non-veg" ? rates.boysNonVegRate : rates.boysVegRate;
      else perDay = dietArg === "non-veg" ? rates.girlsNonVegRate : rates.girlsVegRate;

      const presentDaysCount = fPresent.length;
      const mess = presentDaysCount * (perDay || 0);
      const yrKey = pickYearKey(yearTextArg);
      const estAmount = Number(rates.estCharges?.[yrKey] ?? 0);

      setPresentDays(presentDaysCount);
      setMessRatePerDay(perDay || 0);
      setMessAmount(mess);
      setEstablishmentAmount(estAmount);

      // legacy endpoints for fallback
      const [messRes, estRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/mess/dues/${rollNo}`),
        axios.get(`${API_BASE_URL}/api/establishment/dues/${rollNo}`),
      ]);

      const backendMessOverdue = messRes.data?.overdue || 0;
      const backendMessPaid = messRes.data?.paid || 0;
      const backendEstOverdue = estRes.data?.overdue || 0;
      const backendEstPaid = estRes.data?.paid || 0;

      // Try to fetch StudentDue master doc (preferred)
      try {
        const sdResp = await axios.get(`${API_BASE_URL}/api/dues/${rollNo}`);
        const sdPayload = sdResp.data && sdResp.data.data ? sdResp.data.data : sdResp.data;
        const sd = sdPayload ?? null;
        if (sd && typeof sd === "object") {
          const maybe = {
            messDue: Number(sd.messDue ?? sd.overdue ?? backendMessOverdue ?? 0),
            estDue: Number(sd.estDue ?? sd.estoverdue ?? backendEstOverdue ?? 0),
            totalDue: Number(sd.totalDue ?? ((sd.messDue ?? backendMessOverdue) + (sd.estDue ?? backendEstOverdue)) ?? 0),
          };
          setStudentDue(maybe);
        } else {
          setStudentDue(null);
        }
      } catch (e) {
        setStudentDue(null);
      }

      setMessOverdue(backendMessOverdue);
      setEstOverdue(backendEstOverdue);

      setDebugInfo({
        month,
        year,
        gender: genderArg,
        diet: dietArg,
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
      setStudentDue(null);
    }
  };

  // Simple Pay Overdue handler - opens SBI Collect page.
  const handlePayOverdue = async () => {
    try {
      const sbiUrl = "https://www.onlinesbi.sbi/sbicollect/";
      const can = await Linking.canOpenURL(sbiUrl);
      if (!can) {
        alert("Cannot open SBI Collect on this device.");
        return;
      }
      await Linking.openURL(sbiUrl);
    } catch (err) {
      console.error("Failed to open SBI URL:", err);
      alert("Unable to open payment page. Please try from a browser.");
    }
  };

  const ready = Boolean(rollNo && studentGender && studentYear && studentDiet);

  // =========================
  // Display dues directly from DB (no extra previous-month additions)
  // =========================
  const baseMess = typeof studentDue?.messDue === "number" ? studentDue.messDue : messOverdue ?? 0;
  const baseEst = typeof studentDue?.estDue === "number" ? studentDue.estDue : estOverdue ?? 0;
  const baseTotalFromStudentDue = typeof studentDue?.totalDue === "number" ? studentDue.totalDue : null;

  const displayedMess = baseMess;
  const displayedEst = baseEst;
  const displayedTotal =
    baseTotalFromStudentDue !== null
      ? baseTotalFromStudentDue
      : displayedMess + displayedEst;
  // =========================

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
        {[{ label: "Present", bg: "#00c853" }, { label: "Absent", bg: "#d32f2f" }, { label: "Approved Leave", bg: "#ff9800" }].map((it) => (
          <View key={it.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: it.bg }} />
            <Text>{it.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.title}>Timesheet Calendar</Text>

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <Calendar
          enableSwipeMonths
          hideExtraDays
          markingType="custom"
          markedDates={markedDates}
          theme={{ todayTextColor: "#00C853", arrowColor: "#00C853" }}
          onMonthChange={(month) => { setSelectedMonth(month.month); setSelectedYear(month.year); }}
        />

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Current Period: {pad2(selectedMonth)}/{selectedYear}</Text>

          {!ready && (<Text style={{ color: "#444", marginBottom: 8 }}>Loading student details…</Text>)}

          <View style={styles.summaryRow}><Text>Days Present</Text><Text>{presentDays} days</Text></View>
          <View style={styles.summaryRow}>
            <Text>Per Day Mess Rate ({(normDiet(studentDiet || "") || "").toUpperCase()} • {String(studentGender || "").toUpperCase()})</Text>
            <Text>₹{messRatePerDay}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Current Mess Bill: ₹{messAmount}</Text>
            <Text style={styles.infoText}>Current Establishment Charges: ₹{establishmentAmount}</Text>
          </View>

          {/* Single Overdue card (Mess/Est/Total) */}
          <View style={[styles.card, { borderColor: "#e53935" }]}>
            <Text style={styles.cardTitle}>Overdue</Text>

            <View style={styles.summaryRow}>
              <Text>Mess Due</Text>
              <Text style={{ color: displayedMess > 0 ? "red" : "green" }}>₹{displayedMess}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text>Establishment Due</Text>
              <Text style={{ color: displayedEst > 0 ? "red" : "green" }}>₹{displayedEst}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={{ fontWeight: "bold" }}>Total Due</Text>
              <Text style={{ fontWeight: "bold", color: displayedTotal > 0 ? "red" : "green" }}>₹{displayedTotal}</Text>
            </View>

            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: displayedTotal > 0 ? "#1976d2" : "#ccc" }]}
                disabled={displayedTotal <= 0}
                onPress={handlePayOverdue}
              >
                <Text style={styles.payButtonText}>{displayedTotal > 0 ? "Pay Overdue (SBI Collect)" : "No Overdue"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f9ff", padding: 6 },
  scrollBody: { flexGrow: 1, paddingBottom: 80 },
  title: { fontSize: 20, textAlign: "center", color: "#fff", backgroundColor: "#2196f3", paddingVertical: 10, fontWeight: "bold" },
  summary: { marginTop: 16, padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ddd", gap: 10 },
  summaryTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  card: { marginTop: 12, borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: "bold", marginBottom: 8 },
  amount: { fontWeight: "bold", color: "#00C853" },
  payButton: { marginTop: 10, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  infoBox: { marginTop: 10, marginBottom: 10, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  infoText: { fontSize: 14, color: "#333", marginBottom: 4 },
});

export default TimesheetScreen;
