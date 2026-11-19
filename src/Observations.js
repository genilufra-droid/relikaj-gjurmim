// Vëzhgimet në fushë: dëmtues, sëmundje, barëra — me foto nga kamera dhe këshillë.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, FAB, dShort, today } from "./ui";
import { pickPhotoFromCamera, uploadToBucket } from "./uploads";

const KINDS = [["pest", "Dëmtues", "bug-outline"], ["disease", "Sëmundje", "medkit-outline"], ["weed", "Barëra", "leaf-outline"],
  ["stress", "Stres", "water-outline"], ["damage", "Dëmtim", "thunderstorm-outline"], ["other", "Tjetër", "ellipsis-horizontal"]];
const SEV = [[1, "Ulët", C.ok], [2, "Mesatar", C.warn], [3, "I lartë", C.red]];

export function ObservationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), kind: "pest", severity: 1, description: "", photo: "", advice: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [shooting, setShooting] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const snap = async () => {
    setShooting(true); setErr("");
    try {
      const picked = await pickPhotoFromCamera();
      if (!picked) return;
      const up = await uploadToBucket("field-photos", picked.uri, picked.mime, picked.name);
      setF((o) => ({ ...o, photo: up.url }));
    } catch (e) {
      setErr(e?.message || "Fotografia dështoi");
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
      <Text style={[s.sub, { marginTop: 2 }]}>Regjistroni çfarë shihni në fushë, me foto — për gjurmim dhe këshillë.</Text>

      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data" value={f.date} onChangeText={set("date")} placeholder="2026-11-19" />

      <Text style={s.label}>Problemi</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {KINDS.map(([k, t, icon]) => (
          <TouchableOpacity key={k} onPress={() => set("kind")(k)} style={[s.chip, { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: f.kind === k ? C.brand : "#fff", borderWidth: 1, borderColor: f.kind === k ? C.brand : C.line }]} activeOpacity={0.85}>
            <Ionicons name={icon} size={13} color={f.kind === k ? "#fff" : C.sub} />
            <Text style={[s.chipT, { color: f.kind === k ? "#fff" : C.sub }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Ashpërsia</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {SEV.map(([k, t, c]) => (
          <TouchableOpacity key={k} onPress={() => set("severity")(k)} style={[s.card, { flex: 1, alignItems: "center", paddingVertical: 12, borderColor: f.severity === k ? c : C.line, backgroundColor: f.severity === k ? "#fff" : C.surface }]} activeOpacity={0.85}>
            <View style={{ flexDirection: "row", gap: 3, marginBottom: 5 }}>
              {[1, 2, 3].map((i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: i <= k ? c : C.line }} />)}
            </View>
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: f.severity === k ? c : C.sub }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Përshkrimi" value={f.description} onChangeText={set("description")} multiline placeholder="Çfarë vini re? Sa pjesë e parcelës është prekur?" />

      <Text style={s.label}>Foto</Text>
      {f.photo ? (
        <Card style={{ padding: 8 }}>
          <Image source={{ uri: f.photo }} style={{ width: "100%", height: 190, borderRadius: 12, backgroundColor: C.surfaceAlt }} resizeMode="cover" />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Btn title="Foto tjetër" alt icon="camera-outline" busy={shooting} onPress={snap} />
          </View>
        </Card>
      ) : (
        <Btn title={shooting ? "Po ngarkohet…" : "Bëj foto me kamera"} icon="camera-outline" alt busy={shooting} onPress={snap} />
      )}

      <Field label="Këshilla / trajtimi" value={f.advice} onChangeText={set("advice")} multiline placeholder="P.sh. spërkatje me sapun kaliumi, përsërit pas 7 ditësh" />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj vëzhgimin" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Observations({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("observations")
      .select("id,date,kind,severity,description,advice,photo_url,resolved,plots(name)")
      .eq("company_id", cid).order("date", { ascending: false }).limit(200);
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (r) => { await sb.from("observations").update({ resolved: !r.resolved }).eq("id", r.id); load(); };
  const del = (r) => Alert.alert("Fshi vëzhgimin?", "", [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("observations").delete().eq("id", r.id); load(); } },
  ]);

  const openRows = rows.filter((r) => !r.resolved);
  const list = (filter === "open" ? openRows : filter === "resolved" ? rows.filter((r) => r.resolved) : rows)
    .filter((r) => !q.trim() || `${r.plots?.name || ""} ${r.description || ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={[s.pad, { paddingBottom: 96 }]}
        data={list}
        keyExtractor={(r) => String(r.id)}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <View style={s.pageTitle}>
              <View>
                <Text style={s.h1}>Vëzhgimet</Text>
                <Text style={s.mute}>{openRows.length} të hapura · {rows.length} gjithsej</Text>
              </View>
            </View>

            <View style={[s.kpiGrid, { marginTop: 12 }]}>
              <Stat icon="bug-outline" label="Të hapura" value={openRows.length} sub="për t'u zgjidhur" tone={openRows.length ? "warn" : "ok"} />
              <Stat icon="warning-outline" label="Me ashpërsi të lartë" value={openRows.filter((r) => r.severity >= 3).length} sub="ndërhyrje e shpejtë" tone={openRows.some((r) => r.severity >= 3) ? "danger" : "brand"} />
            </View>

            <SearchBar value={q} onChange={setQ} placeholder="Kërko parcelë ose përshkrim…" />
            <View style={{ marginTop: 10 }}>
              <Segmented options={[["open", "Të hapura"], ["resolved", "Të zgjidhura"], ["all", "Të gjitha"]]} value={filter} onChange={setFilter} />
            </View>
            {!!err && <ErrorBox message={"Vëzhgimet nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="bug-outline"
            title={q ? "Asnjë rezultat" : filter === "open" ? "Asnjë vëzhgim i hapur" : "Asnjë vëzhgim"}
            text={q ? "Provo një fjalë tjetër." : "Kur shihni dëmtues, sëmundje ose dëmtime, regjistroni me foto — ndihmon për vendime dhe për klientët."}
            action={<Btn title="Vëzhgim i ri" icon="add" onPress={onNew} />}
          />
        )}
        renderItem={({ item: r }) => {
          const kind = KINDS.find((x) => x[0] === r.kind) || KINDS[KINDS.length - 1];
          const sev = SEV.find((x) => x[0] === r.severity) || SEV[0];
          return (
            <Card onLongPress={() => (role === "admin" || role === "staf") && del(r)} style={{ opacity: r.resolved ? 0.65 : 1 }}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: r.severity >= 3 ? C.dangerSoft : C.warnSoft }]}>
                  <Ionicons name={kind[2]} size={19} color={r.severity >= 3 ? C.red : C.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.ink, fontSize: 15 }}>{kind[1]}</Text>
                  <Text style={s.mute} numberOfLines={1}>{r.plots?.name || "Pa parcelë"} · {dShort(r.date)}</Text>
                </View>
                <Chip label={sev[1]} tone={r.severity >= 3 ? "danger" : r.severity === 2 ? "warn" : "ok"} />
              </View>

              {!!r.description && <Text style={{ color: C.text, marginTop: 9, lineHeight: 20 }}>{r.description}</Text>}
              {!!r.advice && (
                <View style={{ flexDirection: "row", gap: 7, marginTop: 8 }}>
                  <Ionicons name="bulb-outline" size={15} color={C.info} />
                  <Text style={[s.mute, { flex: 1 }]}>{r.advice}</Text>
                </View>
              )}
              {!!r.photo_url && <Image source={{ uri: r.photo_url }} style={{ width: "100%", height: 150, borderRadius: 12, marginTop: 10, backgroundColor: C.surfaceAlt }} resizeMode="cover" />}

              <TouchableOpacity onPress={() => resolve(r)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11 }} activeOpacity={0.8}>
                <Ionicons name={r.resolved ? "refresh-outline" : "checkmark-circle-outline"} size={16} color={r.resolved ? C.mute : C.ok} />
                <Text style={{ color: r.resolved ? C.mute : C.ok, fontWeight: "700", fontSize: 13 }}>{r.resolved ? "Rihap vëzhgimin" : "Shëno si të zgjidhur"}</Text>
              </TouchableOpacity>
            </Card>
          );
        }}
      />
      <FAB label="Vëzhgim" onPress={onNew} />
    </View>
  );
}
