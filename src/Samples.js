// Protokolli i mostrave: marrja në parcelë ose në qendër, laboratori, lagështia, pastërtia dhe vendimi.
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, fmt, today, dFull, Kpis } from "./ui";

const POINTS = [["plot", "Në parcelë"], ["center", "Në qendër"], ["warehouse", "Në magazinë"]];
const POINT = Object.fromEntries(POINTS);

export function SampleForm({ cid, onDone }) {
  const [f, setF] = useState({ date: today(), point: "plot", customer: null, plot: null, product_text: "", code: "", tracking: "", lab: "", moisture: "", purity: "", passed: null, comment: "", result: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    setBusy(true); setErr("");
    let shipment_id = null;
    const tn = f.tracking.trim();
    if (tn) {   // gjej dërgesën me këtë numër ose krijoje
      const { data: ex } = await sb.from("shipments").select("id").eq("company_id", cid).eq("tracking_no", tn).maybeSingle();
      if (ex) shipment_id = ex.id;
      else {
        const { data, error } = await sb.from("shipments").insert({ company_id: cid, tracking_no: tn, ship_date: f.date, customer_id: f.customer }).select("id").single();
        if (error) { setBusy(false); setErr("Dërgesa nuk u ruajt: " + error.message); return; }
        shipment_id = data.id;
      }
    }
    const { error } = await sb.from("samples").insert({
      company_id: cid, date: f.date, customer_id: f.customer, product_text: f.product_text, code: f.code.trim(),
      shipment_id, comment: f.comment, result: f.result, point: f.point, plot_id: f.point === "plot" ? f.plot : null,
      lab: f.lab, moisture: f.moisture === "" ? null : Number(String(f.moisture).replace(",", ".")),
      purity: f.purity === "" ? null : Number(String(f.purity).replace(",", ".")), passed: f.passed,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Mostër e re</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Mostra merret direkt në parcelë ose në qendër, para dorëzimit te klienti.</Text>
      <Field label="Data e marrjes (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Vendi i marrjes</Text>
      <Segmented options={POINTS} value={f.point} onChange={set("point")} />
      {f.point === "plot" && <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />}
      <Lookup title="Klienti (opsional)" cid={cid} cfg={LOOKUPS.customer} value={f.customer} onChange={set("customer")} />
      <Field label="Produkti (emri si në protokoll)" value={f.product_text} onChangeText={set("product_text")} />
      <Field label="Kodi i lotit (p.sh. W010F/1a-I-115-26)" value={f.code} onChangeText={set("code")} autoCapitalize="characters" />
      <Field label="Laboratori" value={f.lab} onChangeText={set("lab")} placeholder="AlbInspekt / BioInspecta" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Lagështia (%)" value={f.moisture} onChangeText={set("moisture")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Pastërtia (%)" value={f.purity} onChangeText={set("purity")} keyboardType="decimal-pad" /></View>
      </View>
      <Text style={s.label}>Vendimi i laboratorit</Text>
      <Segmented options={[["wait", "Në pritje"], ["ok", "Kaluar"], ["no", "Refuzuar"]]} value={f.passed === true ? "ok" : f.passed === false ? "no" : "wait"} onChange={(v) => set("passed")(v === "wait" ? null : v === "ok")} />
      <Field label="Tracking number (dorëzimi)" value={f.tracking} onChangeText={set("tracking")} />
      <Field label="Koment" value={f.comment} onChangeText={set("comment")} multiline />
      <Field label="Rezultate analizash" value={f.result} onChangeText={set("result")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj mostrën" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Samples({ cid, onNew, role }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState(""), [loading, setLoading] = useState(true), [q, setQ] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from("samples")
      .select("id,date,product_text,code,comment,result,point,lab,moisture,purity,passed,customers(name),shipments(tracking_no),plots(name,code)")
      .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const needle = q.trim().toLowerCase();
  const list = rows.filter((r) => !needle || `${r.product_text} ${r.code} ${r.lab || ""} ${r.customers?.name || ""}`.toLowerCase().includes(needle));
  const passed = rows.filter((r) => r.passed === true).length;
  const failed = rows.filter((r) => r.passed === false).length;

  return (
    <FlatList
      style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]} data={list} keyExtractor={(r) => String(r.id)}
      onRefresh={load} refreshing={loading}
      ListHeaderComponent={
        <View>
          <Text style={s.h1}>Mostrat</Text>
          <Text style={[s.sub, { marginTop: 2 }]}>Marrje në parcelë ose qendër, me laborator dhe vendim.</Text>
          <Kpis style={{ marginTop: 12 }}>
            <Stat icon="checkmark-done-outline" label="Kaluar" value={`${passed}`} sub={`nga ${rows.length} mostra`} tone="ok" />
            <Stat icon="close-circle-outline" label="Refuzuar" value={`${failed}`} sub="kërkojnë veprim" tone={failed ? "danger" : "info"} />
          </Kpis>
          <SearchBar value={q} onChange={setQ} placeholder="Kod loti, produkt ose laborator…" />
          {!!err && <ErrorBox message={err} onRetry={load} />}
          {canWrite && <Btn title="+ Mostër e re" icon="add" onPress={onNew} />}
          {loading && rows.length === 0 && <Loading />}
        </View>
      }
      ListEmptyComponent={!loading ? (
        <Empty icon="flask-outline" title={q ? "Asnjë rezultat" : "Asnjë mostër"} text={q ? "Provo një kod tjetër." : "Regjistroni mostrën e parë: vendin e marrjes, laboratorin dhe rezultatet."} action={canWrite ? <Btn title="Shto mostër" onPress={onNew} /> : null} />
      ) : null}
      renderItem={({ item: r }) => (
        <Card>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: r.passed === false ? C.dangerSoft : C.okSoft }]}>
              <Ionicons name="flask-outline" size={17} color={r.passed === false ? C.red : C.ok} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{r.product_text || r.code}</Text>
              <Text style={s.mute} numberOfLines={1}>{POINT[r.point] || "—"} · {dFull(r.date)}{r.lab ? ` · ${r.lab}` : ""}</Text>
            </View>
            <Chip label={r.passed === true ? "Kaluar" : r.passed === false ? "Refuzuar" : "Në pritje"} tone={r.passed === true ? "ok" : r.passed === false ? "danger" : "warn"} />
          </View>
          <ChipRow style={{ marginTop: 8 }}>
            {!!r.code && <Chip label={r.code} icon="barcode-outline" />}
            {!!r.plots && <Chip label={r.plots.code || r.plots.name} icon="map-outline" />}
            {r.moisture != null && <Chip label={`Lagështi ${fmt(r.moisture)}%`} tone="info" />}
            {r.purity != null && <Chip label={`Pastërti ${fmt(r.purity)}%`} tone="info" />}
            {!!r.customers?.name && <Chip label={r.customers.name} />}
          </ChipRow>
          {!!r.result && <Text style={[s.mute, { marginTop: 6 }]} numberOfLines={3}>Rezultat: {r.result}</Text>}
        </Card>
      )}
    />
  );
}
