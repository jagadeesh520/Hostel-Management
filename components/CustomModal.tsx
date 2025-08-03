import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  promoCode?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({ visible, onClose, promoCode }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.circle}>
            <Text style={styles.tick}>✓</Text>
          </View>
          <Text style={styles.title}>Congratulations</Text>
          <Text style={styles.subtitle}>Your promotion code: <Text style={styles.code}>{promoCode || "YH88"}</Text></Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CustomModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "white",
    borderRadius: 10,
    width: 300,
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    position: "relative",
  },
  circle: {
    backgroundColor: "#e91e63",
    width: 60,
    height: 60,
    borderRadius: 30,
    position: "absolute",
    top: -30,
    justifyContent: "center",
    alignItems: "center",
  },
  tick: {
    fontSize: 28,
    color: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 40,
  },
  subtitle: {
    fontSize: 14,
    marginVertical: 10,
    textAlign: "center",
  },
  code: {
    fontWeight: "bold",
  },
  button: {
    marginTop: 15,
    backgroundColor: "#e91e63",
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
