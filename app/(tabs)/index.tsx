import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500); // show splash for 2.5s
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={require("../../assets/images/icon.png")} // put your logo/icon here
          style={styles.logo}
        />
        <Text style={styles.title}>Hostel Management</Text>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return <Redirect href="/(tabs)/Admin/admin-login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
});
