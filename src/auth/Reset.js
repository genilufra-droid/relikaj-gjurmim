// Vendosja e fjalëkalimit të ri — hapet nga lidhja e emailit ose pas verifikimit me telefon.
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "../supabase";
import { s, C, Field, Btn, ErrorBox, InfoBox } from "../ui";

export default function ResetPassword({ email, onDone, onCancel }) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr("");
    if (p1.length < 8) { setErr("Fjalëkalimi duhet të ketë të paktën 8 shkronja."); return; }
    if (p1 !== p2) { setErr("Të dyja fushat duhet të jenë të njëjta."); return; }
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) {
      setErr(
        /same password/i.test(error.message)
          ? "Fjalëkalimi i ri duhet të ndryshojë nga ai i vjetri."
          : /weak/i.test(error.message)
            ? "Fjalëkalimi është shumë i dobët. Përdorni shkronja, numra dhe shenja."
            : error.message
      );
      return;
    }
    setOk(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.brand }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 28, paddingTop: 76, paddingBottom: 30 }}>
          <View style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="lock-open-outline" size={26} color="#fff" />
          </View>
          <Text style={{ color: "#B9D8A8", fontSize: 11, letterSpacing: 3, fontWeight: "700" }}>BIOBES FARM</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 6 }}>
            {ok ? "Fjalëkalimi u ndryshua" : "Fjalëkalim i ri"}
          </Text>
          <Text style={{ color: "#CBE2C0", marginTop: 10, fontSize: 14 }}>
            {ok ? "Mund të vazhdoni punën me fjalëkalimin e ri." : `Llogaria: ${email || "e verifikuar"}`}
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 26, flex: 1 }}>
          {ok ? (
            <>
              <InfoBox icon="checkmark-circle">Fjalëkalimi u ruajt. Hyrja tjetër bëhet me fjalëkalimin e ri.</InfoBox>
              <Btn title="Vazhdo" icon="arrow-forward" onPress={onDone} />
            </>
          ) : (
            <>
              <Field label="Fjalëkalimi i ri (min. 8 shkronja)" value={p1} onChangeText={setP1} secureTextEntry autoCapitalize="none" />
              <Field label="Përsëriteni fjalëkalimin" value={p2} onChangeText={setP2} secureTextEntry autoCapitalize="none" />
              {!!err && <ErrorBox message={err} />}
              <Btn title="Ruaj fjalëkalimin" onPress={save} busy={busy} disabled={!p1 || !p2} />
              {!!onCancel && <Btn title="Anulo" alt onPress={onCancel} />}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
