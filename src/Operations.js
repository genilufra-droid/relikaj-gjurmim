// Puna në tokë: punimet (plugim, frezim, lesë…) dhe trajtimet e bimëve (pleh, pesticid, ujitje…).
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, Segmented, Stat, SectionTitle, money, num, today, dFull, dShort, Kpis } from "./ui";

export const OP_KINDS = [["plow", "Plugim"], ["till", "Frezim"], ["harrow", "Lesë (disk)"], ["subsoil", "Mihje"], ["level", "Nivelim"], ["mow", "Kositje"], ["haul", "Transport"], ["other", "Tjetër"]];
export const APP_KINDS = [["fert", "Pleh"], ["pesticide", "Pesticid"], ["foliar", "Foliar"], ["irrigation", "Ujitje"], ["biological", "Biologjik"], ["other", "Tjetër"]];
const OP_LABEL = Object.fromEntries(OP_KINDS), APP_LABEL = Object.fromEntries(APP_KINDS);

function KindPicker({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
      {options.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => onChange(k)} style={[s.chip, { backgroundColor: value === k ? C.brand : C.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 }]} activeOpacity={0.85}>
          <Text style={[s.chipT, { color: value === k ? "#fff" : C.sub, fontWeight: "700" }]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function OperationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), kind: "plow", contractor: "", machine: "", hours: "", cost: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    if (!f.plot) { setErr("Zgjidhni parcelën"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("land_operations").insert({
      company_id: cid, plot_id: f.plot, date: f.date, kind: f.kind, contractor: f.contractor,
      machine: f.machine, hours: num(f.hours), cost: num(f.cost), note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Punim i ri</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Plugim, frezim, lesë, nivelim — me kosto dhe orë pune.</Text>
      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Lloji i punimit</Text>
      <KindPicker options={OP_KINDS} value={f.kind} onChange={set("kind")} />
      <Field label="Kontraktor / operator" value={f.contractor} onChangeText={set("contractor")} placeholder="P.sh. Traktor Ilir" />
      <Field label="Makina" value={f.machine} onChangeText={set("machine")} placeholder="Traktor 90 kf" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Orë pune" value={f.hours} onChangeText={set("hours")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Kosto (lekë)" value={f.cost} onChangeText={set("cost")} keyboardType="decimal-pad" /></View>
      </View>
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj punimin" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export function ApplicationForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), kind: "fert", product: "", dose: "", unit: "kg", area: "", phi: "", cost: "", organic: true, note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    if (!f.plot) { setErr("Zgjidhni parcelën"); return; }
    if (!f.product.trim()) { setErr("Shkruani produktin e përdorur"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("applications").insert({
      company_id: cid, plot_id: f.plot, date: f.date, kind: f.kind, product_name: f.product.trim(),
      dose: num(f.dose), unit: f.unit, area_ha: num(f.area),
      phi_days: f.phi === "" ? null : Math.round(num(f.phi)),
      cost: num(f.cost), organic_ok: !!f.organic, note: f.note,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Trajtim i ri</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Çdo ndërhyrje në bimë: pleh, pesticid, foliar, ujitje ose biologjik.</Text>
      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
      <Text style={s.label}>Lloji i trajtimit</Text>
      <KindPicker options={APP_KINDS} value={f.kind} onChange={set("kind")} />
      <Field label="Produkti" value={f.product} onChangeText={set("product")} placeholder="P.sh. Pleh organik 4-2-2" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Doza" value={f.dose} onChangeText={set("dose")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Njësia" value={f.unit} onChangeText={set("unit")} placeholder="kg / L" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Sipërfaqja (ha)" value={f.area} onChangeText={set("area")} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Pritje (ditë)" value={f.phi} onChangeText={set("phi")} keyboardType="number-pad" placeholder="para vjeljes" /></View>
      </View>
      <Field label="Kosto (lekë)" value={f.cost} onChangeText={set("cost")} keyboardType="decimal-pad" />
      <TouchableOpacity onPress={() => set("organic")(!f.organic)} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]} activeOpacity={0.85}>
        <Ionicons name={f.organic ? "checkbox" : "square-outline"} size={22} color={f.organic ? C.ok : C.mute} />
        <Text style={{ color: C.text, flex: 1 }}>I lejuar për prodhim organik</Text>
      </TouchableOpacity>
      <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj trajtimin" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Operations({ cid, role, part, onPart, onNew }) {
  const [ops, setOps] = useState([]), [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true), [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [o, a] = await Promise.all([
      sb.from("land_operations").select("id,date,kind,contractor,machine,hours,cost,note,plots(name,code)").eq("company_id", cid).order("date", { ascending: false }).limit(150),
      sb.from("applications").select("id,date,kind,product_name,dose,unit,phi_days,cost,organic_ok,note,plots(name,code)").eq("company_id", cid).order("date", { ascending: false }).limit(150),
    ]);
    setErr(o.error ? "Punimet nuk u ngarkuan" : a.error ? "Trajtimet nuk u ngarkuan" : "");
    setOps(o.data || []); setApps(a.data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const canWrite = role !== "fermer";
  const canDel = role === "admin" || role === "staf";
  const del = (table, id, what) => Alert.alert(`Fshi ${what}?`, "Ky veprim nuk kthehet.", [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from(table).delete().eq("id", id); load(); } },
  ]);

  const opsCost = ops.reduce((a, r) => a + Number(r.cost || 0), 0);
  const appsCost = apps.reduce((a, r) => a + Number(r.cost || 0), 0);
  const blocking = apps.filter((r) => r.phi_days > 0 && new Date(Date.now() - r.phi_days * 864e5).toISOString().slice(0, 10) < r.date);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Puna në tokë</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Punimet dhe trajtimet e çdo parcele, me kosto dhe afate pritjeje.</Text>

      <Kpis style={{ marginTop: 12 }}>
        <Stat icon="construct-outline" label="Punime" value={`${ops.length}`} sub={money(opsCost)} tone="info" />
        <Stat icon="water-outline" label="Trajtime" value={`${apps.length}`} sub={money(appsCost)} tone="ok" />
      </Kpis>

      <View style={{ marginTop: 14 }}>
        <Segmented options={[["punime", "Punimet"], ["trajtimet", "Trajtimet"]]} value={part} onChange={onPart} />
      </View>

      {!!err && <ErrorBox message={err} onRetry={load} />}
      {loading && <Loading />}
      {canWrite && <Btn title={part === "punime" ? "+ Punim i ri" : "+ Trajtim i ri"} icon="add" onPress={onNew} />}

      {!loading && part === "punime" && (
        ops.length === 0 ? (
          <Empty icon="construct-outline" title="Asnjë punim" text="Regjistroni plugimin, frezimin, nivelimin dhe transportin — kështu dihet kostoja reale e tokës." action={canWrite ? <Btn title="Shto punimin e parë" onPress={onNew} /> : null} />
        ) : ops.map((r) => (
          <Card key={r.id} onLongPress={() => canDel && del("land_operations", r.id, "punimin")}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: C.infoSoft }]}><Ionicons name="construct-outline" size={17} color={C.info} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{OP_LABEL[r.kind] || r.kind} · {r.plots?.name || "pa parcelë"}</Text>
                <Text style={s.mute} numberOfLines={1}>{dFull(r.date)}{r.contractor ? ` · ${r.contractor}` : ""}{r.hours ? ` · ${r.hours} orë` : ""}</Text>
              </View>
              <Text style={{ fontWeight: "800", color: C.text }}>{money(r.cost)}</Text>
            </View>
            {!!r.note && <Text style={[s.mute, { marginTop: 6 }]}>{r.note}</Text>}
          </Card>
        ))
      )}

      {!loading && part === "trajtimet" && (
        apps.length === 0 ? (
          <Empty icon="water-outline" title="Asnjë trajtim" text="Çdo pleh, spërkatje ose ujitje regjistrohet me dozë, kosto dhe afat pritjeje para vjeljes." action={canWrite ? <Btn title="Shto trajtimin e parë" onPress={onNew} /> : null} />
        ) : apps.map((r) => (
          <Card key={r.id} onLongPress={() => canDel && del("applications", r.id, "trajtimin")}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: r.organic_ok ? C.okSoft : C.warnSoft }]}>
                <Ionicons name="water-outline" size={17} color={r.organic_ok ? C.ok : C.warn} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{r.product_name || APP_LABEL[r.kind]}</Text>
                <Text style={s.mute} numberOfLines={1}>
                  {APP_LABEL[r.kind] || r.kind} · {r.plots?.name || "pa parcelë"} · {dShort(r.date)}
                  {r.dose ? ` · ${r.dose} ${r.unit || ""}` : ""}
                </Text>
              </View>
              <Text style={{ fontWeight: "800", color: C.text }}>{money(r.cost)}</Text>
            </View>
            <ChipRow style={{ marginTop: 8 }}>
              {!!r.organic_ok && <Chip label="Organik" tone="ok" icon="leaf-outline" />}
              {r.phi_days > 0 && <Chip label={`Pritje ${r.phi_days} ditë`} tone="info" icon="time-outline" />}
              {!r.organic_ok && <Chip label="Jo organik" tone="warn" icon="alert-circle-outline" />}
            </ChipRow>
          </Card>
        ))
      )}

      {!loading && blocking.length > 0 && (
        <View>
          <SectionTitle>Kujdes</SectionTitle>
          <Text style={s.mute}>{blocking.length} trajtim(e) ende brenda afatit të pritjes para vjeljes.</Text>
        </View>
      )}
    </ScrollView>
  );
}
