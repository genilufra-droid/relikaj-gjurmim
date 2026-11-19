// Vëzhgimet në fushë: dëmtues, sëmundje, barëra — me foto dhe këshillë eksperti.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, today } from "./ui";

const KINDS = [["pest", "Dëmtues"], ["disease", "Sëmundje"], ["weed", "Barëra të këqija"], ["stress", "Mungesë uji/ushqimi"], ["damage", "Dëmtim nga moti"], ["other", "Tjetër"]];
const SEV = [[1, "Ulët"], [2, "Mesatar"], [3, "I lartë"]];

export function ObservationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), kind: "pest", severity: 1, description: "", photo: "", advice: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [shooting, setShooting] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  // Foto nga kamera → Storage «field-photos»; nëse ngarkimi dështon, mbetet URL-ja me dorë
  const snap = async () => {
    setShooting(true); setErr("");
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setErr("Leja për kamerë u refuzua."); return; }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const path = `${cid}/${Date.now()}.jpg`;
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: `${Date.now()}.jpg`, type: "image/jpeg" });
      const { error } = await sb.storage.from("field-photos").upload(path, form, { contentType: "image/jpeg" });
      if (error) { setErr("Foto u bë, por ngarkimi dështoi: " + error.message); return; }
      const { data } = sb.storage.from("field-photos").getPublicUrl(path);
      setF((o) => ({ ...o, photo: data.publicUrl }));
    } catch (e) {
      setErr("Fotografia dështoi: " + (e?.message || "provoni përsëri"));
    } finally { setShooting(false); }
  };
  const save = async () => {
    if (!f.plot) { setErr("Zgjidhni parcelën"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("observations").insert({
      company_id: cid, plot_id: f.plot, date: f.date, kind: f.kind, severity: f.severity,
      description: f.description, photo_url: f.photo, advice: f.advice,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Vëzhgim i ri</Text>
      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Problemi</Text>
      {KINDS.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("kind")(k)} style={[s.input, { marginBottom: 6 }, f.kind === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.kind === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Text style={s.label}>Ashpërsia</Text>
      {SEV.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("severity")(k)} style={[s.input, { marginBottom: 6 }, f.severity === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.severity === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Përshkrimi" value={f.description} onChangeText={set("description")} multiline />
      <Btn title="📷 Bëj foto me kamera" alt busy={shooting} onPress={snap} />
      <Field label="Foto (URL, nga Storage «field-photos»)" value={f.photo} onChangeText={set("photo")} placeholder="https://…" />
      {!!f.photo && <Text style={{ color: C.green }}>Foto e bashkangjitur ✓</Text>}
      <Field label="Këshilla e ekspertit" value={f.advice} onChangeText={set("advice")} multiline />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Observations({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("observations")
      .select("id,date,kind,severity,description,advice,resolved,plots(name)")
      .eq("company_id", cid).order("date", { ascending: false }).limit(100);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const resolve = async (r) => { await sb.from("observations").update({ resolved: !r.resolved }).eq("id", r.id); load(); };
  const del = (r) => Alert.alert("Fshi vëzhgimin?", "", [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("observations").delete().eq("id", r.id); load(); } }]);
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => String(r.id)} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Vëzhgimet</Text><Btn title="+ Vëzhgim i ri" onPress={onNew} />{!!err && <Text style={s.err}>{err}</Text>}</View>}
        ListEmptyComponent={<Text style={s.mute}>Asnjë vëzhgim ende. Shënoni dëmtuesit, sëmundjet dhe problemet që shihni në fushë.</Text>}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={[s.card, { marginTop: 10, opacity: r.resolved ? 0.6 : 1 }]} onPress={() => resolve(r)} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
            <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{r.kind}</Text><Text style={{ color: r.severity >= 3 ? C.red : C.mute }}>{r.date}</Text></View>
            <Text style={s.mute}>Ashpërsia {r.severity}/3{!!r.plots ? ` · ${r.plots.name}` : ""}{r.resolved ? " · i zgjedhur" : ""}</Text>
            {!!r.description && <Text style={{ color: C.text }}>{r.description}</Text>}
            {!!r.advice && <Text style={s.mute}>Këshillë: {r.advice}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
