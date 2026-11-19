// Parcelat me gjeotagim: GPS, sipërfaqe, kultivime, kosto dhe hartë.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, FAB, money, fmt, num } from "./ui";

const GROWING = [["field", "Fushë e hapur", "leaf-outline"], ["greenhouse", "Serë", "home-outline"]];
const IRRIG = [["none", "Pa ujitje"], ["drip", "Pika-pika"], ["sprinkler", "Spërkatje"], ["furrow", "Brazda"]];

export function PlotForm({ cid, onDone }) {
  const [f, setF] = useState({ name: "", code: "", zone: null, farmer: null, area: "", lat: "", lng: "", soil: "", growing: "field", irrigation: "none", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [gps, setGps] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const useGps = async () => {
    setGps(true); setErr("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setErr("Leja për vendndodhje u refuzua. Lejojeni te Cilësimet → Aplikacione → BioBes Farm."); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setF((o) => ({ ...o, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) }));
    } catch (e) {
      setErr("GPS nuk u lexua: " + (e?.message || "provoni jashtë ndërtesës"));
    } finally { setGps(false); }
  };

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
      <Text style={[s.sub, { marginTop: 2 }]}>Regjistroni tokën me koordinata, sipërfaqe dhe fermerin përgjegjës.</Text>

      <Field label="Emri i parcelës" value={f.name} onChangeText={set("name")} placeholder="P.sh. Parcela te ura e vjetër" />
      <Field label="Kodi" value={f.code} onChangeText={set("code")} autoCapitalize="characters" placeholder="K01" />
      <Lookup title="Zona" cid={cid} cfg={LOOKUPS.zone} value={f.zone} onChange={set("zone")} />
      <Lookup title="Fermeri përgjegjës" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
      <Field label="Sipërfaqja (hektarë)" value={f.area} onChangeText={set("area")} keyboardType="decimal-pad" placeholder="1,5" />

      <Text style={s.label}>Gjeotagim</Text>
      <Btn title={gps ? "Po lexohet GPS…" : "Merr koordinatat e mia"} icon="navigate-outline" alt busy={gps} onPress={useGps} />
      <Field label="Gjerësia (lat)" value={f.lat} onChangeText={set("lat")} keyboardType="decimal-pad" placeholder="41.3235000" />
      <Field label="Gjatësia (lng)" value={f.lng} onChangeText={set("lng")} keyboardType="decimal-pad" placeholder="19.4412000" />
      {!!f.lat && !!f.lng && (
        <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`)} style={{ marginTop: 8 }}>
          <Text style={{ color: C.brand, fontWeight: "700" }}>Shiko në hartë →</Text>
        </TouchableOpacity>
      )}

      <Field label="Lloji i tokës" value={f.soil} onChangeText={set("soil")} placeholder="P.sh. argjilore, ranore" />

      <Text style={s.label}>Sistemi i kultivimit</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {GROWING.map(([k, t, icon]) => (
          <TouchableOpacity key={k} onPress={() => set("growing")(k)} style={[s.card, { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderColor: f.growing === k ? C.brand : C.line, backgroundColor: f.growing === k ? C.brandSoft : C.surface }]} activeOpacity={0.85}>
            <Ionicons name={icon} size={20} color={f.growing === k ? C.brand : C.mute} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: f.growing === k ? C.brand : C.sub }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Ujitja</Text>
      <Segmented options={IRRIG} value={f.irrigation} onChange={set("irrigation")} />

      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline placeholder="Çdo detaj i rëndësishëm për këtë tokë" />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj parcelën" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Plots({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("plot_summary").select("*").eq("company_id", cid).order("name");
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const canDelete = role === "admin" || role === "staf";
  const del = (r) => Alert.alert("Fshi parcelën?", r.name, [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("plots").delete().eq("id", r.plot_id); load(); } },
  ]);

  const list = rows.filter((r) =>
    (filter === "all" || r.growing === filter) &&
    (!q.trim() || `${r.name} ${r.code || ""} ${r.farmer || ""}`.toLowerCase().includes(q.trim().toLowerCase())));

  const totalHa = rows.reduce((a, r) => a + Number(r.area_ha || 0), 0);
  const totalCost = rows.reduce((a, r) => a + Number(r.inputs_cost || 0), 0);

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={[s.pad, { paddingBottom: 96 }]}
        data={list}
        keyExtractor={(r) => String(r.plot_id)}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <View style={s.pageTitle}>
              <View>
                <Text style={s.h1}>Parcelat</Text>
                <Text style={s.mute}>{rows.length} parcela · {fmt(totalHa)} ha</Text>
              </View>
              {!!rows.length && <Chip label={`${money(totalCost)} kosto`} tone="info" icon="cash-outline" />}
            </View>

            {rows.length > 0 && (
              <View style={[s.kpiGrid, { marginTop: 12 }]}>
                <Stat icon="resize-outline" label="Sipërfaqe totale" value={`${fmt(totalHa)} ha`} sub={`${rows.length} parcela`} />
                <Stat icon="leaf-outline" label="Kultivime" value={rows.reduce((a, r) => a + Number(r.cultivations || 0), 0)} sub="aktive" tone="ok" />
              </View>
            )}

            <SearchBar value={q} onChange={setQ} placeholder="Kërko parcelë ose fermer…" />
            <View style={{ marginTop: 10 }}>
              <Segmented options={[["all", "Të gjitha"], ["field", "Fushë"], ["greenhouse", "Serë"]]} value={filter} onChange={setFilter} />
            </View>

            {!!err && <ErrorBox message={"Parcelat nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading text="Po ngarkohen parcelat…" />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="map-outline"
            title={q || filter !== "all" ? "Asnjë rezultat" : "Ende pa parcela"}
            text={q || filter !== "all"
              ? "Provo një emër tjetër ose hiq filtrin."
              : "Regjistroni parcelën e parë: emri, sipërfaqja dhe koordinatat GPS. Më pas lidhni kultivimet, detyrat dhe inputet."}
            action={canWrite ? <Btn title="Shto parcelë" icon="add" onPress={onNew} /> : null}
          />
        )}
        renderItem={({ item: r }) => {
          const costPerHa = r.area_ha > 0 ? Number(r.inputs_cost) / Number(r.area_ha) : 0;
          return (
            <Card onLongPress={() => canDelete && del(r)} style={{ marginTop: 2 }}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                  <Ionicons name={r.growing === "greenhouse" ? "home-outline" : "leaf-outline"} size={19} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.ink, fontSize: 15.5 }} numberOfLines={1}>
                    {r.code ? `${r.code} · ` : ""}{r.name}
                  </Text>
                  <Text style={s.mute} numberOfLines={1}>
                    {fmt(r.area_ha)} ha{r.farmer ? ` · ${r.farmer}` : " · pa fermer"}
                  </Text>
                </View>
                {!!r.lat && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`)}
                    hitSlop={8} style={{ padding: 4 }}
                  >
                    <Ionicons name="location" size={20} color={C.leaf} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                <Chip label={`${r.cultivations} kultivime`} icon="leaf-outline" />
                <Chip label={`${r.tasks_open} detyra`} icon="checkbox-outline" tone={r.tasks_open ? "warn" : "neutral"} />
                <Chip label={`${r.observations_open} vëzhgime`} icon="bug-outline" tone={r.observations_open ? "warn" : "neutral"} />
                {Number(r.inputs_cost) > 0 && <Chip label={`${money(r.inputs_cost)}${costPerHa ? ` · ${money(costPerHa)}/ha` : ""}`} icon="cash-outline" tone="info" />}
              </View>
            </Card>
          );
        }}
      />
      {canWrite && <FAB label="Parcelë" onPress={onNew} />}
    </View>
  );
}
