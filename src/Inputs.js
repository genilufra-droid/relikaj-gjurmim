// Inputet: shpenzime parcele dhe trajtime (plehra, pesticide, farë, karburant, krah pune…).
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num, today } from "./ui";

const CATS = [["seed", "Farë dhe fidanë"], ["fert", "Plehra"], ["pest", "Pesticide/trajtime"], ["water", "Ujitje dhe energji"], ["fuel", "Karburant"], ["labor", "Krah pune"], ["machinery", "Makineri"], ["other", "Të tjera"]];

export function InputForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), category: "other", description: "", qty: "", unit: "", amount: "", supplier: "", lot: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.description.trim()) { setErr("Shkruani përshkrimin"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("inputs").insert({
      company_id: cid, plot_id: f.plot, date: f.date, category: f.category, description: f.description.trim(),
      qty: num(f.qty), unit: f.unit, amount: num(f.amount), supplier: f.supplier, lot_code: f.lot.trim(),
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Input i ri</Text>
      <Lookup title="Parcela (opsionale)" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Lloji</Text>
      {CATS.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("category")(k)} style={[s.input, { marginBottom: 6 }, f.category === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.category === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Përshkrimi" value={f.description} onChangeText={set("description")} />
      <Field label="Sasia" value={f.qty} onChangeText={set("qty")} keyboardType="decimal-pad" />
      <Field label="Njësia (kg, L, orë…)" value={f.unit} onChangeText={set("unit")} />
      <Field label="Shuma (lekë)" value={f.amount} onChangeText={set("amount")} keyboardType="decimal-pad" />
      <Field label="Furnizuesi" value={f.supplier} onChangeText={set("supplier")} />
      <Field label="Kodi i lotit (opsionale)" value={f.lot} onChangeText={set("lot")} autoCapitalize="characters" />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Inputs({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("inputs")
      .select("id,date,category,description,qty,unit,amount,plots(name)")
      .eq("company_id", cid).order("date", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const total = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const del = (r) => Alert.alert("Fshi inputin?", r.description, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("inputs").delete().eq("id", r.id); load(); } }]);
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.id)} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Inputet</Text><Text style={s.mute}>Gjithsej (100 të fundit): {fmt(total)} lekë</Text>{role !== "fermer" && <Btn title="+ Input i ri" onPress={onNew} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
        ListEmptyComponent={<Text style={s.mute}>Asnjë input ende.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={[s.card, { marginTop: 10 }]} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
            <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.description}</Text><Text style={s.mute}>{r.date}</Text></View>
            <Text style={s.mute}>{r.category}{!!r.plots ? ` · ${r.plots.name}` : ""}{r.qty ? ` · ${fmt(r.qty)} ${r.unit}` : ""}</Text>
            <Text style={{ color: C.text }}>{fmt(r.amount)} lekë</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
