import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Header() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.centeredRow}>
        <Image
          source={require("../../assets/images/logo.png")} // adjust path as needed
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.textWrapper}>
          <Text style={styles.title}>JNTUACEP{"\n"}Hostel Management</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#6200ee",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    zIndex: 1000,
  },
  centeredRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  textWrapper: {
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
    lineHeight: 24,
  },
});
