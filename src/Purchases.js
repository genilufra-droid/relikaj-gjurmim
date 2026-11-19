import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num, today } from "./ui";
import { downloadReport } from "./reports";

const CUTS = ["I", "II", "III"];

export function PurchaseForm({ cid, onDone }) {
  const [f, setF] = useState({ date: today(), farmer: null, zone: null, product: null, cut: "I", fresh: "", dry: "", price: "", paid: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const [pcode, setPcode] = useState(null);
  const save = async () => {
    if (!f.farmer || !f.zone || !f.product) { setErr("Zgjidhni fermerin, zonën dhe produktin"); return; }
    if (!pcode) { setErr("Produkti duhet të ketë kod (p.sh. shkruani «115 Mjedër» kur e shtoni)"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("purchases").insert({
      company_id: cid, date: f.date, farmer_id: f.farmer, zone_id: f.zone, product_id: f.product, cut: f.cut,
      qty_fresh: num(f.fresh), qty_dry: num(f.dry), price: num(f.price), paid: num(f.paid), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Blerje e re</Text>
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Lookup title="Fermeri" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
      <Lookup title="Zona" cid={cid} cfg={LOOKUPS.zone} value={f.zone} onChange={set("zone")} />
      <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={(id, row) => { set("product")(id); setPcode(row?.code || ""); }} />
      <Text style={s.label}>Korrja</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {CUTS.map((c) => (
          <TouchableOpacity key={c} onPress={() => set("cut")(c)} style={[s.input, { flex: 1, alignItems: "center" }, f.cut === c && { backgroundColor: C.green }]}>
            <Text style={{ color: f.cut === c ? "#fff" : C.text, fontWeight: "700" }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Sasia e njomë (kg)" value={f.fresh} onChangeText={set("fresh")} keyboardType="decimal-pad" />
      <Field label="Sasia e thatë (kg)" value={f.dry} onChangeText={set("dry")} keyboardType="decimal-pad" />
      <Field label="Çmimi (lekë/kg)" value={f.price} onChangeText={set("price")} keyboardType="decimal-pad" />
      <Text style={s.mute}>Shuma: {fmt(num(f.dry) * num(f.price))} lekë</Text>
      <Field label="Paguar" value={f.paid} onChangeText={set("paid")} keyboardType="decimal-pad" />
      <Field label="Shënim" value={f.note} onChangeText={set("note")} />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Purchases({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("purchases")
      .select("id,date,lot_code,qty_dry,amount,paid,farmers(first_name,last_name),products(name)")
      .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const canWrite = role !== "fermer";
  const del = (r) => Alert.alert("Fshi blerjen?", r.lot_code, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("purchases").delete().eq("id", r.id); load(); } }]);
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.id)} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Blerjet</Text>{canWrite && <Btn title="+ Blerje e re" onPress={onNew} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
        ListEmptyComponent={<Text style={s.mute}>Asnjë blerje ende.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={[s.card, { marginTop: 10 }]} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
            <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.lot_code}</Text><Text style={s.mute}>{r.date}</Text></View>
            <Text style={{ color: C.text }}>{r.farmers?.first_name} {r.farmers?.last_name} · {r.products?.name}</Text>
            <Text style={s.mute}>Thatë {fmt(r.qty_dry)} kg · {fmt(r.amount)} lekë · paguar {fmt(r.paid)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
