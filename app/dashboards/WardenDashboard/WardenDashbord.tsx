import {
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Image,
    ListRenderItem,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Type for MaterialCommunityIcons icons
type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Types for stats and menu items
interface Stat {
  id: string;
  value: string;
  label: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: MaterialIconName; // ✅ Strongly typed icon name
  color: string;
}

const Dashboard: React.FC = () => {
  const menuItems: MenuItem[] = [
    { id: "1", title: "Order History", icon: "file-document-outline", color: "#4cafef" },
    { id: "2", title: "Payment Method", icon: "credit-card-outline", color: "#ff8a65" },
    { id: "3", title: "Tracking", icon: "map-marker-radius-outline", color: "#4db6ac" },
    { id: "4", title: "Statistics", icon: "chart-line", color: "#9575cd" },
    { id: "5", title: "Settings", icon: "tools", color: "#81c784" },
    { id: "6", title: "Support", icon: "lifebuoy", color: "#64b5f6" },
  ];

  const stats: Stat[] = [
    { id: "1", value: "10%", label: "Discount" },
    { id: "2", value: "$32", label: "Balance" },
    { id: "3", value: "$70", label: "Income" },
  ];

  const renderStatCard: ListRenderItem<Stat> = ({ item }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  const renderMenuItem: ListRenderItem<MenuItem> = ({ item }) => (
    <TouchableOpacity style={styles.menuItem}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name={item.icon} size={26} color="#fff" />
      </View>
      <Text style={styles.menuText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
            style={styles.avatar}
          />
          <Text style={styles.username}>Robert Wilkinson</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={26} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <FlatList
          data={stats}
          renderItem={renderStatCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Menu Grid */}
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.menuContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7ff",
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#6a4cff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: 110,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
  },
  statLabel: {
    color: "#e0e0e0",
    fontSize: 12,
    marginTop: 4,
  },
  menuContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  menuItem: {
    backgroundColor: "#fff",
    flex: 1,
    margin: 5,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
});

export default Dashboard;
