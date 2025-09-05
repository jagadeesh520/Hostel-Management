import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type ParamList = {
  PaymentWebView: { htmlForm: string };
};

export default function PaymentWebView() {
  const route = useRoute<RouteProp<ParamList, "PaymentWebView">>();
  const { htmlForm } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlForm }}
        javaScriptEnabled
        domStorageEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
