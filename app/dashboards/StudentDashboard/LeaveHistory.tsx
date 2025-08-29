import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.29.83:5000';

type LeaveItem = {
  _id: string;
  leaveType: 'casual' | 'medical' | 'emergency';
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
};

const Filters = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
type Filter = typeof Filters[number];

export default function LeavesList() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return leaves;
    return leaves.filter((l) => l.status === filter);
  }, [leaves, filter]);

  const shortDate = (iso: string) => new Date(iso).toDateString();

  const load = async () => {
    try {
      setLoading(true);
      const rollNo = await AsyncStorage.getItem('rollNo');
      if (!rollNo) return Alert.alert('Not signed in', 'Missing roll number.');

      // fetch enough items; you can add pagination later
      const res = await fetch(`${API_URL}/api/leave/mine?page=1&limit=50`, {
        headers: {
          Authorization: `Bearer ${rollNo}`,
          'x-rollno': rollNo,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLeaves(data?.items || []);
      else Alert.alert('Error', data?.message || 'Failed to load leaves');
    } catch {
      Alert.alert('Error', 'Network error while loading');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

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
              headers: { Authorization: `Bearer ${rollNo}`, 'x-rollno': rollNo },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              setLeaves((prev) => prev.map((l) => (l._id === id ? { ...l, status: 'cancelled' } : l)));
              Alert.alert('Cancelled', 'Leave cancelled.');
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

  const renderItem = ({ item }: { item: LeaveItem }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.leaveType.toUpperCase()} • {item.numberOfDays} day{item.numberOfDays !== 1 ? 's' : ''}</Text>
        <Text style={statusStyle(item.status)}>{item.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.dates}>{shortDate(item.fromDate)} → {shortDate(item.toDate)}</Text>
      <Text numberOfLines={3} style={styles.reason}>{item.reason}</Text>
      {item.status === 'pending' && (
        <TouchableOpacity onPress={() => cancelLeave(item._id)} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.headerWrap}>
        <Text style={styles.pageTitle}>My Leave Requests</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filtersWrap}>
        {Filters.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ paddingTop: 24, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 16 }}>No leaves found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const statusStyle = (status: LeaveItem['status']) => {
  const base: any = {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, overflow: 'hidden', fontSize: 12, fontWeight: '700',
    alignSelf: 'flex-start'
  };
  if (status === 'approved') return [base, { backgroundColor: '#e8f5e9', borderColor: '#2e7d32', color: '#2e7d32' }];
  if (status === 'rejected') return [base, { backgroundColor: '#ffebee', borderColor: '#c62828', color: '#c62828' }];
  if (status === 'cancelled') return [base, { backgroundColor: '#eceff1', borderColor: '#607d8b', color: '#607d8b' }];
  return [base, { backgroundColor: '#fff8e1', borderColor: '#f9a825', color: '#f57f17' }]; // pending
};

const styles = StyleSheet.create({
  headerWrap: { paddingTop: 12, paddingHorizontal: 16 },
  pageTitle: { fontSize: 22, fontWeight: '800' },

  filtersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#cfd8dc', backgroundColor: '#eceff1' },
  chipActive: { backgroundColor: '#bbdefb', borderColor: '#90caf9' },
  chipText: { fontWeight: '700', color: '#37474f' },
  chipTextActive: { color: '#0d47a1' },

  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  dates: { marginTop: 4, color: '#555' },
  reason: { marginTop: 6, color: '#444' },

  cancelBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#e57373',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  cancelBtnText: { color: '#c62828', fontWeight: '700' },
});
