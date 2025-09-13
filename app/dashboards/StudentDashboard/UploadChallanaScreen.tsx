// UploadChallanScreen.tsx
import { API_BASE_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

type ParsedFields = {
  refNo?: string | null;
  category?: string | null;
  amount?: string | null;
  rollNo?: string | null;
  studentName?: string | null;
  fatherName?: string | null;
  course?: string | null;
  branch?: string | null;
  yearOfStudy?: string | null;
  mobile?: string | null;
  email?: string | null;
  monthlyMessFee?: string | null;
  noOfMonths?: string | null;
  transactionCharge?: string | null;
};

export default function UploadChallanScreen() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number | null;
    mimeType?: string | null;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedFields | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadedList, setUploadedList] = useState<
    Array<{ id: string; originalName?: string; fields: ParsedFields; status?: string }>
  >([]);

  const [status, setStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // per-item checking spinner
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({});

  // highlight recently saved item (optional)
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("API_BASE_URL:", API_BASE_URL);
    fetchMyUploads();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // -------------------------
  // Document picker + helpers
  // -------------------------
  const pickDocument = async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      console.log("pickDocument -> raw result:", JSON.stringify(res, null, 2));

      if (res && Array.isArray(res.assets) && res.assets.length > 0 && res.canceled === false) {
        const asset = res.assets[0];
        const uri = asset.uri;
        const name = asset.name ?? (uri ? uri.split("/").pop() : "challan.pdf");
        const size = asset.size ?? null;
        const mimeType = asset.mimeType ?? "application/pdf";
        setSelectedFile({ uri, name, size, mimeType });
        setParsed(null);
        setDocId(null);
        setStatus(null);
        Toast.show({ type: "success", text1: "File selected", text2: name });
        return;
      }

      if (res && (res.type === "success" || res.type === "picked") && res.uri) {
        const uri = res.uri;
        const name = res.name ?? (uri ? uri.split("/").pop() : "challan.pdf");
        const size = res.size ?? null;
        const mimeType = (res as any).mimeType ?? "application/pdf";
        setSelectedFile({ uri, name, size, mimeType });
        setParsed(null);
        setDocId(null);
        setStatus(null);
        Toast.show({ type: "success", text1: "File selected", text2: name });
        return;
      }

      if (res && (res.canceled === true || res.type === "cancel")) {
        console.log("Document picker cancelled");
        return;
      }

      const possibleUri = res?.uri ?? res?.fileUri ?? (res?.output && res.output.uri);
      if (possibleUri) {
        const name = res.name ?? possibleUri.split("/").pop() ?? "challan.pdf";
        setSelectedFile({ uri: possibleUri, name, size: (res as any).size ?? null, mimeType: "application/pdf" });
        setParsed(null);
        setDocId(null);
        setStatus(null);
        Toast.show({ type: "success", text1: "File selected (fallback)", text2: name });
        return;
      }

      Toast.show({ type: "error", text1: "Could not read picked file" });
    } catch (err) {
      console.error("Document pick error", err);
      Toast.show({ type: "error", text1: "Failed to pick document" });
    }
  };

  const openSelected = async () => {
    if (!selectedFile) return;
    try {
      await Linking.openURL(selectedFile.uri);
    } catch (err) {
      console.warn("Could not open file directly", err);
      Toast.show({ type: "info", text1: "Open the file using a file manager app" });
    }
  };

  const uriToBlob = async (fileUri: string) => {
    try {
      const resp = await fetch(fileUri);
      const blob = await resp.blob();
      return blob;
    } catch (err) {
      console.warn("uriToBlob failed", err);
      return null;
    }
  };

  // -------------------------
  // Backend interactions
  // -------------------------

  // Fetch student's uploads (by roll number). Map returned docs to friendly UI fields.
  const fetchMyUploads = async () => {
    try {
      const rollNoStored = await AsyncStorage.getItem("rollNo");
      const token = await AsyncStorage.getItem("studentToken");

      const tryRoll = async (r: string | null) => {
        if (!r) return [];
        const url = `${API_BASE_URL}/api/uploadChallan/by-roll/${encodeURIComponent(r)}`;
        console.log("Fetching uploads:", url);
        const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!res.ok) {
          console.warn("Failed to fetch uploads", res.status);
          return [];
        }
        const docs = await res.json();
        console.log("by-roll response:", docs);
        return Array.isArray(docs) ? docs : [];
      };

      let docs = await tryRoll(rollNoStored);
      // fallback: if none found and we have parsed.rollNo, try that
      if ((!docs || docs.length === 0) && parsed?.rollNo) {
        docs = await tryRoll(parsed.rollNo);
      }

      const list = (docs || []).map((d: any) => {
        const displayName =
          d.originalName ||
          d.fields?.studentName ||
          d.fields?.refNo ||
          (d.filePath ? d.filePath.split("/").pop() : d._id);
        return {
          id: d._id || d.id,
          originalName: displayName,
          fields: d.fields || {},
          status: d.status || null,
        };
      });

      setUploadedList(list);
    } catch (err) {
      console.error("fetchMyUploads error", err);
    }
  };

  // Check status for a specific id and update that row
  const checkApprovalStatusForId = async (id: string) => {
    if (!id) return null;
    try {
      // mark item as checking
      setCheckingIds((s) => ({ ...s, [id]: true }));
      const token = await AsyncStorage.getItem("studentToken");
      const url = `${API_BASE_URL}/api/challans/${id}`;
      console.log("GET status ->", url);
      const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const raw = await res.text().catch(() => "");
      let body: any = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch (e) {
        body = raw;
      }
      if (!res.ok) {
        console.warn("Status check failed", res.status, body);
        Toast.show({ type: "error", text1: "Status check failed", text2: String(body || res.status) });
        return null;
      }
      // update the single item
      if (body && body.status) {
        setUploadedList((s) => s.map((u) => (u.id === id ? { ...u, status: body.status, fields: body.fields || u.fields } : u)));
        // if it's the currently-open doc, update status too
        if (id === docId) setStatus(body.status);
        // notify if approved
        if (body.status === "approved") {
          Toast.show({ type: "success", text1: "Challan approved", text2: "Your challan has been approved." });
        } else {
          Toast.show({ type: "info", text1: `Status: ${body.status}` });
        }
      } else {
        Toast.show({ type: "info", text1: "No status available" });
      }
      return body;
    } catch (err) {
      console.error("checkApprovalStatusForId error", err);
      Toast.show({ type: "error", text1: "Status check failed", text2: String(err) });
      return null;
    } finally {
      setCheckingIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }
  };

  // Upload (XHR with progress, fallback to fetch)
  const uploadFile = async () => {
    if (!selectedFile) {
      Alert.alert("Select file", "Please select a challan PDF first.");
      return;
    }

    const uri = selectedFile.uri;
    const filename = selectedFile.name || "challan.pdf";
    const fileType = selectedFile.mimeType || "application/pdf";
    const token = await AsyncStorage.getItem("studentToken");

    try {
      setUploading(true);
      setUploadProgress(0);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_BASE_URL}/api/uploadChallan/upload-challan`;
        console.log("Uploading to:", url);
        xhr.open("POST", url);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.onload = () => {
          console.log("XHR status", xhr.status, "resp:", (xhr.responseText || "").slice(0, 800));
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) {
              setParsed(json.fields || null);
              if (json.id) setDocId(json.id);
              if (json.status) setStatus(json.status);
              if (json.id) setUploadedList((s) => [{ id: json.id, originalName: filename, fields: json.fields || {}, status: json.status }, ...s]);
              Toast.show({ type: "success", text1: "Upload successful", text2: json.status ? `Status: ${json.status}` : undefined });
              // auto-poll this id
              if (json.id) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = setInterval(() => checkApprovalStatusForId(json.id), 30000) as any;
              }
              resolve(null);
            } else if (xhr.status === 409) {
              const existingId = json.existingId || json.existing || null;
              Toast.show({ type: "error", text1: "Duplicate challan", text2: existingId ? `Existing ID: ${existingId}` : json.error });
              if (json.fields) setParsed(json.fields);
              if (existingId) setDocId(existingId);
              if (json.status) setStatus(json.status);
              reject(new Error("duplicate"));
            } else {
              console.warn("Upload failed (xhr)", xhr.status, xhr.responseText);
              reject(new Error(`xhr status ${xhr.status}`));
            }
          } catch (err) {
            console.error("Upload parse error", err, xhr.responseText);
            reject(err);
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };

        const formData: any = new FormData();
        formData.append("file", {
          uri: Platform.OS === "ios" && uri.startsWith("file://") ? uri : uri,
          name: filename,
          type: fileType,
        });

        try {
          xhr.send(formData);
        } catch (err) {
          reject(err);
        }
      });

      return;
    } catch (err) {
      console.warn("XHR upload failed, trying blob fallback:", err);
    }

    // blob fallback
    try {
      const blob = await uriToBlob(uri);
      if (!blob) throw new Error("Failed to read file blob from URI");

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: filename,
        type: fileType,
      } as any);

      const url = `${API_BASE_URL}/api/uploadChallan/upload-challan`;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setParsed(j.fields || null);
        if (j.id) setDocId(j.id);
        if (j.status) setStatus(j.status);
        if (j.id) setUploadedList((s) => [{ id: j.id, originalName: filename, fields: j.fields || {}, status: j.status }, ...s]);
        Toast.show({ type: "success", text1: "Upload successful (fallback)" });
        if (j.id) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(() => checkApprovalStatusForId(j.id), 30000) as any;
        }
      } else if (res.status === 409) {
        Toast.show({ type: "error", text1: "Duplicate challan", text2: j.existingId || j.error });
        if (j.fields) setParsed(j.fields);
        if (j.existingId) setDocId(j.existingId);
      } else {
        console.warn("Blob upload failed", res.status, j);
        Toast.show({ type: "error", text1: "Upload failed", text2: j.error || String(res.status) });
      }
    } catch (err) {
      console.error("Blob fallback upload error", err);
      Toast.show({ type: "error", text1: "Upload failed", text2: String(err) });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // refresh the list to include newly uploaded doc (if server created it)
      setTimeout(fetchMyUploads, 500);
    }
  }; // uploadFile

  // Save corrected fields (PATCH /api/challans/:id)
  const saveCorrectedFields = async () => {
    if (!parsed) {
      Alert.alert("Nothing to save", "Upload first to get parsed fields.");
      return;
    }
    if (!parsed.refNo || String(parsed.refNo).trim().length === 0) {
      Alert.alert("Missing Reference", "SBCollect Reference Number (refNo) is required before saving.");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("studentToken");
      if (!docId) {
        Alert.alert("No document id", "Upload first to create a record before saving.");
        return;
      }
      const url = `${API_BASE_URL}/api/challans/${docId}`;
      console.log("PATCH ->", url, "payload:", parsed);

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fields: parsed }),
      });

      const raw = await res.text().catch(() => "");
      let body: any = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch (e) {
        body = raw;
      }

      if (!res.ok) {
        const userMsg =
          (body && body.error) ||
          (typeof body === "string" && body.slice(0, 200)) ||
          `Server responded with status ${res.status}`;
        Toast.show({ type: "error", text1: "Save failed", text2: userMsg });
        console.error("PATCH /api/challans/:id failed", { status: res.status, body });
        return;
      }

      Toast.show({ type: "success", text1: "Challan saved" });
      console.log("PATCH success:", body);

      // update state from server response
      if (body && body.id) setDocId(body.id);
      if (body && body.status) setStatus(body.status);
      if (body && body.fields) {
        // since server confirmed the saved fields, we show them in My Uploads and hide the preview
        setJustSavedId(body.id || null);
        // clear the preview and selected file so Confirm button disappears
        setParsed(null);
        setSelectedFile(null);
      }

      // refresh the uploads list
      await fetchMyUploads();

      // start polling the saved doc for status updates
      if (body && body.id) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => checkApprovalStatusForId(body.id), 30000) as any;
      }
    } catch (err) {
      console.error("Save error (network or unexpected):", err);
      Toast.show({ type: "error", text1: "Save failed", text2: String(err) });
    } finally {
      setSaving(false);
    }
  };

  // Check status for current doc
  const checkApprovalStatus = async () => {
    if (!docId) {
      Alert.alert("No challan", "Upload first or open an existing challan to check status.");
      return;
    }
    setCheckingStatus(true);
    try {
      const body = await checkApprovalStatusForId(docId);
      if (body && body.status) {
        setStatus(body.status);
        setParsed(body.fields || parsed);
        Toast.show({ type: body.status === "approved" ? "success" : "info", text1: `Status: ${body.status}` });
        if (body.status === "approved") Alert.alert("Approved", "Your challan has been approved.");
      } else {
        Toast.show({ type: "info", text1: "No status available" });
      }
    } catch (err) {
      console.error("Status check error", err);
      Toast.show({ type: "error", text1: "Failed to check status", text2: String(err) });
    } finally {
      setCheckingStatus(false);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Upload Challan (PDF)</Text>

        <Text style={styles.helpText}>
          Select the PDF challan issued by your college. We'll extract fields automatically. After upload you'll see an{" "}
          <Text style={{ fontWeight: "700" }}>Attached PDF</Text> preview — confirm and save to store details.
        </Text>

        <TouchableOpacity style={styles.pickButton} onPress={pickDocument} activeOpacity={0.8}>
          <Text style={styles.pickButtonText}>Choose PDF</Text>
        </TouchableOpacity>

        {/* Selected file card */}
        {selectedFile ? (
          <View style={styles.fileCard}>
            <Text style={styles.fileName}>{selectedFile.name}</Text>
            {selectedFile.size ? <Text style={styles.fileMeta}>{Math.round((selectedFile.size || 0) / 1024)} KB</Text> : null}
            <View style={styles.fileActionsRow}>
              <TouchableOpacity onPress={openSelected} style={styles.openBtn}>
                <Text style={styles.openBtnText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSelectedFile(null); setParsed(null); setDocId(null); setStatus(null); }} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Upload button: only visible when a file is selected */}
        {selectedFile ? (
          <TouchableOpacity
            style={[styles.uploadBtn, uploading ? styles.disabled : null]}
            onPress={uploadFile}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadBtnText}>{`  Uploading ${uploadProgress}%`}</Text>
              </>
            ) : (
              <Text style={styles.uploadBtnText}>Upload & Extract</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Attached PDF preview + edit/save */}
        {parsed ? (
          <View style={styles.attachedCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.attachedTitle}>Attached PDF</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: status === "approved" ? "#2dce89" : "#ffd166" }}>
                <Text style={{ color: status === "approved" ? "#fff" : "#334155", fontWeight: "700" }}>{(status ?? "pending").toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.attachedSub}>Preview of extracted details from the uploaded challan.</Text>

            <View style={styles.fieldRow}><Text style={styles.fieldKey}>SBCollect Reference Number</Text><Text style={styles.fieldVal}>{parsed.refNo ?? "-"}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldKey}>Category</Text><Text style={styles.fieldVal}>{parsed.category ?? "-"}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldKey}>Amount</Text><Text style={styles.fieldVal}>{parsed.amount ?? "-"}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldKey}>ROLL NUMBER</Text><Text style={styles.fieldVal}>{parsed.rollNo ?? "-"}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldKey}>NAME OF THE STUDENT</Text><Text style={styles.fieldVal}>{parsed.studentName ?? "-"}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldKey}>FATHER NAME</Text><Text style={styles.fieldVal}>{parsed.fatherName ?? "-"}</Text></View>

            <Text style={styles.editHint}>If any value is incorrect, edit below before confirming.</Text>

            <Text style={styles.fieldLabel}>Reference No</Text>
            <TextInput style={styles.input} value={parsed.refNo ?? ""} onChangeText={(v) => setParsed((p) => ({ ...(p ?? {}), refNo: v }))} />

            <Text style={styles.fieldLabel}>Roll No</Text>
            <TextInput style={styles.input} value={parsed.rollNo ?? ""} onChangeText={(v) => setParsed((p) => ({ ...(p ?? {}), rollNo: v }))} />

            <Text style={styles.fieldLabel}>Student Name</Text>
            <TextInput style={styles.input} value={parsed.studentName ?? ""} onChangeText={(v) => setParsed((p) => ({ ...(p ?? {}), studentName: v }))} />

            <TouchableOpacity style={styles.saveBtn} onPress={saveCorrectedFields} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Confirm & Save</Text>}
            </TouchableOpacity>

            {docId ? (
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: "#5e72e4", marginTop: 8 }]} onPress={checkApprovalStatus} disabled={checkingStatus}>
                {checkingStatus ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{status === "approved" ? "Approved — Refresh" : "Check Approval Status"}</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* My Uploads */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>My Uploads</Text>
          {uploadedList.length === 0 ? (
            <Text style={{ color: "#718096" }}>No uploads found yet.</Text>
          ) : (
            uploadedList.map((u) => {
              const displayName = u.originalName || u.fields?.studentName || u.fields?.refNo || u.id;
              const refNo = u.fields?.refNo ?? "-";
              const studentName = u.fields?.studentName ?? "-";
              const isJustSaved = justSavedId && justSavedId === u.id;
              return (
                <View key={u.id} style={{ backgroundColor: isJustSaved ? "#e6fffa" : "#fff", padding: 10, borderRadius: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "800" }}>{displayName}</Text>
                      <Text style={{ color: "#718096", fontSize: 12 }}>{`Ref: ${refNo}`}</Text>
                      <Text style={{ color: "#718096", fontSize: 12 }}>{`Name: ${studentName}`}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontWeight: "700", marginBottom: 8 }}>{(u.status ?? "pending").toUpperCase()}</Text>
                      <TouchableOpacity
                        onPress={() => checkApprovalStatusForId(u.id)}
                        style={{ backgroundColor: "#edf2ff", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, minWidth: 72, alignItems: "center" }}
                      >
                        {checkingIds[u.id] ? <ActivityIndicator /> : <Text style={{ color: "#5e72e4", fontWeight: "700" }}>Check</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// styles (unchanged)
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#f7fafc" },
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: "#2d3748" },
  helpText: { color: "#718096", marginBottom: 16 },
  pickButton: {
    backgroundColor: "#5e72e4",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  pickButtonText: { color: "#fff", fontWeight: "700" },
  fileCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12, elevation: 1 },
  fileName: { fontWeight: "700", color: "#2d3748" },
  fileMeta: { color: "#718096", fontSize: 12 },
  fileActionsRow: { flexDirection: "row", marginTop: 8 },
  openBtn: { padding: 8, backgroundColor: "#edf2ff", borderRadius: 8, marginRight: 8 },
  openBtnText: { color: "#5e72e4", fontWeight: "600" },
  removeBtn: { padding: 8, backgroundColor: "#fff5f6", borderRadius: 8, borderWidth: 1, borderColor: "#fde2e6" },
  removeBtnText: { color: "#f5365c", fontWeight: "600" },
  uploadBtn: { backgroundColor: "#11cdef", padding: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  uploadBtnText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.7 },
  attachedCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginTop: 10 },
  attachedTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4, color: "#2d3748" },
  attachedSub: { color: "#718096", marginBottom: 12 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderColor: "#edf2f7" },
  fieldKey: { fontSize: 12, color: "#4a5568", flex: 1 },
  fieldVal: { fontSize: 12, color: "#2d3748", flex: 1, textAlign: "right" },
  editHint: { marginTop: 8, color: "#718096" },
  fieldLabel: { color: "#4a5568", marginTop: 6, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#2dce89", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  historyRow: { backgroundColor: "#fff", padding: 10, borderRadius: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" },
});
