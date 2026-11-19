import React from "react";
import { Text, TextInput, TouchableOpacity, View, StyleSheet, ActivityIndicator } from "react-native";

export const C = { bg: "#f5f4ee", card: "#ffffff", green: "#1f4d2e", green2: "#2f6b3a", leaf: "#8bbf5a", text: "#18251b", mute: "#69766b", line: "#e2e5dc", red: "#b3261e" };
const shadow = { shadowColor: "#0b1f10", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 };
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line, ...shadow },
  h1: { fontSize: 24, fontWeight: "700", color: C.green, marginBottom: 14, letterSpacing: 0.2 },
  label: { fontSize: 11, color: C.mute, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: C.text },
  btn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 16, ...shadow },
  btn2: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.green, shadowOpacity: 0 },
  btnT: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
  btnT2: { color: C.green },
  err: { color: C.red, marginTop: 10, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mute: { color: C.mute },
  header: { backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 14 },
  headerT: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.4 },
  headerS: { color: C.leaf, fontSize: 11, letterSpacing: 2, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderColor: C.line },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center", borderTopWidth: 3, borderTopColor: "transparent" },
  tabOn: { borderTopColor: C.leaf },
});

export const Btn = ({ title, onPress, alt, busy, disabled }) => (
  <TouchableOpacity style={[s.btn, alt && s.btn2, (busy || disabled) && { opacity: 0.5 }]} onPress={onPress} disabled={busy || disabled}>
    {busy ? <ActivityIndicator color={alt ? C.green : "#fff"} /> : <Text style={[s.btnT, alt && s.btnT2]}>{title}</Text>}
  </TouchableOpacity>
);

export const Field = ({ label, ...p }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} placeholderTextColor={C.mute} {...p} />
  </View>
);

// Numri shqip: 1.234,56
export const fmt = (n) => (n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 }));
export const num = (t) => Number(String(t).replace(/\./g, "").replace(",", ".")) || 0;
export const today = () => new Date().toISOString().slice(0, 10);
