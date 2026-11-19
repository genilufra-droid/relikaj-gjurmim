// Zonat e grumbullimit: grumbulluesi, pika e grumbullimit, parcelat dhe fermerët e zonës.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Stat, SectionTitle, fmt, money } from "./ui";

export function ZoneForm({ cid, zone, onDone }) {
  const [f, setF] = useState({
    code: zone?.code || "", name: zone?.name || "", collector: zone?.collector_name || "",
    point: zone?.collection_point || "", region: zone?.region || "", fair: !!zone?.fair_wild, note: zone?.note || "",
  });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    if (!f.code.trim()) { setErr("Shkruani kodin e zonës (p.sh. W010F/1a)"); return; }
    setBusy(true); setErr("");
    const payload = {
      code: f.code.trim(), name: f.name.trim(), collector_name: f.collector.trim(),
      collection_point: f.point.trim(), region: f.region.trim(), fair_wild: !!f.fair, note: f.note,
    };
    const { error } = zone
      ? await sb.from("zones").update(payload).eq("id", zone.id)
      : await sb.from("zones").insert({ company_id: cid, ...payload });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{zone ? "Ndrysho zonën" : "Zonë e re"}</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Grumbulluesi mbulon deri në 50 parcela; zona lidh parcelat me të.</Text>
      <Field label="Kodi i zonës" value={f.code} onChangeText={set("code")} autoCapitalize="characters" placeholder="W010F/1a" />
      <Field label="Emri i zonës" value={f.name} onChangeText={set("name")} placeholder="Tepelenë – luginë" />
      <Field label="Grumbulluesi" value={f.collector} onChangeText={set("collector")} placeholder="Emër Mbiemër" />
      <Field label="Pika e grumbullimit" value={f.point} onChangeText={set("point")} placeholder="Pika Tepelenë" />
      <Field label="Rajoni" value={f.region} onChangeText={set("region")} placeholder="Tepelenë" />
      <TouchableOpacity onPress={() => set("fair")(!f.fair)} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]} activeOpacity={0.85}>
        <Ionicons name={f.fair ? "checkbox" : "square-outline"} size={22} color={f.fair ? C.ok : C.mute} />
        <Text style={{ color: C.text, flex: 1 }}>Zonë me vjelje të egër (Fair Wild)</Text>
      </TouchableOpacity>
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj zonën" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Zones({ cid, role, onNew, onEdit }) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [err, setErr] = useState(""), [q, setQ] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("zone_summary").select("*").eq("company_id", cid).order("code");
    setErr(error ? "Zonat nuk u ngarkuan" : ""); setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const needle = q.trim().toLowerCase();
  const list = rows.filter((z) => !needle || `${z.code} ${z.name || ""} ${z.collector_name || ""} ${z.collection_point || ""}`.toLowerCase().includes(needle));
  const totalPlots = rows.reduce((a, z) => a + Number(z.plots || 0), 0);
  const totalKg = rows.reduce((a, z) => a + Number(z.dry_year || 0), 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Zonat dhe grumbulluesit</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Kush mbulon cilat parcela dhe sa grumbullohet në secilën zonë.</Text>
      <View style={[s.kpiGrid, { marginTop: 12 }]}>
        <Stat icon="people-outline" label="Grumbullues" value={`${rows.length}`} sub={`${totalPlots} parcela`} />
        <Stat icon="scale-outline" label="Grumbulluar (viti)" value={`${fmt(totalKg)} kg`} sub="thatë" tone="ok" />
      </View>
      <SearchBar value={q} onChange={setQ} placeholder="Zonë, grumbullues ose pikë…" />
      {!!err && <ErrorBox message={err} onRetry={load} />}
      {loading && <Loading />}
      {canWrite && <Btn title="+ Zonë e re" icon="add" onPress={onNew} />}
      {!loading && list.length === 0 ? (
        <Empty icon="people-outline" title="Asnjë zonë" text="Krijoni zonat e grumbullimit dhe caktoni grumbulluesin e secilës." action={canWrite ? <Btn title="Shto zonën e parë" onPress={onNew} /> : null} />
      ) : list.map((z) => (
        <Card key={z.zone_id} onPress={() => canWrite && onEdit(z)}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="people-outline" size={17} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{z.code}{z.name ? ` · ${z.name}` : ""}</Text>
              <Text style={s.mute} numberOfLines={1}>{z.collector_name || "Pa grumbullues"}{z.collection_point ? ` · ${z.collection_point}` : ""}{z.region ? ` · ${z.region}` : ""}</Text>
            </View>
            {!!z.fair_wild && <Chip label="Fair Wild" tone="ok" />}
          </View>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 9, flexWrap: "wrap" }}>
            <Text style={s.mute}>{z.plots} parcela</Text>
            <Text style={s.mute}>{z.farmers} fermerë</Text>
            <Text style={s.mute}>{fmt(z.area_ha)} ha</Text>
            <Text style={[s.mute, { color: C.text, fontWeight: "700" }]}>{fmt(z.dry_year)} kg / {money(z.amount_year)}</Text>
          </View>
        </Card>
      ))}
      {canWrite && rows.length > 0 && (
        <View>
          <SectionTitle>Si funksionon</SectionTitle>
          <Text style={s.mute}>Grumbulluesi regjistron marrjen e mallit nga fermerët e zonës; secila blerje krijon një kod loti që lidh parcelën, fermerin dhe grumbulluesin me eksportin.</Text>
        </View>
      )}
    </ScrollView>
  );
}
