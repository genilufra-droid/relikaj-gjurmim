import React, { useState } from "react";
import { Text, View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { sb, toEmail } from "./supabase";
import { s, C, Field, Btn } from "./ui";

export default function Login() {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
    setBusy(false);
    if (error) setErr("Emri i përdoruesit ose fjalëkalimi është gabim");
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.green }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 28, paddingTop: 90, paddingBottom: 36, minHeight: 280 }}>
          <Text style={{ color: C.leaf, fontSize: 12, letterSpacing: 4, fontWeight: "700" }}>TRUST THE NATURE</Text>
          <Text style={{ color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: 1, marginTop: 6 }}>BioBes</Text>
          <Text style={{ color: "#fff", fontSize: 18, letterSpacing: 8, marginTop: 2, opacity: 0.9 }}>FARM</Text>
          <Text style={{ color: "#cfe3c4", marginTop: 14, fontSize: 14, lineHeight: 20 }}>Gjurmueshmëri nga toka te kliento: fermerë, grumbullues, magazina dhe mostra.</Text>
        </View>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <Text style={[s.h1, { marginBottom: 4 }]}>Mirë se erdhe</Text>
          <Text style={s.mute}>Hyr me llogarinë tënde</Text>
          <Field label="Emri i përdoruesit ose email" value={u} onChangeText={setU} autoCapitalize="none" autoCorrect={false} />
          <Field label="Fjalëkalimi" value={p} onChangeText={setP} secureTextEntry />
          {!!err && <Text style={s.err}>{err}</Text>}
          <Btn title="Hyr" onPress={go} busy={busy} disabled={!u || !p} />
          <Text style={[s.mute, { textAlign: "center", marginTop: 22, fontSize: 12 }]}>BioBes · Aromatic & Medicinal Plants · Albania</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
