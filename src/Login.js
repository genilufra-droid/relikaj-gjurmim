import React, { useState } from "react";
import { Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { sb, toEmail } from "./supabase";
import { s, Field, Btn } from "./ui";

export default function Login() {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
    setBusy(false);
    if (error) setErr("Emri i përdoruesit ose fjalëkalimi është gabim");
  };
  return (
    <KeyboardAvoidingView style={[s.screen, s.pad, { justifyContent: "center" }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={s.h1}>BioBes Farm</Text>
      <Field label="Emri i përdoruesit ose email" value={u} onChangeText={setU} autoCapitalize="none" autoCorrect={false} />
      <Field label="Fjalëkalimi" value={p} onChangeText={setP} secureTextEntry />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Hyr" onPress={go} busy={busy} disabled={!u || !p} />
    </KeyboardAvoidingView>
  );
}
