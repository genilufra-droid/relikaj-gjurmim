// Reset: fshin gjithë të dhënat e kompanisë (parcela, fermerë, produkte, blerje, magazinë, raporte…). Mbeten vetëm kompania dhe përdoruesit.
import React, { useState } from "react";
import { Text, View } from "react-native";
import { sb } from "./supabase";
import { s, C, Btn, Card, ErrorBox, Field, InfoBox, SectionTitle, fmt } from "./ui";

export default function ResetData({ cid, role, onDone }) {
  const [open, setOpen] = useState(false), [code, setCode] = useState(""), [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""), [msg, setMsg] = useState("");
  if (role !== "admin") return null;

  const run = async () => {
    setBusy(true); setErr(""); setMsg("");
    const { data, error } = await sb.rpc("reset_company_data", { p_company: cid, p_confirm: code.trim() });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCode(""); setOpen(false);
    setMsg(`Reset u krye: u fshinë ${fmt(data?.deleted_rows ?? 0)} rreshta. Aplikacioni është bosh.`);
    onDone && onDone();
  };

  return (
    <View style={{ marginTop: 18 }}>
      <SectionTitle>Reset (kthe gjithçka në zero)</SectionTitle>
      <Card>
        <Text style={s.mute}>Fshin gjithçka të kompanisë: parcelat, fermerët, produktet, zonat, klientët, blerjet, magazinën, kultivimet, mostrat, dërgesat, qiratë dhe kartelën GBA. Mbeten vetëm kompania dhe përdoruesit. Nuk kthehet pas — bëj më parë një kopje rezervë më sipër.</Text>
        {!open ? <Btn title="Fillo reset-in" alt icon="trash-outline" tone="danger" onPress={() => setOpen(true)} /> : (
          <View>
            <Field label="Shkruaj RESET për të konfirmuar" value={code} onChangeText={setCode} autoCapitalize="characters" />
            <Btn title="Fshi gjithçka" icon="warning-outline" tone="danger" onPress={run} busy={busy} disabled={code.trim() !== "RESET"} />
            <Btn title="Anulo" alt onPress={() => { setOpen(false); setCode(""); }} />
          </View>
        )}
      </Card>
      {!!err && <ErrorBox message={err} />}
      {!!msg && <InfoBox icon="checkmark-circle">{msg}</InfoBox>}
    </View>
  );
}
