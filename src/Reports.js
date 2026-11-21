// Qendra e raporteve: filtra të përparuar (periudhë, produkt, zonë, fermer, parcelë) dhe një klik.
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, C, Btn, Field, Card, Chip, ChipRow, ErrorBox, SectionTitle, today } from "./ui";
import Lookup, { LOOKUPS } from "./Lookup";
import { downloadReport } from "./reportBuilder";
import LabAccount from "./LabAccount";

const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [["month", "Ky muaj"], ["year", "Ky vit"], ["last", "Viti i kaluar"], ["all", "Gjithë"], ["custom", "Vetë"]];

function presetRange(k) {
  const now = new Date();
  if (k === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  if (k === "year") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  if (k === "last") return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` };
  if (k === "all") return { from: "", to: "" };
  return null;
}

function FilterField({ cid, title, cfg, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <View style={{ flex: 1 }}><Lookup title={title} cid={cid} cfg={cfg} value={value} onChange={onChange} /></View>
      {!!value && (
        <TouchableOpacity onPress={() => onChange(null)} style={{ paddingVertical: 14, paddingHorizontal: 6 }} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={C.mute} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Quick({ icon, label, sub, onClick, busy, tone = "brand" }) {
  const fg = tone === "danger" ? C.red : C.brand;
  const bg = tone === "danger" ? C.dangerSoft : C.brandSoft;
  return (
    <TouchableOpacity onPress={onClick} activeOpacity={0.85} style={[s.card, { flex: 1, marginBottom: 0 }]}>
      <View style={[s.iconCircle, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={fg} /></View>
      <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14, marginTop: 9 }} numberOfLines={1}>{label}</Text>
      <Text style={[s.mute, { marginTop: 1 }]} numberOfLines={1}>{busy ? "Po krijohet…" : sub}</Text>
    </TouchableOpacity>
  );
}

function ReportRow({ title, text, onX, onP, busyP, busyX, disabled }) {
  return (
    <Card>
      <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14.5 }}>{title}</Text>
      <Text style={[s.mute, { marginTop: 2 }]}>{text}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 11 }}>
        <TouchableOpacity disabled={busyP || disabled} onPress={onP} activeOpacity={0.85}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11, backgroundColor: C.brand, opacity: disabled ? 0.4 : 1 }}>
          <Ionicons name="document-text-outline" size={15} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{busyP ? "…" : "PDF"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busyX || disabled} onPress={onX} activeOpacity={0.85}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, opacity: disabled ? 0.4 : 1 }}>
          <Ionicons name="grid-outline" size={15} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>{busyX ? "…" : "Excel"}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function Reports({ cid }) {
  const [preset, setPreset] = useState("year");
  const [range, setRange] = useState(() => presetRange("year"));
  const [product, setProduct] = useState(null);
  const [zone, setZone] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [plot, setPlot] = useState(null);
  const [lot, setLot] = useState("");
  const [busy, setBusy] = useState("");
  const [labAcc, setLabAcc] = useState("GBA"), [labOpen, setLabOpen] = useState(false);
  const [msg, setMsg] = useState(""), [err, setErr] = useState("");

  const pickPreset = (k) => {
    setPreset(k);
    const r = presetRange(k);
    if (r) setRange(r);
  };

  const filters = useMemo(() => {
    const f = {};
    if (range.from) f.from = range.from;
    if (range.to) f.to = range.to;
    if (range.to) f.year = Number(range.to.slice(0, 4));
    if (product) f.product_id = product;
    if (zone) f.zone_id = zone;
    if (farmer) f.farmer_id = farmer;
    if (plot) f.plot_id = plot;
    return f;
  }, [range, product, zone, farmer, plot]);

  const active = [
    range.from || range.to ? `${range.from || "…"} → ${range.to || "…"}` : "Gjithë periudha",
    product ? "produkt i zgjedhur" : null,
    zone ? "zonë e zgjedhur" : null,
    farmer ? "fermer i zgjedhur" : null,
    plot ? "parcelë e zgjedhur" : null,
    lot.trim() ? `loti ${lot.trim()}` : null,
  ].filter(Boolean);

  const run = (key, params) => async () => {
    setBusy(key); setMsg(""); setErr("");
    try {
      const path = await downloadReport({ company_id: cid, ...filters, ...params });
      setMsg(`U krijua: ${String(path).split("/").pop()}`);
    } catch (e) {
      setErr(e.message || "Raporti nuk u krijua");
    }
    setBusy("");
  };
  const both = (key, params) => ({ p: run(`${key}p`, { ...params, format: "pdf" }), x: run(`${key}x`, { ...params, format: "xlsx" }) });

  const clear = () => { setProduct(null); setZone(null); setFarmer(null); setPlot(null); setLot(""); pickPreset("year"); };

  const quick = [
    { key: "q1", icon: "basket-outline", label: "Blerjet", sub: "një klik · PDF", params: { type: "purchases" } },
    { key: "q2", icon: "cash-outline", label: "Pagesat", sub: "kush pagoi, sa mbeti", params: { type: "payments" } },
    { key: "q3", icon: "flask-outline", label: "Mostrat", sub: "laboratori dhe vendimi", params: { type: "samples" } },
    { key: "q4", icon: "alarm-outline", label: "Kujtuesit", sub: "nuk harroj", params: { type: "reminders" }, tone: "danger" },
    { key: "q5", icon: "construct-outline", label: "Punimet", sub: "plugim, trajtime", params: { type: "operations" } },
    { key: "q6", icon: "map-outline", label: "Parcelat", sub: "sipërfaqe dhe kosto", params: { type: "plots" } },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Qendra e raporteve</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Zgjidh filtrat një herë — pastaj çdo raport del me një klik, Excel ose PDF.</Text>

      {/* 1. Filtra */}
      <Card style={{ marginTop: 14 }}>
        <View style={s.listRow}>
          <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="funnel-outline" size={18} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: C.ink }}>Filtrat e raportit</Text>
            <Text style={s.mute} numberOfLines={1}>{active.join(" · ")}</Text>
          </View>
          <TouchableOpacity onPress={clear} hitSlop={8}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Pastro</Text></TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <ChipRow>
            {PRESETS.map(([k, t]) => (
              <TouchableOpacity key={k} onPress={() => pickPreset(k)} style={[s.chip, { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: preset === k ? C.brand : C.surfaceAlt }]} activeOpacity={0.85}>
                <Text style={[s.chipT, { color: preset === k ? "#fff" : C.sub, fontWeight: "700" }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ChipRow>
        </View>

        {(preset === "custom" || range.from || range.to) && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1 }}><Field label="Nga data" value={range.from} onChangeText={(v) => { setPreset("custom"); setRange((r) => ({ ...r, from: v })); }} placeholder="2026-01-01" /></View>
            <View style={{ flex: 1 }}><Field label="Deri më" value={range.to} onChangeText={(v) => { setPreset("custom"); setRange((r) => ({ ...r, to: v })); }} placeholder={today()} /></View>
          </View>
        )}

        <FilterField cid={cid} title="Produkti" cfg={LOOKUPS.product} value={product} onChange={setProduct} />
        <FilterField cid={cid} title="Zona / grumbulluesi" cfg={LOOKUPS.zone} value={zone} onChange={setZone} />
        <FilterField cid={cid} title="Fermeri" cfg={LOOKUPS.farmer} value={farmer} onChange={setFarmer} />
        <FilterField cid={cid} title="Parcela" cfg={LOOKUPS.plot} value={plot} onChange={setPlot} />
        <Field label="Kodi i lotit (për kartelën e gjurmueshmërisë)" value={lot} onChangeText={setLot} autoCapitalize="characters" placeholder="W010F/1a-I-115-26" />
      </Card>

      {!!err && <ErrorBox message={err} />}
      {!!msg && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <Ionicons name="checkmark-circle" size={17} color={C.ok} />
          <Text style={{ color: C.ok, fontWeight: "700", flex: 1 }} numberOfLines={2}>{msg}</Text>
        </View>
      )}

      {/* 2. Një klik */}
      <SectionTitle>Një klik — me filtrat e zgjedhur</SectionTitle>
      {[0, 2, 4].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          {[quick[i], quick[i + 1]].filter(Boolean).map((q) => (
            <Quick key={q.key} icon={q.icon} label={q.label} sub={q.sub} tone={q.tone}
              busy={busy === `${q.key}p`} onClick={run(`${q.key}p`, { ...q.params, format: "pdf" })} />
          ))}
        </View>
      ))}

      {/* 3. Parcela në një klik */}
      <SectionTitle>Parcela në një klik</SectionTitle>
      <ReportRow
        title="Kartela e parcelës"
        text={plot ? "Profili, pronësia, historiku i aktiviteteve, korrjet dhe kostot" : "Zgjidhni parcelën te filtrat lart, pastaj një klik"}
        disabled={!plot}
        onP={run("plp", { type: "plot", format: "pdf" })}
        onX={run("plx", { type: "plot", format: "xlsx" })}
        busyP={busy === "plp"} busyX={busy === "plx"}
      />
      <ReportRow
        title="Kartela e gjurmueshmërisë"
        text={lot.trim() ? `Loti ${lot.trim()} — nga toka te klienti` : "Shkruani kodin e lotit te filtrat"}
        disabled={!lot.trim()}
        onP={run("trp", { type: "trace", format: "pdf", lot_code: lot.trim() })}
        onX={run("trx", { type: "trace", format: "xlsx", lot_code: lot.trim() })}
        busyP={busy === "trp"} busyX={busy === "trx"}
      />
      <ReportRow
        title="Fletë vjelje për lotin"
        text="Tabela e vjeljes si Excel-i i BioBes"
        disabled={!lot.trim()}
        onP={run("lop", { type: "lot", format: "pdf", lot_code: lot.trim() })}
        onX={run("lox", { type: "lot", format: "xlsx", lot_code: lot.trim() })}
        busyP={busy === "lop"} busyX={busy === "lox"}
      />

      {/* 4. Raporte të plota */}
      <SectionTitle>Prodhimi dhe gjurmueshmëria</SectionTitle>
      <ReportRow
        title="Përmbledhje vjetore e loteve"
        text="Sasi e njomë/thatë, gjendje, dorëzime dhe eksport sipas lotit"
        onP={both("s", { type: "summary" }).p} onX={both("s", { type: "summary" }).x}
        busyP={busy === "sp"} busyX={busy === "sx"}
      />
      <ReportRow
        title="Blerjet nga fermerët"
        text="Loti, produkti, fermeri, parcela, grumbulluesi, kg dhe pagesa"
        onP={both("b", { type: "purchases" }).p} onX={both("b", { type: "purchases" }).x}
        busyP={busy === "bp"} busyX={busy === "bx"}
      />
      <ReportRow
        title="Protokolli i mostrave"
        text="Vendi i marrjes, laboratori, lagështia, pastërtia dhe vendimi"
        onP={both("m", { type: "samples" }).p} onX={both("m", { type: "samples" }).x}
        busyP={busy === "mp"} busyX={busy === "mx"}
      />
      <ReportRow
        title="Pagesat dhe mbetjet"
        text="Kush pagoi (kompania ose grumbulluesi), dokumenti dhe shuma"
        onP={both("y", { type: "payments" }).p} onX={both("y", { type: "payments" }).x}
        busyP={busy === "yp"} busyX={busy === "yx"}
      />
      <ReportRow
        title="Kujtuesit — nuk harroj"
        text="Pagesa të papaguara, mostra pa rezultat, detyra të vonuara, qira që skadojnë"
        onP={both("r", { type: "reminders" }).p} onX={both("r", { type: "reminders" }).x}
        busyP={busy === "rp"} busyX={busy === "rx"}
      />

      <SectionTitle>Ferma dhe njerëzit</SectionTitle>
      <ReportRow
        title="Raport parcelash"
        text="Sipërfaqe, kultivime, detyra, shpenzime dhe kosto për hektar"
        onP={both("p", { type: "plots" }).p} onX={both("p", { type: "plots" }).x}
        busyP={busy === "pp"} busyX={busy === "px"}
      />
      <ReportRow
        title="Punimet dhe trajtimet"
        text="Plugim, frezim, pleh, spërkatje — orë, doza dhe kosto"
        onP={both("o", { type: "operations" }).p} onX={both("o", { type: "operations" }).x}
        busyP={busy === "op"} busyX={busy === "ox"}
      />
      <ReportRow
        title="Inputet"
        text="Fara, plehra, karburant dhe krah pune sipas parcelës"
        onP={both("i", { type: "inputs" }).p} onX={both("i", { type: "inputs" }).x}
        busyP={busy === "ip"} busyX={busy === "ix"}
      />
      <ReportRow
        title="Detyrat në fushë"
        text="Afatet, përgjegjësit dhe statusi i punës"
        onP={both("k", { type: "tasks" }).p} onX={both("k", { type: "tasks" }).x}
        busyP={busy === "kp"} busyX={busy === "kx"}
      />
      <ReportRow
        title="Zonat dhe grumbulluesit"
        text="Kush mbulon cilat parcela dhe sa kg në vit"
        onP={both("z", { type: "zones" }).p} onX={both("z", { type: "zones" }).x}
        busyP={busy === "zp"} busyX={busy === "zx"}
      />
      <ReportRow
        title="Kultivime — përmbledhje"
        text="Parcela, produkti, sasia e miratuar, vjelja, eksporti dhe stoku"
        onP={both("cu", { type: "cultivation" }).p} onX={both("cu", { type: "cultivation" }).x}
        busyP={busy === "cup"} busyX={busy === "cux"}
      />
      <ReportRow
        title="Plan qarkullimi"
        text="Çfarë kultivohet në çdo parcelë, vit pas viti"
        onP={both("pq", { type: "rotation" }).p} onX={both("pq", { type: "rotation" }).x}
        busyP={busy === "pqp"} busyX={busy === "pqx"}
      />
      <ReportRow
        title="Faturat DHL / FedEx"
        text="Dërgesat e mostrave, faturat dhe pagesat e kurierit"
        onP={both("dh", { type: "shipments" }).p} onX={both("dh", { type: "shipments" }).x}
        busyP={busy === "dhp"} busyX={busy === "dhx"}
      />
      <ReportRow
        title="Protokolli i mostrave (Excel)"
        text="Data, klienti, produkti, kodi, tracking, koment dhe rezultate — si në Excel"
        onP={both("pm", { type: "protocol" }).p} onX={both("pm", { type: "protocol" }).x}
        busyP={busy === "pmp"} busyX={busy === "pmx"}
      />
      <ReportRow
        title="Fatura FedEx (Excel)"
        text="Data, referenca, klienti dhe shuma e faturës — si në Excel"
        onP={both("fx", { type: "shipments", carrier: "FedEx" }).p} onX={both("fx", { type: "shipments", carrier: "FedEx" }).x}
        busyP={busy === "fxp"} busyX={busy === "fxx"}
      />
      <ReportRow
        title="Kartela e llogarisë (GBA)"
        text="Parapagime, shërbime dhe gjendja me laboratorin — si në Excel"
        onP={both("lg", { type: "lab_ledger", account: labAcc }).p} onX={both("lg", { type: "lab_ledger", account: labAcc }).x}
        busyP={busy === "lgp"} busyX={busy === "lgx"}
      />
      <Btn title={labOpen ? "Mbyll kartelën e llogarisë" : "Hap kartelën e llogarisë (hyrje)"} alt onPress={() => setLabOpen((v) => !v)} />
      {labOpen && <LabAccount cid={cid} account={labAcc} onAccount={setLabAcc} />}
      <ReportRow
        title="Lista e mbledhësve"
        text="Fermerët, zonat, familjet dhe dokumentet"
        onP={both("g", { type: "growers" }).p} onX={both("g", { type: "growers" }).x}
        busyP={busy === "gp"} busyX={busy === "gx"}
      />
      <ReportRow
        title="Përmbledhje për një fermer"
        text={farmer ? "Zgjidhni vitin te filtrat — vjeljet e fermerit sipas lotit" : "Zgjidhni fermerin te filtrat lart"}
        disabled={!farmer}
        onP={both("f", { type: "farmer" }).p} onX={both("f", { type: "farmer" }).x}
        busyP={busy === "fp"} busyX={busy === "fx"}
      />

      <Text style={[s.mute, { fontSize: 11, marginTop: 18, textAlign: "center" }]}>
        Raportet krijohen brenda telefonit — Excel dhe PDF kanë të njëjtën pamje dhe ndahen direkt.
      </Text>
    </ScrollView>
  );
}
