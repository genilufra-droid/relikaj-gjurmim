// Kartela e parcelës në telefon: profili, historiku, korrjet, kostot — dhe raporti me një klik.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, ChipRow, Empty, ErrorBox, Kpis, Loading, SectionTitle, Stat, fmt, money, dFull, dShort } from "./ui";
import { downloadReport } from "./reports";

const OWN = { owned: "Në pronësi", leased: "Me qira", wild: "E egër / djerr" };
const STATUS = { active: "Aktive", fallow: "Djerr", resting: "Në pushim" };
const KIND = { punim: ["construct-outline", C.info], trajtim: ["water-outline", C.ok], input: ["nutrition-outline", C.brand], "vëzhgim": ["bug-outline", C.warn], "detyrë": ["checkbox-outline", C.mute] };

export default function PlotDetail({ cid, plotId, onGo, onBack }) {
  const [plot, setPlot] = useState(null);
  const [acts, setActs] = useState([]), [harv, setHarv] = useState([]), [docs, setDocs] = useState(0);
  const [loading, setLoading] = useState(true), [err, setErr] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [p, a, h, d] = await Promise.all([
      sb.from("plots").select("id,name,code,area_ha,ownership,status,altitude,organic,lat,lng,farmers(first_name,last_name),zones(code,collector_name,collection_point)").eq("id", plotId).maybeSingle(),
      sb.from("plot_activity").select("date,kind,detail,who,amount,note").eq("company_id", cid).eq("plot_id", plotId).order("date", { ascending: false }).limit(120),
      sb.from("purchases").select("id,date,lot_code,qty_fresh,qty_dry,amount").eq("company_id", cid).eq("plot_id", plotId).order("date", { ascending: false }).limit(60),
      sb.from("documents").select("id,plot_id").eq("company_id", cid),
    ]);
    if (p.error) { setErr(p.error.message); setLoading(false); return; }
    setPlot(p.data); setActs(a.data || []); setHarv(h.data || []); setDocs((d.data || []).filter((x) => x.plot_id === plotId).length);
    setLoading(false);
  }, [cid, plotId]);
  useEffect(() => { load(); }, [load]);

  const rep = (format) => async () => {
    setBusy(format); setMsg("");
    try { const path = await downloadReport({ company_id: cid, type: "plot", format, plot_id: plotId }); setMsg(`U krijua: ${String(path).split("/").pop()}`); }
    catch (e) { setMsg(e.message || "Raporti nuk u krijua"); }
    setBusy("");
  };

  if (loading) return <Loading />;
  if (err) return <ErrorBox message={"Parcela nuk u lexua: " + err} onRetry={load} />;
  if (!plot) return <Empty icon="map-outline" title="Parcela nuk u gjet" text="Kthehu te lista e parcelave." />;

  const cost = acts.reduce((a, r) => a + Number(r.amount || 0), 0);
  const kgDry = harv.reduce((a, h) => a + Number(h.qty_dry || 0), 0);
  const value = harv.reduce((a, h) => a + Number(h.amount || 0), 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.mute}>{plot.zones?.code ? `Zona ${plot.zones.code}` : "Pa zonë"}</Text>
      <Text style={s.h1}>{plot.code ? `${plot.code} · ` : ""}{plot.name}</Text>
      <ChipRow style={{ marginTop: 8 }}>
        <Chip label={OWN[plot.ownership] || "—"} icon="key-outline" tone={plot.ownership === "leased" ? "warn" : "brand"} />
        <Chip label={STATUS[plot.status] || "—"} tone={plot.status === "active" ? "ok" : "warn"} />
        {!!plot.area_ha && <Chip label={`${fmt(plot.area_ha)} ha`} icon="resize-outline" />}
        {plot.organic && <Chip label="Organike" icon="leaf-outline" tone="ok" />}
        {!!docs && <Chip label={`${docs} dokumente`} icon="document-text-outline" />}
      </ChipRow>

      <Kpis style={{ marginTop: 12 }}>
        <Stat icon="cash-outline" label="Kosto e regjistruar" value={money(cost)} sub={`${acts.length} aktivitete`} tone="warn" />
        <Stat icon="scale-outline" label="Korrje totale" value={`${fmt(kgDry)} kg`} sub={`${harv.length} dorëzime`} tone="ok" />
      </Kpis>

      <Card>
        <View style={s.listRow}>
          <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="person-outline" size={17} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: C.ink }}>{plot.farmers ? `${plot.farmers.first_name} ${plot.farmers.last_name}` : "Pa fermer"}</Text>
            <Text style={s.mute} numberOfLines={1}>
              {plot.zones?.collector_name ? `Grumbulluesi ${plot.zones.collector_name}` : "Pa grumbullues"}
              {plot.zones?.collection_point ? ` · ${plot.zones.collection_point}` : ""}
            </Text>
          </View>
          {!!plot.lat && (
            <TouchableOpacity onPress={() => onGo && onGo("gjurmimi")} hitSlop={8}>
              <Ionicons name="navigate-circle-outline" size={24} color={C.leaf} />
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TouchableOpacity onPress={rep("pdf")} disabled={!!busy} activeOpacity={0.85}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.brand }}>
          <Ionicons name="document-text-outline" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13.5 }}>{busy === "pdf" ? "…" : "Raport parcelë"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={rep("xlsx")} disabled={!!busy} activeOpacity={0.85}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
          <Ionicons name="grid-outline" size={16} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: "800", fontSize: 13.5 }}>{busy === "xlsx" ? "…" : "Excel"}</Text>
        </TouchableOpacity>
      </View>
      {!!msg && <Text style={[s.mute, { marginTop: 8 }]}>{msg}</Text>}

      <SectionTitle right={<TouchableOpacity onPress={() => onGo && onGo("gjurmimi")}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Historiku</Text></TouchableOpacity>}>Korrjet</SectionTitle>
      {harv.length === 0 ? (
        <Card><Text style={s.mute}>Asnjë dorëzim ende. Korrjet regjistrohen te «Blerjet» me këtë parcelë.</Text></Card>
      ) : harv.map((h) => (
        <Card key={h.id}>
          <View style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.text }} numberOfLines={1}>{h.lot_code}</Text>
              <Text style={s.mute}>{dFull(h.date)} · njomë {fmt(h.qty_fresh)} kg · thatë {fmt(h.qty_dry)} kg</Text>
            </View>
            <Text style={{ fontWeight: "800", color: C.text }}>{money(h.amount)}</Text>
          </View>
        </Card>
      ))}

      <SectionTitle>Historiku i aktiviteteve</SectionTitle>
      {acts.length === 0 ? (
        <Empty icon="time-outline" title="Asnjë aktivitet" text="Punimet, trajtimet, inputet, vëzhgimet dhe detyrat shfaqen këtu sipas datës." />
      ) : acts.map((r, i) => {
        const [icon, color] = KIND[r.kind] || ["ellipse-outline", C.mute];
        return (
          <Card key={`${r.kind}-${i}`}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: C.surfaceAlt }]}><Ionicons name={icon} size={16} color={color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={2}>{r.detail || r.kind}</Text>
                <Text style={s.mute} numberOfLines={2}>{dShort(r.date)}{r.who ? ` · ${r.who}` : ""}{r.note ? ` · ${r.note}` : ""}</Text>
              </View>
              {Number(r.amount) > 0 && <Text style={{ fontWeight: "700", color: C.text }}>{money(r.amount)}</Text>}
            </View>
          </Card>
        );
      })}

      <Text style={[s.mute, { marginTop: 16, textAlign: "center" }]}>Vlera e korrjeve: {money(value)}</Text>
      {!!onBack && <Btn title="Kthehu te parcelat" alt onPress={onBack} />}
    </ScrollView>
  );
}
