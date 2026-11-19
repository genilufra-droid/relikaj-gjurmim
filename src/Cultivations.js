// Kultivimet: ciklet e mbjelljes/vjeljes për çdo parcelë.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num, today } from "./ui";

const STAGES = [["planned", "E planifikuar"], ["growing", "Në rritje"], ["harvest", "Vjelje"], ["done", "Mbaruar"]];

export function CultivationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, product: null, variety: "", sowing: "", expected: "", stage: "planned", yieldKg: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.plot) { setErr("Zgjidhni parcelën"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("cultivations").insert({
      company_id: cid, plot_id: f.plot, product_id: f.product, variety: f.variety,
      sowing_date: f.sowing || null, expected_harvest: f.expected || null, stage: f.stage,
      expected_yield_kg: num(f.yieldKg), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Kultivim i ri</Text>
      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={set("product")} />
      <Field label="Varieteti" value={f.variety} onChangeText={set("variety")} />
      <Field label="Data e mbjelljes (VVVV-MM-DD)" value={f.sowing} onChangeText={set("sowing")} placeholder="2026-03-01" />
      <Field label="Vjelja e pritshme (VVVV-MM-DD)" value={f.expected} onChangeText={set("expected")} placeholder="2026-06-01" />
      <Text style={s.label}>Faza</Text>
      {STAGES.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("stage")(k)} style={[s.input, { marginBottom: 6 }, f.stage === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.stage === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Rendimenti i pritshëm (kg)" value={f.yieldKg} onChangeText={set("yieldKg")} keyboardType="decimal-pad" />
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Cultivations({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("cultivations")
      .select("id,stage,sowing_date,expected_harvest,expected_yield_kg,plots(name),products(name)")
      .eq("company_id", cid).order("sowing_date", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const canWrite = role !== "fermer";
  const del = (r) => Alert.alert("Fshi kultivimin?", "", [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("cultivations").delete().eq("id", r.id); load(); } }]);
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.id)} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Kultivimet</Text>{canWrite && <Btn title="+ Kultivim i ri" onPress={onNew} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
        ListEmptyComponent={<Text style={s.mute}>Asnjë kultivim ende.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={[s.card, { marginTop: 10 }]} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
            <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.products?.name || "Pa produkt"}</Text><Text style={s.mute}>{r.stage}</Text></View>
            <Text style={s.mute}>{r.plots?.name || ""}{r.sowing_date ? ` · mbjellë ${r.sowing_date}` : ""}{r.expected_harvest ? ` · vjelje ${r.expected_harvest}` : ""}</Text>
            {!!r.expected_yield_kg && <Text style={{ color: C.text }}>Rendimenti i pritshëm: {fmt(r.expected_yield_kg)} kg</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
