// Përpunimi në qendër: tharje, pastrim, prerje, klasifikim, vaj dhe paketim — me rendiment.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, Stat, SectionTitle, fmt, money, num, today, dFull, Kpis } from "./ui";

export const BATCH_METHODS = [["drying", "Tharje"], ["cleaning", "Pastrim"], ["cutting", "Prerje"], ["grading", "Klasifikim"], ["oil", "Nxjerrje vaji"], ["packing", "Paketim"], ["other", "Tjetër"]];
const LABEL = Object.fromEntries(BATCH_METHODS);

export function BatchForm({ cid, onDone }) {
  const [f, setF] = useState({ code: "", date: today(), method: "drying", source: "", product: null, input: "", output: "", note: "" });
  const [lots, setLots] = useState([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    const y = String(new Date().getFullYear()).slice(2);
    sb.from("lot_chain").select("lot_code,product").eq("company_id", cid).order("d_to", { ascending: false }).limit(30)
      .then(({ data }) => {
        setLots(data || []);
        setF((o) => (o.code ? o : { ...o, code: `B-${y}-${String((data || []).length + 1).padStart(2, "0")}` }));
      });
  }, [cid]);

  const save = async () => {
    if (!f.code.trim()) { setErr("Shkruani kodin e batch-it"); return; }
    if (num(f.input) <= 0) { setErr("Shkruani sasinë hyrëse"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("batches").insert({
      company_id: cid, code: f.code.trim(), date: f.date, method: f.method, source_lot: f.source.trim(),
      product_id: f.product, input_qty: num(f.input), output_qty: num(f.output), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  const yieldPct = num(f.input) > 0 ? Math.round((100 * num(f.output)) / num(f.input) * 10) / 10 : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Batch i ri përpunimi</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Lidhni sasinë hyrëse me lotin e grumbulluar dhe regjistroni rendimentin.</Text>
      <Field label="Kodi i batch-it" value={f.code} onChangeText={set("code")} autoCapitalize="characters" />
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Metoda</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
        {BATCH_METHODS.map(([k, t]) => (
          <TouchableOpacity key={k} onPress={() => set("method")(k)} style={[s.chip, { backgroundColor: f.method === k ? C.brand : C.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 }]}>
            <Text style={[s.chipT, { color: f.method === k ? "#fff" : C.sub, fontWeight: "700" }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Loti burim (kodi i gjurmueshmërisë)" value={f.source} onChangeText={set("source")} autoCapitalize="characters" placeholder="W010F/1a-I-115-26" />
      {lots.length > 0 && !f.source && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {lots.slice(0, 6).map((l) => (
            <TouchableOpacity key={l.lot_code} onPress={() => set("source")(l.lot_code)} style={[s.chip, { backgroundColor: C.brandSoft, marginRight: 6, marginBottom: 6 }]}>
              <Text style={[s.chipT, { color: C.brand }]}>{l.lot_code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Lookup title="Produkti (opsional)" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={set("product")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Hyrje (kg)" value={f.input} onChangeText={set("input")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Dalje (kg)" value={f.output} onChangeText={set("output")} keyboardType="decimal-pad" /></View>
      </View>
      {num(f.input) > 0 && <Text style={s.mute}>Rendimenti: {fmt(yieldPct)}%</Text>}
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj batch-in" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Processing({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [err, setErr] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("batch_summary").select("*").eq("company_id", cid).order("date", { ascending: false }).limit(150);
    setErr(error ? "Batch-et nuk u ngarkuan" : ""); setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const canDel = role === "admin" || role === "staf";
  const totalIn = rows.reduce((a, r) => a + Number(r.input_qty || 0), 0);
  const totalOut = rows.reduce((a, r) => a + Number(r.output_qty || 0), 0);
  const avg = totalIn > 0 ? Math.round((1000 * totalOut) / totalIn) / 10 : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Përpunimi</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Tharje, pastrim, prerje, klasifikim, vaj dhe paketim në qendër.</Text>
      <Kpis style={{ marginTop: 12 }}>
        <Stat icon="download-outline" label="Hyrje" value={`${fmt(totalIn)} kg`} sub={`${rows.length} batche`} tone="info" />
        <Stat icon="trending-up-outline" label="Rendiment mesatar" value={`${fmt(avg)}%`} sub={`dalje ${fmt(totalOut)} kg`} tone={avg >= 85 ? "ok" : "warn"} />
      </Kpis>
      {!!err && <ErrorBox message={err} onRetry={load} />}
      {loading && <Loading />}
      {canWrite && <Btn title="+ Batch i ri" icon="add" onPress={onNew} />}
      {!loading && rows.length === 0 ? (
        <Empty icon="cog-outline" title="Asnjë përpunim" text="Regjistroni çdo grumbull që thahet, pastrohet ose klasifikohet; rendimenti llogaritet vetë." action={canWrite ? <Btn title="Shto batch-in e parë" onPress={onNew} /> : null} />
      ) : rows.map((b) => (
        <Card key={b.batch_id} onLongPress={() => canDel && Alert.alert("Fshi batch-in?", b.code, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("batches").delete().eq("id", b.batch_id); load(); } }])}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.infoSoft }]}><Ionicons name="cog-outline" size={17} color={C.info} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{b.code} · {LABEL[b.method] || b.method}</Text>
              <Text style={s.mute} numberOfLines={1}>{dFull(b.date)}{b.product ? ` · ${b.product}` : ""}{b.source_lot ? ` · loti ${b.source_lot}` : ""}</Text>
            </View>
            <Chip label={`${fmt(b.yield_pct)}%`} tone={b.yield_pct >= 85 ? "ok" : "warn"} />
          </View>
          <Text style={[s.mute, { marginTop: 6 }]}>{fmt(b.input_qty)} kg → {fmt(b.output_qty)} kg{b.warehouse ? ` · ${b.warehouse}` : ""}</Text>
          {!!b.note && <Text style={[s.mute, { marginTop: 3 }]}>{b.note}</Text>}
        </Card>
      ))}
    </ScrollView>
  );
}
