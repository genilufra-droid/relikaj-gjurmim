// Blerjet (korrjet) nga fermerët: lidhja me parcelën, kultivimin dhe kodi i lotit për gjurmueshmëri.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, Card, Chip, ChipRow, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, fmt, money, num, today, dFull, Kpis } from "./ui";

const CUTS = ["I", "II", "III"];

export function PurchaseForm({ cid, onDone }) {
  const [f, setF] = useState({ date: today(), farmer: null, zone: null, product: null, plot: null, cut: "I", fresh: "", dry: "", price: "", paid: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const [pcode, setPcode] = useState(null);

  const save = async () => {
    if (!f.farmer || !f.zone || !f.product) { setErr("Zgjidhni fermerin, zonën dhe produktin"); return; }
    if (!pcode) { setErr("Produkti duhet të ketë kod (p.sh. shkruani «115 Mjedër» kur e shtoni)"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("purchases").insert({
      company_id: cid, date: f.date, farmer_id: f.farmer, zone_id: f.zone, product_id: f.product, plot_id: f.plot, cut: f.cut,
      qty_fresh: num(f.fresh), qty_dry: num(f.dry), price: num(f.price), paid: num(f.paid), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Blerje e re</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Regjistroni marrjen e mallit nga fermeri; kodi i lotit krijohet vetë.</Text>
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Lookup title="Fermeri" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
      <Lookup
        title="Parcela (për gjurmueshmëri)"
        cid={cid}
        cfg={LOOKUPS.plot}
        value={f.plot}
        onChange={(id, row) => {
          setF((o) => ({ ...o, plot: id, farmer: row?.farmer_id || o.farmer, zone: row?.zone_id || o.zone }));
        }}
      />
      <Lookup title="Zona e grumbullimit" cid={cid} cfg={LOOKUPS.zone} value={f.zone} onChange={set("zone")} />
      <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={(id, row) => { set("product")(id); setPcode(row?.code || ""); }} />
      <Text style={s.label}>Korrja</Text>
      <Segmented options={CUTS.map((c) => [c, `Klasa ${c}`])} value={f.cut} onChange={set("cut")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Sasia e njomë (kg)" value={f.fresh} onChangeText={set("fresh")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Sasia e thatë (kg)" value={f.dry} onChangeText={set("dry")} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="Çmimi (lekë/kg)" value={f.price} onChangeText={set("price")} keyboardType="decimal-pad" />
      <Text style={s.mute}>Shuma: {money(num(f.dry) * num(f.price))}</Text>
      <Field label="Paguar (lekë)" value={f.paid} onChangeText={set("paid")} keyboardType="decimal-pad" />
      <Field label="Shënim" value={f.note} onChangeText={set("note")} />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj blerjen" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Purchases({ cid, role, onNew, onPrint }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState(""), [loading, setLoading] = useState(true), [q, setQ] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from("purchases")
      .select("id,date,lot_code,qty_fresh,qty_dry,amount,paid,farmers(first_name,last_name),products(name),plots(name,code),zones(code,collector_name)")
      .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const canDel = role === "admin" || role === "staf";
  const del = (r) => Alert.alert("Fshi blerjen?", r.lot_code, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("purchases").delete().eq("id", r.id); load(); } }]);

  const needle = q.trim().toLowerCase();
  const list = rows.filter((r) => !needle || `${r.lot_code} ${r.farmers ? r.farmers.first_name + " " + r.farmers.last_name : ""} ${r.products?.name || ""} ${r.plots?.name || ""} ${r.zones?.collector_name || ""}`.toLowerCase().includes(needle));
  const kg = rows.reduce((a, r) => a + Number(r.qty_dry || 0), 0);
  const val = rows.reduce((a, r) => a + Number(r.amount || 0), 0);

  return (
    <FlatList
      style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]} data={list} keyExtractor={(r) => String(r.id)}
      onRefresh={load} refreshing={loading}
      ListHeaderComponent={
        <View>
          <Text style={s.h1}>Blerjet</Text>
          <Text style={[s.sub, { marginTop: 2 }]}>Marrjet nga fermerët, me parcelë dhe grumbullues.</Text>
          <Kpis style={{ marginTop: 12 }}>
            <Stat icon="scale-outline" label="Sasi e thatë" value={`${fmt(kg)} kg`} sub={`${rows.length} blerje`} />
            <Stat icon="cash-outline" label="Vlera" value={money(val)} sub={`paguar ${money(rows.reduce((a, r) => a + Number(r.paid || 0), 0))}`} tone="ok" />
          </Kpis>
          <SearchBar value={q} onChange={setQ} placeholder="Lot, fermer, produkt ose grumbullues…" />
          {!!err && <ErrorBox message={err} onRetry={load} />}
          {canWrite && <Btn title="+ Blerje e re" icon="add" onPress={onNew} />}
          {!!onPrint && <Btn title="Fatura dhe fletë hyrje" icon="print-outline" alt onPress={onPrint} />}
          {loading && rows.length === 0 && <Loading />}
        </View>
      }
      ListEmptyComponent={!loading ? (
        <Empty icon="basket-outline" title={q ? "Asnjë rezultat" : "Asnjë blerje"} text={q ? "Provo një emër tjetër." : "Regjistroni blerjen e parë: fermeri, parcela, produkti dhe sasitë."} action={canWrite ? <Btn title="Shto blerje" onPress={onNew} /> : null} />
      ) : null}
      renderItem={({ item: r }) => (
        <Card onLongPress={() => canDel && del(r)}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="barcode-outline" size={17} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{r.lot_code}</Text>
              <Text style={s.mute} numberOfLines={1}>
                {r.farmers ? `${r.farmers.first_name} ${r.farmers.last_name}` : "Pa fermer"} · {r.products?.name}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontWeight: "800", color: C.text }}>{fmt(r.qty_dry)} kg</Text>
              <Text style={s.mute}>{dFull(r.date).slice(0, 5)}</Text>
            </View>
          </View>
          <ChipRow style={{ marginTop: 8 }}>
            {!!r.plots && <Chip label={r.plots.code || r.plots.name} icon="map-outline" />}
            {!!r.zones?.collector_name && <Chip label={r.zones.collector_name} icon="people-outline" tone="info" />}
            <Chip label={money(r.amount)} tone="ok" />
          </ChipRow>
        </Card>
      )}
    />
  );
}
