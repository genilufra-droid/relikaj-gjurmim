// Inputet: shpenzimet e parcelës — farë, plehra, trajtime, karburant, krah pune.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, FAB, fmt, num, money, today, dShort } from "./ui";

const CATS = [["seed", "Farë", "flower-outline"], ["fert", "Plehra", "nutrition-outline"], ["pest", "Trajtime", "shield-outline"],
  ["water", "Ujitje/energji", "water-outline"], ["fuel", "Karburant", "flame-outline"], ["labor", "Krah pune", "people-outline"],
  ["machinery", "Makineri", "construct-outline"], ["other", "Të tjera", "ellipsis-horizontal"]];

export function InputForm({ cid, onDone }) {
  const [f, setF] = useState({ plot: null, date: today(), category: "other", description: "", qty: "", unit: "", amount: "", supplier: "", lot: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    if (!f.description.trim()) { setErr("Shkruani përshkrimin"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("inputs").insert({
      company_id: cid, plot_id: f.plot, date: f.date, category: f.category, description: f.description.trim(),
      qty: num(f.qty), unit: f.unit, amount: num(f.amount), supplier: f.supplier, lot_code: f.lot.trim(),
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Input i ri</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Regjistroni shpenzimet për të ditur koston reale për parcelë dhe hektar.</Text>

      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Field label="Data" value={f.date} onChangeText={set("date")} placeholder="2026-11-19" />

      <Text style={s.label}>Lloji</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CATS.map(([k, t, icon]) => (
          <TouchableOpacity key={k} onPress={() => set("category")(k)} style={[s.chip, { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: f.category === k ? C.brand : "#fff", borderWidth: 1, borderColor: f.category === k ? C.brand : C.line }]} activeOpacity={0.85}>
            <Ionicons name={icon} size={13} color={f.category === k ? "#fff" : C.sub} />
            <Text style={[s.chipT, { color: f.category === k ? "#fff" : C.sub }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Përshkrimi" value={f.description} onChangeText={set("description")} placeholder="P.sh. Pleh NPK 15-15-15" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Sasia" value={f.qty} onChangeText={set("qty")} keyboardType="decimal-pad" placeholder="50" /></View>
        <View style={{ flex: 1 }}><Field label="Njësia" value={f.unit} onChangeText={set("unit")} placeholder="kg / L / orë" /></View>
      </View>
      <Field label="Shuma (lekë)" value={f.amount} onChangeText={set("amount")} keyboardType="decimal-pad" placeholder="12500" />
      <Field label="Furnizuesi" value={f.supplier} onChangeText={set("supplier")} placeholder="P.sh. AgroVlorë" />
      <Field label="Kodi i lotit (për gjurmueshmëri)" value={f.lot} onChangeText={set("lot")} autoCapitalize="characters" />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj inputin" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Inputs({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("inputs")
      .select("id,date,category,description,qty,unit,amount,supplier,plots(name)")
      .eq("company_id", cid).order("date", { ascending: false }).limit(300);
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const year = new Date().getFullYear();
  const yearTotal = rows.filter((r) => String(r.date).startsWith(String(year))).reduce((a, r) => a + Number(r.amount || 0), 0);
  const del = (r) => Alert.alert("Fshi inputin?", r.description, [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("inputs").delete().eq("id", r.id); load(); } },
  ]);

  const list = rows.filter((r) => (cat === "all" || r.category === cat) && (!q.trim() || `${r.description} ${r.plots?.name || ""} ${r.supplier || ""}`.toLowerCase().includes(q.trim().toLowerCase())));
  const shown = list.reduce((a, r) => a + Number(r.amount || 0), 0);

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
                <Text style={s.h1}>Inputet</Text>
                <Text style={s.mute}>{rows.length} shpenzime të regjistruara</Text>
              </View>
            </View>

            <View style={[s.kpiGrid, { marginTop: 12 }]}>
              <Stat icon="cash-outline" label={`Kosto ${year}`} value={money(yearTotal)} sub="inpute të vitit" tone="info" />
              <Stat icon="pricetag-outline" label="Të shfaqura" value={money(shown)} sub={`${list.length} regjistrime`} />
            </View>

            <SearchBar value={q} onChange={setQ} placeholder="Kërko input ose furnizues…" />
            <View style={{ marginTop: 10 }}>
              <Segmented options={[["all", "Të gjitha"], ...CATS.map(([k, t]) => [k, t])]} value={cat} onChange={setCat} />
            </View>
            {!!err && <ErrorBox message={"Inputet nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="nutrition-outline"
            title={q || cat !== "all" ? "Asnjë rezultat" : "Ende pa inpute"}
            text={q || cat !== "all" ? "Provo një filtër tjetër." : "Regjistroni plehrat, trajtimet, farën dhe krahun e punës për të ditur koston e vërtetë të çdo parcelë."}
            action={<Btn title="Input i ri" icon="add" onPress={onNew} />}
          />
        )}
        renderItem={({ item: r }) => {
          const c = CATS.find((x) => x[0] === r.category) || CATS[CATS.length - 1];
          return (
            <Card onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                  <Ionicons name={c[2]} size={18} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{r.description}</Text>
                  <Text style={s.mute} numberOfLines={1}>
                    {c[1]}{r.plots?.name ? ` · ${r.plots.name}` : ""}{r.supplier ? ` · ${r.supplier}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "800", color: C.ink }}>{money(r.amount)}</Text>
                  <Text style={s.mute}>{dShort(r.date)}</Text>
                </View>
              </View>
              {!!Number(r.qty) && <Text style={[s.mute, { marginTop: 6 }]}>{fmt(r.qty)} {r.unit}</Text>}
            </Card>
          );
        }}
      />
      <FAB label="Input" onPress={onNew} />
    </View>
  );
}
