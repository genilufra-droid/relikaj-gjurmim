// Gjurmueshmëria: «nga cila parcelë, cili fermer, cili grumbullues erdhi ky produkt?»
// Zinxhiri: parcelë → fermer → grumbullues → dorëzim → përpunim → mostër → eksport.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, SectionTitle, Stat, fmt, money, dShort, dFull } from "./ui";

const POINT = { plot: "Në parcelë", center: "Në qendër", warehouse: "Në magazinë" };
const METHOD = { drying: "Tharje", cleaning: "Pastrim", cutting: "Prerje", grading: "Klasifikim", oil: "Nxjerrje vaji", packing: "Paketim", other: "Tjetër" };
const MOVE = { fillestare: "Gjendje fillestare", blerje: "Blerje", dorezim: "Dorëzim", eksport: "Eksport", rregullim: "Rregullim" };
const OWN = { owned: "Në pronësi", leased: "Me qira", wild: "E egër (djerr)" };
const STATUS = { active: "Aktive", fallow: "Djerr", resting: "Në pushim" };

function Row({ label, value, strong }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, gap: 12 }}>
      <Text style={s.mute} numberOfLines={1}>{label}</Text>
      <Text style={{ color: C.text, fontWeight: strong ? "800" : "600", flexShrink: 1, textAlign: "right" }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Answer({ lot }) {
  const parts = [];
  if (lot.plots) parts.push(`${lot.plots} ${Number(lot.plots) === 1 ? "parcelë" : "parcela"}`);
  if (lot.farmers) parts.push(`${lot.farmers} ${Number(lot.farmers) === 1 ? "fermer" : "fermerë"}`);
  return (
    <View style={[s.card, { backgroundColor: C.brandSoft, borderColor: C.brandSoft }]}>
      <View style={s.listRow}>
        <View style={[s.iconCircle, { backgroundColor: "#fff" }]}><Ionicons name="git-branch-outline" size={18} color={C.brand} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "900", color: C.brand, fontSize: 15 }}>{lot.product} · {lot.lot_code}</Text>
          <Text style={{ color: C.sub, marginTop: 3 }} numberOfLines={4}>
            Vjen nga {parts.join(" dhe ") || "pa parcelë të regjistruar"}
            {lot.collector ? `, grumbulluar nga ${lot.collector}` : ""}
            {lot.collection_point ? ` në ${lot.collection_point}` : ""}.
          </Text>
        </View>
      </View>
    </View>
  );
}

function LotView({ cid, code }) {
  const [d, setD] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      setD(null); setErr("");
      const [chain, plots, samp, batch, moves] = await Promise.all([
        sb.from("lot_chain").select("*").eq("company_id", cid).eq("lot_code", code).maybeSingle(),
        sb.from("lot_plots").select("*").eq("company_id", cid).eq("lot_code", code).order("dry", { ascending: false }),
        sb.from("samples").select("id,date,point,lab,moisture,purity,passed,result,customers(name)").eq("company_id", cid).eq("code", code).order("date"),
        sb.from("batch_summary").select("*").eq("company_id", cid).eq("source_lot", code).order("date"),
        sb.from("stock_moves").select("id,date,kind,qty_in,qty_out,counterparty,document_no,customers(name)").eq("company_id", cid).eq("lot_code", code).order("date"),
      ]);
      if (!live) return;
      if (chain.error) { setErr(chain.error.message); return; }
      setD({ chain: chain.data, plots: plots.data || [], samples: samp.data || [], batches: batch.data || [], moves: moves.data || [] });
    })();
    return () => { live = false; };
  }, [cid, code]);

  if (err) return <ErrorBox message={"Loti nuk u lexua: " + err} />;
  if (!d) return <Loading />;
  if (!d.chain) return <Empty icon="help-circle-outline" title="Loti nuk u gjet" text="Kontrolloni kodin e lotit (p.sh. W010F/1a-I-115-26)." />;

  const c = d.chain;
  return (
    <View>
      <Answer lot={c} />
      <View style={[s.kpiGrid, { marginTop: 10 }]}>
        <Stat icon="scale-outline" label="Sasi e njomë" value={`${fmt(c.fresh)} kg`} sub={`thatë ${fmt(c.dry)} kg`} />
        <Stat icon="pricetag-outline" label="Vlera" value={money(c.amount)} sub={`paguar ${money(c.paid)}`} tone="ok" />
      </View>

      <SectionTitle>Parcelat dhe fermerët</SectionTitle>
      {d.plots.length === 0 ? (
        <Empty icon="map-outline" title="Pa parcelë" text="Kjo blerje nuk është lidhur me parcelë. Lidheni te «Blerjet» për gjurmueshmëri të plotë." />
      ) : d.plots.map((p, i) => (
        <Card key={`${p.plot_id || "x"}-${i}`}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="map-outline" size={17} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{p.plot}{p.plot_code ? ` · ${p.plot_code}` : ""}</Text>
              <Text style={s.mute} numberOfLines={1}>{p.farmer || "Pa fermer"}{p.zone ? ` · zona ${p.zone}` : ""}</Text>
            </View>
            <Text style={{ fontWeight: "800", color: C.text }}>{fmt(p.dry)} kg</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Row label="Pronësia" value={OWN[p.ownership] || p.ownership} />
            <Row label="Statusi" value={STATUS[p.status] || p.status} />
            <Row label="Sipërfaqja" value={p.area_ha ? `${fmt(p.area_ha)} ha` : ""} />
            <Row label="Dorëzime" value={p.deliveries ? `${p.deliveries} · ${dShort(p.d_from)}–${dShort(p.d_to)}` : ""} />
            <Row label="Grumbulluesi" value={p.collector} />
          </View>
        </Card>
      ))}

      <SectionTitle>Mostrat</SectionTitle>
      {d.samples.length === 0 ? (
        <Empty icon="flask-outline" title="Asnjë mostër" text="Mostrat merren në parcelë ose në qendër; regjistrojini te «Mostra» me të njëjtin kod." />
      ) : d.samples.map((m) => (
        <Card key={m.id}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: m.passed === false ? C.dangerSoft : C.okSoft }]}>
              <Ionicons name="flask-outline" size={17} color={m.passed === false ? C.red : C.ok} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }}>{POINT[m.point] || m.point} · {dFull(m.date)}</Text>
              <Text style={s.mute} numberOfLines={1}>{m.lab || "Pa laborator"}{m.customers?.name ? ` · ${m.customers.name}` : ""}</Text>
            </View>
            <Chip label={m.passed === true ? "Kaluar" : m.passed === false ? "Refuzuar" : "Në pritje"} tone={m.passed === true ? "ok" : m.passed === false ? "danger" : "warn"} />
          </View>
          {(m.moisture != null || m.purity != null) && (
            <Text style={[s.mute, { marginTop: 6 }]}>
              {m.moisture != null ? `Lagështia ${fmt(m.moisture)}%` : ""}{m.moisture != null && m.purity != null ? " · " : ""}{m.purity != null ? `Pastërtia ${fmt(m.purity)}%` : ""}
            </Text>
          )}
          {!!m.result && <Text style={[s.mute, { marginTop: 3 }]}>Rezultat: {m.result}</Text>}
        </Card>
      ))}

      <SectionTitle>Përpunimi</SectionTitle>
      {d.batches.length === 0 ? (
        <Empty icon="cog-outline" title="Pa përpunim" text="Kur loti thahet, pastrohet ose klasifikohet, regjistroni batch-in te «Përpunimi»." />
      ) : d.batches.map((b) => (
        <Card key={b.batch_id}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.infoSoft }]}><Ionicons name="cog-outline" size={17} color={C.info} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }}>{b.code} · {METHOD[b.method] || b.method}</Text>
              <Text style={s.mute}>{dFull(b.date)} · {b.warehouse || "pa magazinë"}</Text>
            </View>
            <Chip label={`${fmt(b.yield_pct)}% rendiment`} tone={b.yield_pct >= 85 ? "ok" : "warn"} />
          </View>
          <Text style={[s.mute, { marginTop: 6 }]}>{fmt(b.input_qty)} kg → {fmt(b.output_qty)} kg</Text>
        </Card>
      ))}

      <SectionTitle>Dalja dhe klienti</SectionTitle>
      {d.moves.length === 0 ? (
        <Empty icon="cube-outline" title="Pa lëvizje magazine" text="Dorëzimet dhe eksportet regjistrohen te «Magazina» me të njëjtin lot." />
      ) : d.moves.map((m) => (
        <Card key={m.id}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="cube-outline" size={17} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }}>{MOVE[m.kind] || m.kind} · {dFull(m.date)}</Text>
              <Text style={s.mute} numberOfLines={1}>{m.customers?.name || m.counterparty || "—"}{m.document_no ? ` · dok. ${m.document_no}` : ""}</Text>
            </View>
            <Text style={{ fontWeight: "800", color: C.text }}>{fmt(m.qty_out || m.qty_in)} kg</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

function PlotView({ cid, plotId }) {
  const [plot, setPlot] = useState(null), [acts, setActs] = useState([]), [pcs, setPcs] = useState([]), [loading, setLoading] = useState(true), [err, setErr] = useState("");
  useEffect(() => {
    if (!plotId) return;
    let live = true;
    (async () => {
      setLoading(true); setErr("");
      const [p, a, b] = await Promise.all([
        sb.from("plots").select("id,name,code,area_ha,ownership,status,altitude,organic,farmers(first_name,last_name),zones(code,collector_name,collection_point)").eq("id", plotId).maybeSingle(),
        sb.from("plot_activity").select("*").eq("company_id", cid).eq("plot_id", plotId).order("date", { ascending: false }).limit(120),
        sb.from("purchases").select("id,date,lot_code,qty_fresh,qty_dry,amount").eq("company_id", cid).eq("plot_id", plotId).order("date", { ascending: false }).limit(40),
      ]);
      if (!live) return;
      if (p.error) { setErr(p.error.message); setLoading(false); return; }
      setPlot(p.data); setActs(a.data || []); setPcs(b.data || []); setLoading(false);
    })();
    return () => { live = false; };
  }, [cid, plotId]);

  if (!plotId) return <Empty icon="map-outline" title="Zgjidhni një parcelë" text="Shikoni historikun e plotë: punimet, trajtimet, inputet, vëzhgimet dhe korrjet." />;
  if (loading) return <Loading />;
  if (err) return <ErrorBox message={"Historiku nuk u lexua: " + err} />;

  const KIND = { punim: ["construct-outline", C.info], trajtim: ["water-outline", C.ok], input: ["nutrition-outline", C.brand], "vëzhgim": ["bug-outline", C.warn], "detyrë": ["checkbox-outline", C.mute] };
  const total = acts.reduce((a, r) => a + Number(r.amount || 0), 0);
  return (
    <View>
      <Answer lot={{ product: plot?.name, lot_code: plot?.code || "", plots: 1, farmers: plot?.farmers ? 1 : 0, collector: plot?.zones?.collector_name, collection_point: plot?.zones?.collection_point }} />
      <View style={[s.kpiGrid, { marginTop: 10 }]}>
        <Stat icon="resize-outline" label="Sipërfaqe" value={plot?.area_ha ? `${fmt(plot.area_ha)} ha` : "—"} sub={OWN[plot?.ownership] || ""} />
        <Stat icon="cash-outline" label="Kosto e regjistruar" value={money(total)} sub={`${acts.length} aktivitete`} tone="warn" />
      </View>
      <Card>
        <Row label="Fermeri" value={plot?.farmers ? `${plot.farmers.first_name} ${plot.farmers.last_name}` : ""} strong />
        <Row label="Grumbulluesi i zonës" value={plot?.zones?.collector_name} />
        <Row label="Pika e grumbullimit" value={plot?.zones?.collection_point} />
        <Row label="Statusi" value={STATUS[plot?.status] || ""} />
        <Row label="Lartësia" value={plot?.altitude ? `${plot.altitude} m` : ""} />
        <Row label="Organike" value={plot?.organic ? "Po" : "Jo"} />
      </Card>

      <SectionTitle>Korrjet e parcelës</SectionTitle>
      {pcs.length === 0 ? <Text style={s.mute}>Asnjë dorëzim ende.</Text> : pcs.map((p) => (
        <Card key={p.id}>
          <View style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.text }} numberOfLines={1}>{p.lot_code}</Text>
              <Text style={s.mute}>{dFull(p.date)} · njomë {fmt(p.qty_fresh)} kg · thatë {fmt(p.qty_dry)} kg</Text>
            </View>
            <Text style={{ fontWeight: "800", color: C.text }}>{money(p.amount)}</Text>
          </View>
        </Card>
      ))}

      <SectionTitle>Historiku i aktiviteteve</SectionTitle>
      {acts.length === 0 ? (
        <Empty icon="time-outline" title="Asnjë aktivitet" text="Punimet e tokës, trajtimet, inputet, vëzhgimet dhe detyrat shfaqen këtu sipas datës." />
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
    </View>
  );
}

export default function Trace({ cid }) {
  const [mode, setMode] = useState("lot");
  const [q, setQ] = useState("");
  const [lots, setLots] = useState([]), [plots, setPlots] = useState([]);
  const [code, setCode] = useState(null), [plotId, setPlotId] = useState(null);
  const [loading, setLoading] = useState(true), [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [l, p] = await Promise.all([
      sb.from("lot_chain").select("lot_code,product,collector,collection_point,farmers,plots,fresh,dry,d_to").eq("company_id", cid).order("d_to", { ascending: false }).limit(80),
      sb.from("plots").select("id,name,code,area_ha,farmers(first_name,last_name),zones(collector_name)").eq("company_id", cid).order("name").limit(200),
    ]);
    setErr(l.error ? "Lot-et nuk u ngarkuan" : p.error ? "Parcelat nuk u ngarkuan" : "");
    setLots(l.data || []); setPlots(p.data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const needle = q.trim().toLowerCase();
  const fLots = lots.filter((l) => !needle || `${l.lot_code} ${l.product} ${l.collector}`.toLowerCase().includes(needle));
  const fPlots = plots.filter((p) => !needle || `${p.name} ${p.code || ""} ${p.farmers ? p.farmers.first_name + " " + p.farmers.last_name : ""}`.toLowerCase().includes(needle));

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Gjurmueshmëria</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Nga toka te klienti: kush parcelë, kush fermer, kush grumbullues.</Text>
      <View style={{ marginTop: 12 }}>
        <Segmented options={[["lot", "Sipas lotit"], ["plot", "Sipas parcelës"]]} value={mode} onChange={(m) => { setMode(m); setQ(""); setCode(null); setPlotId(null); }} />
      </View>
      {!!err && <ErrorBox message={err} onRetry={load} />}
      {loading && <Loading />}

      {!loading && mode === "lot" && (
        <View>
          <SearchBar value={q} onChange={setQ} placeholder="Kod loti, produkt ose grumbullues…" />
          {!code ? (
            fLots.length === 0 ? (
              <Empty icon="search-outline" title="Asnjë lot" text="Lotet krijohen automatikisht kur regjistroni blerje me parcelë." action={<Btn title="Rifresko" alt icon="refresh" onPress={load} />} />
            ) : fLots.map((l) => (
              <Card key={l.lot_code} onPress={() => setCode(l.lot_code)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="barcode-outline" size={17} color={C.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{l.lot_code}</Text>
                    <Text style={s.mute} numberOfLines={1}>{l.product} · {l.plots} parcelë · {l.farmers} fermerë{l.collector ? ` · ${l.collector}` : ""}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "800", color: C.text }}>{fmt(l.dry)} kg</Text>
                    <Text style={s.mute}>{dShort(l.d_to)}</Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <View>
              <TouchableOpacity onPress={() => setCode(null)} style={[s.backRow, { marginTop: 12 }]}>
                <Ionicons name="chevron-back" size={17} color={C.brand} />
                <Text style={s.backT}>Të gjitha lotet</Text>
              </TouchableOpacity>
              <LotView cid={cid} code={code} />
            </View>
          )}
        </View>
      )}

      {!loading && mode === "plot" && (
        <View>
          <SearchBar value={q} onChange={setQ} placeholder="Parcelë, kod ose fermer…" />
          {!plotId ? (
            fPlots.length === 0 ? (
              <Empty icon="map-outline" title="Asnjë parcelë" text="Regjistroni parcelat te «Parcelat» për të ndjekur historikun." action={<Btn title="Rifresko" alt icon="refresh" onPress={load} />} />
            ) : fPlots.map((p) => (
              <Card key={p.id} onPress={() => setPlotId(p.id)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="map-outline" size={17} color={C.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{p.name}{p.code ? ` · ${p.code}` : ""}</Text>
                    <Text style={s.mute} numberOfLines={1}>
                      {p.farmers ? `${p.farmers.first_name} ${p.farmers.last_name}` : "Pa fermer"}
                      {p.zones?.collector_name ? ` · ${p.zones.collector_name}` : ""}
                    </Text>
                  </View>
                  <Text style={s.mute}>{p.area_ha ? `${fmt(p.area_ha)} ha` : ""}</Text>
                </View>
              </Card>
            ))
          ) : (
            <View>
              <TouchableOpacity onPress={() => setPlotId(null)} style={[s.backRow, { marginTop: 12 }]}>
                <Ionicons name="chevron-back" size={17} color={C.brand} />
                <Text style={s.backT}>Të gjitha parcelat</Text>
              </TouchableOpacity>
              <PlotView cid={cid} plotId={plotId} />
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
