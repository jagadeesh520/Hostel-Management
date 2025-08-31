import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://api.sjtechsol.com';
const BUTTON_HEIGHT = 56;

type LeaveItem = {
  _id: string;
  leaveType: 'casual' | 'medical' | 'emergency';
  fromDate: string; // ISO
  toDate: string;   // ISO
  numberOfDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
};

const StudentDashboard = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Apply form
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState<'casual' | 'medical' | 'emergency'>('casual');
  const [submitting, setSubmitting] = useState(false);

  // Latest leave
  const [latest, setLatest] = useState<LeaveItem | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const numberOfDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate); start.setHours(0,0,0,0);
    const end = new Date(toDate);   end.setHours(0,0,0,0);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [fromDate, toDate]);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };
  const shortDate = (iso: string) => new Date(iso).toDateString();

  const loadLatest = async () => {
    try {
      setLoadingLatest(true);
      const rollNo = await AsyncStorage.getItem('rollNo');
      if (!rollNo) return;

      // our backend supports page & limit; fetch only the most recent one
      const res = await fetch(`${API_URL}/api/leave/mine?page=1&limit=1`, {
        headers: {
          Authorization: `Bearer ${rollNo}`,
          'x-rollno': rollNo,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLatest((data?.items && data.items[0]) || null);
      } else {
        // optional: Alert.alert('Error', data?.message || 'Failed to load latest leave');
        setLatest(null);
      }
    } catch {
      setLatest(null);
    } finally {
      setLoadingLatest(false);
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const handleSubmitLeave = async () => {
    if (!fromDate || !toDate) return Alert.alert('Error', 'Please select both from and to dates');
    if (fromDate > toDate) return Alert.alert('Error', 'To date cannot be before from date');
    if (!reason.trim()) return Alert.alert('Error', 'Please provide a reason for leave');

    try {
      setSubmitting(true);
      const rollNo = await AsyncStorage.getItem('rollNo');
      if (!rollNo) {
        setSubmitting(false);
        return Alert.alert('Not signed in', 'Missing roll number. Please login again.');
      }

      const res = await fetch(`${API_URL}/api/leave/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rollNo}`,
          'x-rollno': rollNo,
        },
        body: JSON.stringify({
          fromDate: fmt(fromDate),
          toDate: fmt(toDate),
          reason: reason.trim(),
          leaveType,
          numberOfDays,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Alert.alert('Success', 'Leave application submitted!');
        setFromDate(new Date());
        setToDate(new Date());
        setReason('');
        setLeaveType('casual');
        // refresh latest
        loadLatest();
      } else {
        Alert.alert('Error', data?.message || 'Failed to submit leave');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLeave = async (id: string) => {
    Alert.alert('Cancel Leave', 'Are you sure you want to cancel this leave?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const rollNo = await AsyncStorage.getItem('rollNo');
            if (!rollNo) return Alert.alert('Not signed in', 'Missing roll number.');
            const res = await fetch(`${API_URL}/api/leave/${id}/cancel`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${rollNo}`,
                'x-rollno': rollNo,
              },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              Alert.alert('Cancelled', 'Leave cancelled.');
              loadLatest();
            } else {
              Alert.alert('Error', data?.message || 'Unable to cancel leave');
            }
          } catch {
            Alert.alert('Error', 'Network error while cancelling');
          }
        },
      },
    ]);
  };

  const StatusBadge = ({ status }: { status: LeaveItem['status'] }) => {
    const base = [styles.badge];
    let extra: any = {};
    if (status === 'approved') extra = { backgroundColor: '#e8f5e9', borderColor: '#2e7d32', color: '#2e7d32' };
    else if (status === 'rejected') extra = { backgroundColor: '#ffebee', borderColor: '#c62828', color: '#c62828' };
    else if (status === 'cancelled') extra = { backgroundColor: '#eceff1', borderColor: '#607d8b', color: '#607d8b' };
    else extra = { backgroundColor: '#fff8e1', borderColor: '#f9a825', color: '#f57f17' }; // pending
    return <Text style={[...base, extra]}>{status.toUpperCase()}</Text>;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.mainContainer}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: BUTTON_HEIGHT + insets.bottom + 14 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Apply Leave */}
          <Text style={styles.header}>Apply for Leave</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={leaveType} onValueChange={(v) => setLeaveType(v)} style={styles.picker}>
                <Picker.Item label="Casual Leave" value="casual" />
                <Picker.Item label="Medical Leave" value="medical" />
                <Picker.Item label="Emergency Leave" value="emergency" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>From Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromDatePicker(true)}>
              <Text>{fromDate.toDateString()}</Text>
            </TouchableOpacity>
            {showFromDatePicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="default"
                onChange={(e, d) => { setShowFromDatePicker(Platform.OS === 'ios'); if (d) { const t = new Date(); t.setHours(0,0,0,0); if (d < t) return Alert.alert('Error','Cannot select past dates'); setFromDate(d); if (toDate < d) setToDate(d);} }}
                minimumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>To Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowToDatePicker(true)}>
              <Text>{toDate.toDateString()}</Text>
            </TouchableOpacity>
            {showToDatePicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display="default"
                onChange={(e, d) => { setShowToDatePicker(Platform.OS === 'ios'); if (d) { if (d < fromDate) return Alert.alert('Error','To date cannot be before from date'); setToDate(d);} }}
                minimumDate={fromDate}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Number of Days</Text>
            <View style={styles.daysContainer}>
              <Text style={styles.daysText}>
                {numberOfDays} day{numberOfDays !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.daysSubtext}>
              From {fromDate.toDateString()} to {toDate.toDateString()}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason for Leave</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Please provide details for your leave request"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Latest Leave (single card) */}
          <View style={{ height: 1, backgroundColor: '#ddd', marginVertical: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.header, { fontSize: 20, marginBottom: 0, textAlign: 'left' }]}>Latest Leave</Text>
            <TouchableOpacity onPress={() => router.push('./LeaveHistory')} style={styles.seeMoreBtn}>
              <Text style={{ fontWeight: '600' }}>See more</Text>
            </TouchableOpacity>
          </View>

          {loadingLatest ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : !latest ? (
            <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 12 }}>No leave applications yet.</Text>
          ) : (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>
                  {latest.leaveType.toUpperCase()} • {latest.numberOfDays} day{latest.numberOfDays !== 1 ? 's' : ''}
                </Text>
                <StatusBadge status={latest.status} />
              </View>
              <Text style={styles.cardDates}>{shortDate(latest.fromDate)} → {shortDate(latest.toDate)}</Text>
              <Text numberOfLines={2} style={styles.cardReason}>{latest.reason}</Text>

              {latest.status === 'pending' && (
                <TouchableOpacity onPress={() => cancelLeave(latest._id)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel Request</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Fixed Submit Button */}
        <View style={[styles.submitButtonContainer]}>
          <TouchableOpacity
            style={[styles.submitButton, { height: BUTTON_HEIGHT, opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmitLeave}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator /> : <Text style={styles.submitButtonText}>Submit Leave Application</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  mainContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: 5 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  textArea: { height: 100, textAlignVertical: 'top' },
  dateButton: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  pickerContainer: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  picker: { height: 50 },
  daysContainer: { backgroundColor: '#e8f5e8', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#4caf50', alignItems: 'center' },
  daysText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  daysSubtext: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' },

  seeMoreBtn: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1, borderColor: '#90caf9',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDates: { marginTop: 4, color: '#555' },
  cardReason: { marginTop: 6, color: '#444' },

  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, overflow: 'hidden', fontSize: 12, fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#e57373',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  cancelBtnText: { color: '#c62828', fontWeight: '700' },

  submitButtonContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 10, paddingTop: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1, borderTopColor: '#ddd',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8,
  },
  submitButton: {
    backgroundColor: '#3498db', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default StudentDashboard;
