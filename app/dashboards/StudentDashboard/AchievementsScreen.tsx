// AchievementsScreen.tsx
import { API_BASE_URL } from "@/constants/config";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
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
}

interface CategoryCount {
  [key: string]: number;
}

const DEFAULT_LIMITS = [10, 20, 50];

const AchievementsScreen = () => {
  const router = useRouter();

  // data + pagination
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  // ui state
  const [loading, setLoading] = useState<boolean>(true); // initial or page change
  const [refreshing, setRefreshing] = useState<boolean>(false); // pull-to-refresh
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [imageModalUri, setImageModalUri] = useState<string | null>(null);

  const buildImageUri = (imagePath?: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    return `${API_BASE_URL.replace(/\/$/, "")}${
      imagePath.startsWith("/") ? "" : "/"
    }${imagePath}`;
  };

  // fetch with pagination
  const fetchAchievements = useCallback(
    async (opts?: { page?: number; limit?: number; showLoading?: boolean }) => {
      const p = opts?.page ?? page;
      const l = opts?.limit ?? limit;
      if (opts?.showLoading !== false) setLoading(true);

      try {
        const token = await AsyncStorage.getItem("adminToken");
        const url = `${API_BASE_URL}/api/achievements?page=${p}&limit=${l}`;

        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.warn(
            "Failed to fetch achievements (admin). Status:",
            response.status
          );
          // fallback: set empty
          setAchievements([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        const data = await response.json();

        // normalize: either array or paginated object
        let arr: Achievement[] = [];
        let respPage = p;
        let respLimit = l;
        let respTotal = 0;
        let respTotalPages = 1;

        if (Array.isArray(data)) {
          arr = data;
          respTotal = data.length;
          respTotalPages = 1;
        } else if (Array.isArray((data as any).achievements)) {
          arr = (data as any).achievements;
          respPage = (data as any).page ?? p;
          respLimit = (data as any).limit ?? l;
          respTotal = (data as any).total ?? arr.length;
          respTotalPages =
            (data as any).totalPages ??
            Math.max(1, Math.ceil(respTotal / respLimit));
        } else if (Array.isArray((data as any).data)) {
          // some APIs use data[]
          arr = (data as any).data;
          respPage = (data as any).page ?? p;
          respLimit = (data as any).limit ?? l;
          respTotal = (data as any).total ?? arr.length;
          respTotalPages =
            (data as any).totalPages ??
            Math.max(1, Math.ceil(respTotal / respLimit));
        } else {
          // unknown shape, try to treat as empty
          arr = [];
          respTotal = 0;
          respTotalPages = 1;
        }

        // sort newest first by date if present
        arr.sort((a: Achievement, b: Achievement) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

        setAchievements(arr);
        setPage(respPage);
        setLimit(respLimit);
        setTotal(respTotal);
        setTotalPages(respTotalPages);
      } catch (err) {
        console.error("Error fetching achievements (admin):", err);
        setAchievements([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit]
  );

  useFocusEffect(
    useCallback(() => {
      // on focus load first page
      fetchAchievements({ page: 1, limit, showLoading: true });
    }, [fetchAchievements, limit])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAchievements({ page, limit, showLoading: false });
  }, [fetchAchievements, page, limit]);

  // change page
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

  // change limit -> reset to page 1
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

  const totalAchievements = achievements.length;

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
      >
        {/* Stats Overview (no header) */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#6a4cff" }]}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#D4AF37" }]}>
              {Object.keys(getCategoryCounts).length}
            </Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#FFD24D" }]}>
              {
                achievements.filter(
                  (a) => a.level === "gold" || a.level === "platinum"
                ).length
              }
            </Text>
            <Text style={styles.statLabel}>Elite (on page)</Text>
          </View>
        </View>

        {/* Intro */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Achievements Directory</Text>
          <Text style={styles.welcomeMessage}>
            Browse achievements awarded to students across the college.
          </Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Achievement Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {Object.entries(getCategoryCounts).map(([category, count]) => (
            <View key={category} style={styles.categoryPill}>
              <MaterialCommunityIcons
                name={getCategoryIcon(category)}
                size={18}
                color="#6a4cff"
              />
              <Text style={styles.categoryName}>{category}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{count}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Achievements List */}
        <Text style={styles.sectionTitle}>
          Achievements (Page {page} of {totalPages})
        </Text>

        {achievements.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No achievements found</Text>
            <Text style={styles.emptyMessage}>
              No achievements are available at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => {
              const imageUri = buildImageUri(achievement.image || null);
              return (
                <View key={achievement._id} style={styles.achievementCard}>
                  <View style={styles.achievementHeader}>
                    <View style={styles.leftHeader}>
                      <MaterialCommunityIcons
                        name={getLevelIcon(achievement.level)}
                        size={26}
                        color={getLevelColor(achievement.level)}
                      />
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>
                          {achievement.title}
                        </Text>
                        <Text style={styles.achievementCategory}>
                          {achievement.category}{" "}
                          {achievement.studentName
                            ? `• ${achievement.studentName}`
                            : ""}
                          {achievement.rollNo ? ` (${achievement.rollNo})` : ""}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.achievementDate}>
                      {achievement.date
                        ? new Date(achievement.date).toLocaleDateString()
                        : ""}
                    </Text>
                  </View>

                  <Text style={styles.achievementDescription}>
                    {achievement.description}
                  </Text>

                  {imageUri && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setImageModalUri(imageUri);
                        setImageModalVisible(true);
                      }}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.achievementImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}

                  <View style={styles.achievementFooter}>
                    <View style={styles.awardedBy}>
                      <Ionicons name="person" size={14} color="#6b7280" />
                      <Text style={styles.awardedByText}>
                        Awarded by {achievement.awardedBy}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.levelBadge,
                        { borderColor: getLevelColor(achievement.level) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelText,
                          { color: getLevelColor(achievement.level) },
                        ]}
                      >
                        {achievement.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            onPress={prevPage}
            disabled={page <= 1}
            style={[
              styles.paginationButton,
              page <= 1 && styles.paginationDisabled,
            ]}
          >
            <Text
              style={
                page <= 1
                  ? styles.paginationDisabledText
                  : styles.paginationText
              }
            >
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Page {page} of {totalPages}
            </Text>
            <Text style={styles.paginationSubtext}>{total} total</Text>
          </View>

          <TouchableOpacity
            onPress={nextPage}
            disabled={page >= totalPages}
            style={[
              styles.paginationButton,
              page >= totalPages && styles.paginationDisabled,
            ]}
          >
            <Text
              style={
                page >= totalPages
                  ? styles.paginationDisabledText
                  : styles.paginationText
              }
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Modal (unchanged) */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={modalStyles.modalBackground}>
          <TouchableOpacity
            style={modalStyles.closeArea}
            onPress={() => setImageModalVisible(false)}
          />
          <View style={modalStyles.imageContainer}>
            {imageModalUri ? (
              <Image
                source={{ uri: imageModalUri }}
                style={modalStyles.fullImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={modalStyles.closeArea}
            onPress={() => setImageModalVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AchievementsScreen;

/* ---------- styles (same as before + pagination + limit pills) ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6b7280" },

  scrollView: { flex: 1 },

  /* stats */
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 4, // reduced from 12
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  statCard: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "700", color: "#6a4cff" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  welcomeCard: {
    backgroundColor: "#eaf6ff",
    marginHorizontal: 16,
    marginTop: 8, // reduced from 14
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#60a5fa",
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 6,
  },
  welcomeMessage: { fontSize: 13, color: "#0c4a6e" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },

  categoriesContainer: { paddingHorizontal: 16, marginBottom: 16 },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    elevation: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  categoryBadge: {
    backgroundColor: "#f0f7ff",
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: { color: "#6a4cff", fontWeight: "700" },

  achievementsList: { paddingHorizontal: 16, paddingBottom: 20 },
  achievementCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 1,
  },
  achievementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  achievementInfo: { marginLeft: 10, maxWidth: "72%" },
  achievementTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  achievementCategory: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  achievementDate: { fontSize: 12, color: "#9ca3af" },

  achievementDescription: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 8,
  },

  achievementImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 8,
  },

  achievementFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  awardedBy: { flexDirection: "row", alignItems: "center" },
  awardedByText: { fontSize: 12, color: "#6b7280", marginLeft: 6 },

  levelBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: { fontSize: 12, fontWeight: "700" },

  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
  },

  /* pagination */
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 6,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#6a4cff",
    borderRadius: 10,
  },
  paginationDisabled: { opacity: 0.5 },
  paginationText: { color: "#fff", fontWeight: "700" },
  paginationDisabledText: { color: "#fff", opacity: 0.9 },
  paginationInfo: { alignItems: "center" },
  paginationSubtext: { fontSize: 12, color: "#9ca3af", marginTop: 4 },

  limitPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 8,
  },
  categoryNameSmall: { fontSize: 12 },
});

const modalStyles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  fullImage: { width: "100%", height: "80%" },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  closeArea: { height: 60 },
});
