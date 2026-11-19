// Kultivimet: ciklet e mbjelljes dhe vjeljes për çdo parcelë.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, FAB, fmt, num, dShort, dueLabel, ChipRow } from "./ui";

const STAGES = [["planned", "E planifikuar", C.info], ["growing", "Në rritje", C.ok], ["harvest", "Vjelje", C.warn], ["done", "Mbaruar", C.mute]];

export function CultivationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, product: null, variety: "", sowing: "", expected: "", stage: "planned", yieldKg: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    if (!f.plot) { setErr("Zgjidhni parcelën"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("cultivations").insert({
      company_id: cid, plot_id: f.plot, product_id: f.product, variety: f.variety,
      sowing_date: f.sowing || null, expected_harvest: f.expected || null, stage: f.stage,
      expected_yield_kg: num(f.yieldKg), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Kultivim i ri</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Një cikël mbjelljeje në një parcelë: produkti, data dhe rendimenti i pritshëm.</Text>

      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={f.product} onChange={set("product")} />
      <Field label="Varieteti" value={f.variety} onChangeText={set("variety")} placeholder="P.sh. Polka, Heritage" />
      <Field label="Data e mbjelljes" value={f.sowing} onChangeText={set("sowing")} placeholder="2026-03-01" />
      <Field label="Vjelja e pritshme" value={f.expected} onChangeText={set("expected")} placeholder="2026-06-15" />

      <Text style={s.label}>Faza</Text>
      <Segmented options={STAGES.map(([k, t]) => [k, t])} value={f.stage} onChange={set("stage")} />

      <Field label="Rendimenti i pritshëm (kg)" value={f.yieldKg} onChangeText={set("yieldKg")} keyboardType="decimal-pad" placeholder="1500" />
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj kultivimin" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Cultivations({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("cultivations")
      .select("id,stage,sowing_date,expected_harvest,expected_yield_kg,variety,active,plots(name),products(name)")
      .eq("company_id", cid).order("sowing_date", { ascending: false }).limit(200);
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const canDelete = role === "admin" || role === "staf";
  const del = (r) => Alert.alert("Fshi kultivimin?", "", [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("cultivations").delete().eq("id", r.id); load(); } },
  ]);

  const list = rows.filter((r) => {
    const active = r.stage !== "done";
    if (filter === "active" && !active) return false;
    if (filter === "done" && active) return false;
    if (filter === "harvest" && r.stage !== "harvest") return false;
    if (!q.trim()) return true;
    return `${r.plots?.name || ""} ${r.products?.name || ""} ${r.variety || ""}`.toLowerCase().includes(q.trim().toLowerCase());
  });

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
                <Text style={s.h1}>Kultivimet</Text>
                <Text style={s.mute}>{rows.filter((r) => r.stage !== "done").length} aktive · {rows.length} gjithsej</Text>
              </View>
            </View>
            <SearchBar value={q} onChange={setQ} placeholder="Kërko parcelë ose produkt…" />
            <View style={{ marginTop: 10 }}>
              <Segmented options={[["active", "Aktive"], ["harvest", "Vjelje"], ["done", "Mbaruar"], ["all", "Të gjitha"]]} value={filter} onChange={setFilter} />
            </View>
            {!!err && <ErrorBox message={"Kultivimet nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="leaf-outline"
            title={q || filter !== "active" ? "Asnjë rezultat" : "Ende pa kultivime"}
            text={q || filter !== "active"
              ? "Provo një kërkim tjetër ose ndrysho filtrin."
              : "Hapni ciklin e parë: zgjidhni parcelën, produktin dhe datën e mbjelljes për të ndjekur rendimentin dhe kostot."}
            action={canWrite ? <Btn title="Kultivim i ri" icon="add" onPress={onNew} /> : null}
          />
        )}
        renderItem={({ item: r }) => {
          const st = STAGES.find((x) => x[0] === r.stage) || STAGES[0];
          const prog = r.stage === "planned" ? 0.1 : r.stage === "growing" ? 0.5 : r.stage === "harvest" ? 0.85 : 1;
          return (
            <Card onLongPress={() => canDelete && del(r)}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                  <Ionicons name="leaf-outline" size={19} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.ink, fontSize: 15.5 }} numberOfLines={1}>
                    {r.products?.name || "Pa produkt"}{r.variety ? ` · ${r.variety}` : ""}
                  </Text>
                  <Text style={s.mute} numberOfLines={1}>{r.plots?.name || "Pa parcelë"}</Text>
                </View>
                <Chip label={st[1]} tone={r.stage === "done" ? "neutral" : r.stage === "harvest" ? "warn" : "ok"} />
              </View>

              <View style={{ height: 6, borderRadius: 99, backgroundColor: C.surfaceAlt, marginTop: 12, overflow: "hidden" }}>
                <View style={{ height: 6, width: `${prog * 100}%`, backgroundColor: st[2], borderRadius: 99 }} />
              </View>

              <ChipRow style={{ marginTop: 10 }}>
                {!!r.sowing_date && <Chip label={`Mbjellë ${dShort(r.sowing_date)}`} icon="calendar-outline" />}
                {!!r.expected_harvest && <Chip label={`Vjelje ${dShort(r.expected_harvest)}`} icon="basket-outline" tone="info" />}
                {!!Number(r.expected_yield_kg) && <Chip label={`${fmt(r.expected_yield_kg)} kg`} icon="scale-outline" tone="ok" />}
                {!!r.expected_harvest && r.stage !== "done" && <Chip label={dueLabel(r.expected_harvest)} tone={dueLabel(r.expected_harvest).includes("vonë") ? "danger" : "neutral"} />}
              </ChipRow>
            </Card>
          );
        }}
      />
      {canWrite && <FAB label="Kultivim" onPress={onNew} />}
    </View>
  );
}
