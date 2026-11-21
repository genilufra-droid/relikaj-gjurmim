// Kartela e llogarisë me laboratorin (p.sh. GBA): parapagime (debi) dhe shërbime/analiza (kredi), me gjendjen.
import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { sb } from "./supabase";
import { s, C, Btn, Field, Card, ErrorBox, SectionTitle, fmt, num, today, dFull } from "./ui";

export default function LabAccount({ cid, account, onAccount }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [f, setF] = useState({ date: today(), ref: "", description: "", debit: "", credit: "", note: "" });
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const load = useCallback(async () => {
    const { data, error } = await sb.from("lab_entries").select("id,date,ref,description,debit,credit,account")
      .eq("company_id", cid).ilike("account", account || "GBA").order("date").order("id");
    setErr(error ? "Kartela nuk u ngarkua" : ""); setRows(data || []);
  }, [cid, account]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const debit = num(f.debit), credit = num(f.credit);
    if (!f.description.trim()) return setErr("Shkruani përshkrimin");
    if (!debit && !credit) return setErr("Shkruani debi ose kredi");
    setBusy(true); setErr("");
    const { error } = await sb.from("lab_entries").insert({ company_id: cid, account: (account || "GBA").trim(), date: f.date, ref: f.ref.trim(), description: f.description.trim(), debit, credit, note: f.note.trim() });
    setBusy(false);
    if (error) return setErr("Nuk u ruajt: " + error.message);
    setF({ date: today(), ref: "", description: "", debit: "", credit: "", note: "" }); load();
  };
  const D = rows.reduce((a, r) => a + Number(r.debit || 0), 0), K = rows.reduce((a, r) => a + Number(r.credit || 0), 0);

  return (
    <View>
      <SectionTitle>Kartela e llogarisë</SectionTitle>
      <Field label="Laboratori / llogaria" value={account} onChangeText={onAccount} placeholder="GBA" />
      {rows.map((r) => (
        <Card key={r.id}>
          <Text style={s.h2}>{r.description}</Text>
          <Text style={s.sub}>{dFull(r.date)} · {r.ref || "pa referencë"}</Text>
          <Text style={{ color: Number(r.debit) ? C.ok : C.red, fontWeight: "700", marginTop: 4 }}>
            {Number(r.debit) ? `Debi ${fmt(r.debit)} €` : `Kredi ${fmt(r.credit)} €`}
          </Text>
        </Card>
      ))}
      <Card><Text style={s.h2}>Gjendja: {fmt(K - D)} €</Text><Text style={s.sub}>Debi {fmt(D)} € · Kredi {fmt(K)} €</Text></Card>
      <Text style={[s.h2, { marginTop: 12 }]}>Hyrje e re</Text>
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Field label="Nr ref." value={f.ref} onChangeText={set("ref")} />
      <Field label="Përshkrimi" value={f.description} onChangeText={set("description")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Debi (€) — parapagim" value={f.debit} onChangeText={set("debit")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Kredi (€) — shërbim" value={f.credit} onChangeText={set("credit")} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="Shënim në fund të kartelës (opsional)" value={f.note} onChangeText={set("note")} />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj hyrjen" icon="checkmark-circle-outline" onPress={save} busy={busy} />
    </View>
  );
}
