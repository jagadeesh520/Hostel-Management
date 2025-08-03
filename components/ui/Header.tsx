// components/ui/Header.tsx
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Header() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>JNTUACEP{"\n"}Hostel Management</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffff',
    textAlign: 'center',
  },
});
