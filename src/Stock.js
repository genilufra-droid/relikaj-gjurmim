import React, { useCallback, useEffect, useState } from "react";
import { FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num, today } from "./ui";

const KINDS = [["dorezim", "Dorëzim te Biobes"], ["eksport", "Eksport"], ["fillestare", "Gjendje fillestare"], ["rregullim", "Rregullim"]];

export function StockForm({ cid, onDone }) {
  const [f, setF] = useState({ date: today(), kind: "dorezim", product: null, lot: "", qty: "", who: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const isIn = f.kind === "fillestare";
  const save = async () => {
    if (!f.product || !num(f.qty)) { setErr("Zgjidhni produktin dhe shkruani sasinë"); return; }
    setBusy(true); setErr("");
    let { data: wh } = await sb.from("warehouses").select("id").eq("company_id", cid).eq("active", true).order("id").limit(1);
    if (!wh?.length) {
      const r = await sb.from("warehouses").insert({ company_id: cid, name: "Magazina 1" }).select("id").single();
      wh = r.data ? [r.data] : [];
    }
    if (!wh.length) { setBusy(false); setErr("Magazina nuk u krijua"); return; }
    const q = num(f.qty);
    const { error } = await sb.from("stock_moves").insert({
      company_id: cid, date: f.date, warehouse_id: wh[0].id, product_id: f.product, lot_code: f.lot.trim(), kind: f.kind,
      qty_in: isIn ? q : 0, qty_out: isIn ? 0 : q, counterparty: f.who, note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Lëvizje magazine</Text>
      <Text style={s.label}>Lloji</Text>
      {KINDS.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("kind")(k)} style={[s.input, { marginBottom: 6 }, f.kind === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.kind === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={set("product")} />
      <Field label="Kodi i lotit (p.sh. W010F/1a-I-115-26)" value={f.lot} onChangeText={set("lot")} autoCapitalize="characters" />
      <Field label={isIn ? "Sasia hyrëse (kg)" : "Sasia dalëse (kg)"} value={f.qty} onChangeText={set("qty")} keyboardType="decimal-pad" />
      <Field label="Marrësi / shënim palës" value={f.who} onChangeText={set("who")} />
      <Field label="Shënim" value={f.note} onChangeText={set("note")} />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Stock({ cid, role, onNew, onPrint }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("lot_summary").select("*").eq("company_id", cid).order("lot_code");
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  return (
    <FlatList
      style={s.screen} contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => r.lot_code} onRefresh={load} refreshing={false}
      ListHeaderComponent={<View><Text style={s.h1}>Magazina sipas lotit</Text>{(role === "admin" || role === "staf" || role === "grumbullues") && <Btn title="+ Dorëzim / eksport / gjendje fillestare" onPress={onNew} />}
        {!!onPrint && <Btn title="Drafte dhe fletë dalje" icon="print-outline" alt onPress={onPrint} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
      ListEmptyComponent={<Text style={s.mute}>Asnjë lot ende.</Text>}
      renderItem={({ item: r }) => (
        <View style={[s.card, { marginTop: 10 }]}>
          <Text style={{ fontWeight: "700", color: C.text }}>{r.lot_code}</Text>
          <Text style={s.mute}>{r.product} · {r.zone} · korrja {r.cut}</Text>
          <Text style={{ color: C.text }}>Thatë {fmt(r.dry)} · në magazinë {fmt(r.stock)} · dorëzuar {fmt(r.delivered)} · eksport {fmt(r.exported)}</Text>
        </View>
      )}
    />
  );
}
