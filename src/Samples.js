// Protokolli i mostrave: klienti, produkti, kodi i gjurmueshmërisë, nr. i dërgesës, rezultatet.
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, today } from "./ui";

export function SampleForm({ cid, onDone }) {
  const [f, setF] = useState({ date: today(), customer: null, product_text: "", code: "", tracking: "", comment: "", result: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.customer) { setErr("Zgjidhni klientin"); return; }
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
      shipment_id, comment: f.comment, result: f.result,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Mostër e re</Text>
      <Field label="Data e marrjes (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Lookup title="Klienti" cid={cid} cfg={LOOKUPS.customer} value={f.customer} onChange={set("customer")} />
      <Field label="Produkti (emri si në protokoll)" value={f.product_text} onChangeText={set("product_text")} />
      <Field label="Kodi (p.sh. B1K100/2-II-109-25)" value={f.code} onChangeText={set("code")} autoCapitalize="characters" />
      <Field label="Tracking number" value={f.tracking} onChangeText={set("tracking")} />
      <Field label="Koment" value={f.comment} onChangeText={set("comment")} multiline />
      <Field label="Rezultate analizash" value={f.result} onChangeText={set("result")} multiline />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Samples({ cid, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("samples")
      .select("id,date,product_text,code,comment,result,customers(name),shipments(tracking_no)")
      .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  return (
    <FlatList style={s.screen} contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.id)} onRefresh={load} refreshing={false}
      ListHeaderComponent={<View><Text style={s.h1}>Protokolli i mostrave</Text><Btn title="+ Mostër e re" onPress={onNew} />{!!err && <Text style={s.err}>{err}</Text>}</View>}
      ListEmptyComponent={<Text style={s.mute}>Asnjë mostër ende.</Text>}
      renderItem={({ item: r }) => (
        <View style={[s.card, { marginTop: 10 }]}>
          <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.customers?.name}</Text><Text style={s.mute}>{r.date}</Text></View>
          <Text style={{ color: C.text }}>{r.product_text} · {r.code}</Text>
          {!!r.shipments && <Text style={s.mute}>Tracking {r.shipments.tracking_no}</Text>}
          {!!r.result && <Text style={s.mute}>Rezultat: {r.result}</Text>}
        </View>
      )} />
  );
}
