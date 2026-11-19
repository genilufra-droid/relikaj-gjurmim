// Parcelat me gjeotagim (GPS) — si Cropin SmartFarm.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity, Linking } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num } from "./ui";

const GROWING = [["field", "Fushë e hapur"], ["greenhouse", "Serë"]];
const IRRIG = [["none", "Pa ujitje"], ["drip", "Pika-pika"], ["sprinkler", "Spërkatje"], ["furrow", "Brazda"]];

export function PlotForm({ cid, onDone }) {
  const [f, setF] = useState({ name: "", code: "", zone: null, farmer: null, area: "", lat: "", lng: "", soil: "", growing: "field", irrigation: "none", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) { setErr("Shkruani emrin e parcelës"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("plots").insert({
      company_id: cid, name: f.name.trim(), code: f.code.trim(), zone_id: f.zone, farmer_id: f.farmer,
      area_ha: num(f.area), lat: f.lat ? num(f.lat) : null, lng: f.lng ? num(f.lng) : null,
      soil_type: f.soil, growing: f.growing, irrigation: f.irrigation, note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Parcelë e re</Text>
      <Field label="Emri i parcelës" value={f.name} onChangeText={set("name")} />
      <Field label="Kodi (p.sh. K01)" value={f.code} onChangeText={set("code")} autoCapitalize="characters" />
      <Lookup title="Zona" cid={cid} cfg={LOOKUPS.zone} value={f.zone} onChange={set("zone")} />
      <Lookup title="Fermeri përgjegjës" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
      <Field label="Sipërfaqja (hektarë)" value={f.area} onChangeText={set("area")} keyboardType="decimal-pad" />
      <Field label="Gjerësia (lat, p.sh. 41.1234567)" value={f.lat} onChangeText={set("lat")} keyboardType="decimal-pad" />
      <Field label="Gjatësia (lng, p.sh. 19.7654321)" value={f.lng} onChangeText={set("lng")} keyboardType="decimal-pad" />
      <Field label="Lloji i tokës" value={f.soil} onChangeText={set("soil")} />
      <Text style={s.label}>Lloji</Text>
      {GROWING.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("growing")(k)} style={[s.input, { marginBottom: 6 }, f.growing === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.growing === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Text style={s.label}>Ujitja</Text>
      {IRRIG.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("irrigation")(k)} style={[s.input, { marginBottom: 6 }, f.irrigation === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.irrigation === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Plots({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("plot_summary").select("*").eq("company_id", cid).order("name");
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const canWrite = role !== "fermer";
  const del = (r) => Alert.alert("Fshi parcelën?", r.name, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("plots").delete().eq("id", r.plot_id); load(); } }]);
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.plot_id)} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Parcelat</Text>{canWrite && <Btn title="+ Parcelë e re" onPress={onNew} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
        ListEmptyComponent={<Text style={s.mute}>Asnjë parcelë ende.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={[s.card, { marginTop: 10 }]} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
            <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.code ? `${r.code} · ` : ""}{r.name}</Text><Text style={s.mute}>{fmt(r.area_ha)} ha</Text></View>
            <Text style={s.mute}>{r.growing === "greenhouse" ? "Serë" : "Fushë"} · {r.irrigation}{!!r.farmer ? ` · ${r.farmer}` : ""}</Text>
            <Text style={{ color: C.text }}>{r.cultivations} kultivime · {r.tasks_open} detyra të hapura · {r.observations_open} vëzhgime · {fmt(r.inputs_cost)} lekë inpute</Text>
            {!!r.lat && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`)}>
                <Text style={{ color: C.green, marginTop: 4 }}>📍 {r.lat}, {r.lng} — hap në hartë</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
