import React, { useState } from "react";
import { ScrollView, Text } from "react-native";
import { s, Field, Btn } from "./ui";
import Lookup, { LOOKUPS } from "./Lookup";
import { downloadReport } from "./reports";

export default function Reports({ cid }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [lot, setLot] = useState("");
  const [farmer, setFarmer] = useState(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState("");
  const run = (key, params) => async () => {
    setBusy(key); setMsg("");
    try { await downloadReport({ company_id: cid, ...params }); } catch (e) { setMsg(e.message || "Raporti nuk u krijua"); }
    setBusy("");
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Raporte</Text>
      <Field label="Viti" value={year} onChangeText={setYear} keyboardType="number-pad" />
      <Btn title="Përmbledhje vjetore · Excel" busy={busy === "s1"} onPress={run("s1", { type: "summary", format: "xlsx", year: Number(year) })} />
      <Btn title="Përmbledhje vjetore · PDF" alt busy={busy === "s2"} onPress={run("s2", { type: "summary", format: "pdf", year: Number(year) })} />
      <Btn title="Lista e mbledhësve · Excel" alt busy={busy === "g1"} onPress={run("g1", { type: "growers", format: "xlsx" })} />
      <Btn title="Lista e mbledhësve · PDF" alt busy={busy === "g2"} onPress={run("g2", { type: "growers", format: "pdf" })} />
      <Field label="Fletë vjelje: kodi i lotit" value={lot} onChangeText={setLot} autoCapitalize="characters" />
      <Btn title="Fletë vjelje · Excel" alt disabled={!lot.trim()} busy={busy === "l1"} onPress={run("l1", { type: "lot", format: "xlsx", lot_code: lot.trim() })} />
      <Btn title="Fletë vjelje · PDF" alt disabled={!lot.trim()} busy={busy === "l2"} onPress={run("l2", { type: "lot", format: "pdf", lot_code: lot.trim() })} />
      <Lookup title="Përmbledhje për fermerin" cid={cid} cfg={LOOKUPS.farmer} value={farmer} onChange={setFarmer} />
      <Btn title="Fermeri · Excel" alt disabled={!farmer} busy={busy === "f1"} onPress={run("f1", { type: "farmer", format: "xlsx", farmer_id: farmer, year: Number(year) })} />
      <Btn title="Fermeri · PDF" alt disabled={!farmer} busy={busy === "f2"} onPress={run("f2", { type: "farmer", format: "pdf", farmer_id: farmer, year: Number(year) })} />
      {!!msg && <Text style={s.err}>{msg}</Text>}
    </ScrollView>
  );
}
