// AchievementsScreen.tsx
import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Achievement {
  _id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  awardedBy: string;
  image?: string | null;
  level: "bronze" | "silver" | "gold" | "platinum";
  studentName?: string;
  rollNo?: string;
  appreciationCount?: number;
  you_appreciated?: boolean;
}

interface CategoryCount {
  [key: string]: number;
}

const AchievementsScreen = () => {
  const router = useRouter();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [imageModalUri, setImageModalUri] = useState<string | null>(null);

  // token in use (admin/token/studentToken)
  const [userToken, setUserToken] = useState<string | null>(null);

  const buildImageUri = (imagePath?: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
    return `${API_BASE_URL.replace(/\/$/, "")}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const getAuthInfo = useCallback(async () => {
    try {
      const adminToken = await AsyncStorage.getItem("adminToken");
      if (adminToken) return { token: adminToken, role: "admin" as const };

      const token = await AsyncStorage.getItem("token");
      if (token) return { token, role: "user" as const };

      const studentToken = await AsyncStorage.getItem("studentToken");
      if (studentToken) {
        const rollNo = await AsyncStorage.getItem("rollNo");
        return { token: studentToken, role: "student" as const, rollNo: rollNo ?? null };
      }

      return { token: null, role: null as null };
    } catch (e) {
      console.warn("getAuthInfo err", e);
      return { token: null, role: null as null };
    }
  }, []);

  const promptLogin = useCallback(
    (message = "Authentication required") =>
      Alert.alert("Login required", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("../login") },
      ]),
    [router]
  );

  const fetchUserAppreciations = useCallback(
    async (ids: string[], token?: string | null) => {
      if (!ids || ids.length === 0) return;
      try {
        const t = token ?? (await getAuthInfo()).token;
        if (!t) return;
        const url = `${API_BASE_URL}/api/achievements/user-appreciations?ids=${ids.join(",")}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
        if (!resp.ok) {
          // if token expired, UI will handle on appreciate action
          return;
        }
        const json = await resp.json();
        const appreciatedIds: string[] = Array.isArray(json.appreciatedIds) ? json.appreciatedIds.map((s: any) => String(s)) : [];
        setAchievements((prev) =>
          prev.map((it) => (appreciatedIds.includes(String(it._id)) ? { ...it, you_appreciated: true } : { ...it, you_appreciated: it.you_appreciated ?? false }))
        );
      } catch (err) {
        console.error("fetchUserAppreciations error", err);
      }
    },
    [getAuthInfo]
  );

  /**
   * Fetch achievements for global feed (for everyone).
   *
   * Important:
   * - Tries a `public` feed endpoint first: /api/achievements/public
   *   (recommended backend change from earlier message).
   * - Falls back to /api/achievements (admin) if needed or available.
   */
  const fetchAchievements = useCallback(
    async (opts?: { page?: number; limit?: number; showLoading?: boolean }) => {
      const p = opts?.page ?? page;
      const l = opts?.limit ?? limit;
      if (opts?.showLoading !== false) setLoading(true);

      try {
        const auth = await getAuthInfo();
        if (auth.token) setUserToken(auth.token);

        // Try public feed (recommended backend add). If not present, fall back.
        const tryUrls = [
          `${API_BASE_URL}/api/achievements/public?page=${p}&limit=${l}`, // preferred: server should allow students to read
          `${API_BASE_URL}/api/achievements?page=${p}&limit=${l}`, // existing admin route (may 403)
        ];

        let data: any = null;
        let usedUrl = null;
        for (const url of tryUrls) {
          try {
            const resp = await fetch(url, { headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {} });
            if (!resp.ok) {
              // try next URL
              continue;
            }
            data = await resp.json();
            usedUrl = url;
            break;
          } catch (err) {
            // continue to next candidate
            console.warn("fetch attempt failed:", url, err);
            continue;
          }
        }

        if (!data) {
          // nothing returned successfully
          console.warn("Failed to fetch achievements from all endpoints");
          setAchievements([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        // data may be array or paginated object
        let arr: Achievement[] = [];
        let respPage = p;
        let respLimit = l;
        let respTotal = 0;
        let respTotalPages = 1;

        if (Array.isArray(data)) {
          arr = data;
          respTotal = data.length;
        } else if (Array.isArray((data as any).achievements)) {
          arr = (data as any).achievements;
          respPage = (data as any).page ?? p;
          respLimit = (data as any).limit ?? l;
          respTotal = (data as any).total ?? arr.length;
          respTotalPages = (data as any).totalPages ?? Math.max(1, Math.ceil(respTotal / respLimit));
        } else {
          arr = (data as any).data ?? [];
          respPage = (data as any).page ?? p;
          respLimit = (data as any).limit ?? l;
          respTotal = (data as any).total ?? arr.length;
          respTotalPages = (data as any).totalPages ?? Math.max(1, Math.ceil(respTotal / respLimit));
        }

        const normalized: Achievement[] = arr.map((it) => ({
          ...it,
          appreciationCount: typeof it.appreciationCount === "number" ? it.appreciationCount : 0,
          you_appreciated: typeof (it as any).you_appreciated === "boolean" ? (it as any).you_appreciated : false,
        }));

        normalized.sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        setAchievements(normalized);
        setPage(respPage);
        setLimit(respLimit);
        setTotal(respTotal);
        setTotalPages(respTotalPages);

        // request which ones current user appreciated (non-blocking)
        const ids = normalized.map((x) => String(x._id));
        if (ids.length > 0 && auth.token) {
          fetchUserAppreciations(ids, auth.token);
        }
      } catch (err) {
        console.error("Error fetching achievements:", err);
        setAchievements([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, getAuthInfo, fetchUserAppreciations]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAchievements({ page: 1, limit, showLoading: true });
    }, [fetchAchievements, limit])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAchievements({ page, limit, showLoading: false });
  }, [fetchAchievements, page, limit]);

  // pagination helpers
  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchAchievements({ page: p, limit });
  };
  const nextPage = () => {
    if (page < totalPages) goToPage(page + 1);
  };
  const prevPage = () => {
    if (page > 1) goToPage(page - 1);
  };
  const changeLimit = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    fetchAchievements({ page: 1, limit: newLimit });
  };

  const getCategoryCounts = useMemo(() => {
    const counts: CategoryCount = {};
    achievements.forEach((achievement) => {
      const key = achievement.category || "Other";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [achievements]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "gold":
        return "trophy";
      case "silver":
        return "medal";
      case "platinum":
        return "crown";
      default:
        return "trophy-award";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "gold":
        return "#FFD700";
      case "silver":
        return "#C0C0C0";
      case "platinum":
        return "#E5E4E2";
      default:
        return "#CD7F32";
    }
  };


  const getCategoryIcon = (category: string) => {
  switch ((category || "").toLowerCase()) {
    case "academic":
      return "school";
    case "sports":
      return "basketball";
    case "leadership":
      return "account-group";
    case "cultural":
      return "music";
    case "technology":
      return "laptop";
    default:
      return "trophy";
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a4cff" />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </SafeAreaView>
    );
  }

  const handleToggleAppreciate = async (achievementId: string) => {
    const idx = achievements.findIndex((a) => a._id === achievementId);
    if (idx === -1) return;

    const auth = await getAuthInfo();
    if (!auth.token) {
      promptLogin("You must be logged in to appreciate.");
      return;
    }

    const previous = JSON.parse(JSON.stringify(achievements)) as Achievement[];
    const currently = !!previous[idx].you_appreciated;

    const optimistic = previous.map((it) =>
      it._id === achievementId
        ? { ...it, you_appreciated: !currently, appreciationCount: (it.appreciationCount || 0) + (currently ? -1 : 1) }
        : it
    );
    setAchievements(optimistic);

    try {
      const res = await fetch(`${API_BASE_URL}/api/achievements/${achievementId}/appreciate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // auth problem — clear tokens and prompt login
          setUserToken(null);
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("adminToken");
          await AsyncStorage.removeItem("studentToken");
          setAchievements(previous);
          promptLogin("Session expired. Please login again.");
          return;
        }
        throw new Error(`Status ${res.status}`);
      }

      const json = await res.json();
      const { appreciated, appreciationCount } = json;
      setAchievements((prev) =>
        prev.map((it) =>
          it._id === achievementId
            ? { ...it, you_appreciated: !!appreciated, appreciationCount: typeof appreciationCount === "number" ? appreciationCount : it.appreciationCount ?? 0 }
            : it
        )
      );
    } catch (err) {
      console.error("Appreciate failed:", err);
      setAchievements(previous);
      Alert.alert("Failed", "Couldn't record your appreciation. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#6a4cff" }]}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#D4AF37" }]}>{Object.keys(getCategoryCounts).length}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#FFD24D" }]}>
              {achievements.filter((a) => a.level === "gold" || a.level === "platinum").length}
            </Text>
            <Text style={styles.statLabel}>Elite (on page)</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Achievements Directory</Text>
          <Text style={styles.welcomeMessage}>Browse achievements awarded to students across the college.</Text>
        </View>

        <Text style={styles.sectionTitle}>Achievement Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {Object.entries(getCategoryCounts).map(([category, count]) => (
            <View key={category} style={styles.categoryPill}>
              <MaterialCommunityIcons name={getCategoryIcon(category)} size={18} color="#6a4cff" />
              <Text style={styles.categoryName}>{category}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{count}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Achievements (Page {page} of {totalPages})</Text>

        {achievements.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No achievements found</Text>
            <Text style={styles.emptyMessage}>No achievements are available at the moment.</Text>
          </View>
        ) : (
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => {
              const imageUri = buildImageUri(achievement.image || null);
              return (
                <View key={achievement._id} style={styles.achievementCard}>
                  <View style={styles.achievementHeader}>
                    <View style={styles.leftHeader}>
                      <MaterialCommunityIcons name={getLevelIcon(achievement.level)} size={26} color={getLevelColor(achievement.level)} />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>{achievement.title}</Text>
                        <Text style={styles.achievementCategory}>
                          {achievement.category} {achievement.studentName ? `• ${achievement.studentName}` : ""}{achievement.rollNo ? ` (${achievement.rollNo})` : ""}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.achievementDate}>{achievement.date ? new Date(achievement.date).toLocaleDateString() : ""}</Text>
                  </View>

                  <Text style={styles.achievementDescription}>{achievement.description}</Text>

                  {imageUri && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => { setImageModalUri(imageUri); setImageModalVisible(true); }}>
                      <Image source={{ uri: imageUri }} style={styles.achievementImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}

                  <View style={styles.achievementFooter}>
                    <View style={styles.footerLeft}>
                      <View style={styles.awardedBy}>
                        <Ionicons name="person" size={14} color="#6b7280" />
                        <Text style={styles.awardedByText}>Awarded by {achievement.awardedBy}</Text>
                      </View>

                      <TouchableOpacity onPress={() => handleToggleAppreciate(achievement._id)} activeOpacity={0.75} style={styles.heartButtonCompact}>
                        <MaterialCommunityIcons name={achievement.you_appreciated ? "heart" : "heart-outline"} size={18} color={achievement.you_appreciated ? "#ff3b30" : "#9ca3af"} />
                        <Text style={[styles.heartCountCompact, { color: achievement.you_appreciated ? "#ff3b30" : "#9ca3af" }]}>{achievement.appreciationCount ?? 0}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.footerRight}>
                      <View style={[styles.levelBadge, { borderColor: getLevelColor(achievement.level) }]}>
                        <Text style={[styles.levelText, { color: getLevelColor(achievement.level) }]}>{achievement.level.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.paginationContainer}>
          <TouchableOpacity onPress={prevPage} disabled={page <= 1} style={[styles.paginationButton, page <= 1 && styles.paginationDisabled]}>
            <Text style={page <= 1 ? styles.paginationDisabledText : styles.paginationText}>Previous</Text>
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>Page {page} of {totalPages}</Text>
            <Text style={styles.paginationSubtext}>{total} total</Text>
          </View>

          <TouchableOpacity onPress={nextPage} disabled={page >= totalPages} style={[styles.paginationButton, page >= totalPages && styles.paginationDisabled]}>
            <Text style={page >= totalPages ? styles.paginationDisabledText : styles.paginationText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={modalStyles.modalBackground}>
          <TouchableOpacity style={modalStyles.closeArea} onPress={() => setImageModalVisible(false)} />
          <View style={modalStyles.imageContainer}>
            {imageModalUri ? <Image source={{ uri: imageModalUri }} style={modalStyles.fullImage} resizeMode="contain" /> : null}
            <TouchableOpacity style={modalStyles.closeButton} onPress={() => setImageModalVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={modalStyles.closeArea} onPress={() => setImageModalVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AchievementsScreen;

/* ---------- styles (copy your existing styles) ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6b7280" },

  scrollView: { flex: 1 },

  statsContainer: { flexDirection: "row", justifyContent: "space-between", padding: 14, marginHorizontal: 16, marginTop: 4, backgroundColor: "#fff", borderRadius: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 } },
  statCard: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "700", color: "#6a4cff" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  welcomeCard: { backgroundColor: "#eaf6ff", marginHorizontal: 16, marginTop: 8, marginBottom: 18, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#60a5fa" },
  welcomeTitle: { fontSize: 16, fontWeight: "700", color: "#0369a1", marginBottom: 6 },
  welcomeMessage: { fontSize: 13, color: "#0c4a6e" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginHorizontal: 16, marginTop: 12, marginBottom: 10 },

  categoriesContainer: { paddingHorizontal: 16, marginBottom: 16 },
  categoryPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 12, elevation: 1 },
  categoryName: { fontSize: 14, fontWeight: "600", color: "#374151", marginLeft: 8 },
  categoryBadge: { backgroundColor: "#f0f7ff", marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { color: "#6a4cff", fontWeight: "700" },

  achievementsList: { paddingHorizontal: 16, paddingBottom: 20 },
  achievementCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 14, elevation: 1 },
  achievementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  leftHeader: { flexDirection: "row", alignItems: "center", flex: 1 },
  achievementInfo: { marginLeft: 10, maxWidth: "72%" },
  achievementTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  achievementCategory: { fontSize: 13, color: "#6b7280", marginTop: 2,maxWidth:"100%" },
  achievementDate: { fontSize: 12, color: "#9ca3af" },

  achievementDescription: { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 8 },

  achievementImage: { width: "100%", height: 180, borderRadius: 10, marginTop: 8 },

  achievementFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12 },
  footerLeft: { flex: 1 },
  footerRight: { justifyContent: "flex-end" },
  awardedBy: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  awardedByText: { fontSize: 12, color: "#6b7280", marginLeft: 6 },

  heartButtonCompact: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "#f8f9fa", borderWidth: 1, borderColor: "#e9ecef" },
  heartCountCompact: { marginLeft: 6, fontWeight: "600", fontSize: 13 },

  levelBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  levelText: { fontSize: 12, fontWeight: "700" },

  emptyState: { alignItems: "center", padding: 40, backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 12 },
  emptyMessage: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 6 },

  paginationContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 },
  paginationButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#6a4cff", borderRadius: 10 },
  paginationDisabled: { opacity: 0.5 },
  paginationText: { color: "#fff", fontWeight: "700" },
  paginationDisabledText: { color: "#fff", opacity: 0.9 },
  paginationInfo: { alignItems: "center" },
  paginationSubtext: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
});

const modalStyles = StyleSheet.create({
  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center" },
  imageContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  fullImage: { width: "100%", height: "80%" },
  closeButton: { position: "absolute", top: 40, right: 20, backgroundColor: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 20 },
  closeArea: { height: 60 },
});
