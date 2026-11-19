import React, { useState } from "react";
import { Text, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb, toEmail } from "./supabase";
import { s, C, Field, Btn, ErrorBox } from "./ui";

export default function Login() {
  const [u, setU] = useState(""), [p, setP] = useState(""), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
    setBusy(false);
    if (error) setErr("Emri i përdoruesit ose fjalëkalimi është gabim. Provoni përsëri.");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.brand }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 28, paddingTop: 84, paddingBottom: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Ionicons name="leaf" size={28} color="#fff" />
          </View>
          <Text style={{ color: "#B9D8A8", fontSize: 11, letterSpacing: 3.4, fontWeight: "700" }}>BIOBES FARM</Text>
          <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 }}>Menaxho fermën,{`\n`}nga fusha te klienti</Text>
          <Text style={{ color: "#CBE2C0", marginTop: 14, fontSize: 14.5, lineHeight: 21 }}>
            Parcela me GPS, kultivime, detyra, vëzhgime me foto, inpute, magazinë dhe gjurmueshmëri e plotë.
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 28, paddingBottom: 40, flex: 1 }}>
          <Text style={[s.h1, { marginBottom: 2 }]}>Mirë se erdhe</Text>
          <Text style={s.sub}>Hyr me llogarinë e kompanisë tuaj.</Text>

          <Field label="Emri i përdoruesit ose email" value={u} onChangeText={setU} autoCapitalize="none" autoCorrect={false} placeholder="emri@biobes.al" keyboardType="email-address" />

          <Text style={s.label}>Fjalëkalimi</Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 }}>
            <Field
              label="" value={p} onChangeText={setP} secureTextEntry={!show}
              style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0 }}
              placeholder="••••••••"
            />
            <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10}>
              <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color={C.mute} />
            </TouchableOpacity>
          </View>

          {!!err && <ErrorBox message={err} />}
          <Btn title="Hyr" icon="log-in-outline" onPress={go} busy={busy} disabled={!u || !p} />
          <Text style={[s.mute, { textAlign: "center", marginTop: 22, fontSize: 11.5 }]}>BioBes · Bimë aromatike e mjekësore · Shqipëri</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
