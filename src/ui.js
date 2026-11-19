import React from "react";
import { Text, TextInput, TouchableOpacity, View, StyleSheet, ActivityIndicator } from "react-native";

export const C = { bg: "#f4f6f1", card: "#fff", green: "#2f6b3a", text: "#1d2a1f", mute: "#6b7a6d", line: "#d9e0d6", red: "#b3261e" };
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  h1: { fontSize: 22, fontWeight: "700", color: C.text, marginBottom: 12 },
  label: { fontSize: 12, color: C.mute, marginTop: 10, marginBottom: 4, textTransform: "uppercase" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 10, fontSize: 16, color: C.text },
  btn: { backgroundColor: C.green, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 14 },
  btn2: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.green },
  btnT: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnT2: { color: C.green },
  err: { color: C.red, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mute: { color: C.mute },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderColor: C.line },
  tab: { flex: 1, padding: 12, alignItems: "center" },
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
