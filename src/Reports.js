// Raportet: Excel dhe PDF, të njëjta në ekran dhe në letër.
import React, { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, C, Btn, Field, Card, Chip, ErrorBox, SectionTitle } from "./ui";
import Lookup, { LOOKUPS } from "./Lookup";
import { downloadReport } from "./reports";

function ReportCard({ icon, title, text, children }) {
  return (
    <Card>
      <View style={s.listRow}>
        <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
          <Ionicons name={icon} size={19} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", color: C.ink, fontSize: 15 }}>{title}</Text>
          <Text style={[s.mute, { marginTop: 1 }]}>{text}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{children}</View>
    </Card>
  );
}

function FmtBtn({ label, icon, busy, disabled, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={busy || disabled} activeOpacity={0.85}
      style={{
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: C.line,
        backgroundColor: C.surface, opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={16} color={C.brand} />
      <Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>{busy ? "Po krijohet…" : label}</Text>
    </TouchableOpacity>
  );
}

export default function Reports({ cid }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [lot, setLot] = useState("");
  const [farmer, setFarmer] = useState(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState("");

  const run = (key, params) => async () => {
    setBusy(key); setMsg("");
    try { await downloadReport({ company_id: cid, ...params }); }
    catch (e) { setMsg(e.message || "Raporti nuk u krijua"); }
    setBusy("");
  };
  const y = Number(year) || new Date().getFullYear();

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Raporte</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Çdo raport hapet si skedar Excel ose PDF dhe mund të ndahet direkt (WhatsApp, email).</Text>

      {!!msg && <ErrorBox message={msg} />}

      <Field label="Viti i raportit" value={year} onChangeText={setYear} keyboardType="number-pad" />

      <SectionTitle>Prodhimi dhe gjurmueshmëria</SectionTitle>

      <ReportCard icon="bar-chart-outline" title="Përmbledhje vjetore" text="Lote, sasi e njomë dhe e thatë, gjendje, eksport">
        <FmtBtn label="Excel" icon="grid-outline" busy={busy === "s1"} onPress={run("s1", { type: "summary", format: "xlsx", year: y })} />
        <FmtBtn label="PDF" icon="document-text-outline" busy={busy === "s2"} onPress={run("s2", { type: "summary", format: "pdf", year: y })} />
      </ReportCard>

      <ReportCard icon="list-outline" title="Lista e mbledhësve" text="Fermerët, zonat, familjet dhe dokumentet">
        <FmtBtn label="Excel" icon="grid-outline" busy={busy === "g1"} onPress={run("g1", { type: "growers", format: "xlsx" })} />
        <FmtBtn label="PDF" icon="document-text-outline" busy={busy === "g2"} onPress={run("g2", { type: "growers", format: "pdf" })} />
      </ReportCard>

      <SectionTitle>Ferma</SectionTitle>

      <ReportCard icon="map-outline" title="Raport parcelash" text="Sipërfaqe, kultivime, detyra, shpenzime dhe kosto për hektar">
        <FmtBtn label="Excel" icon="grid-outline" busy={busy === "p1"} onPress={run("p1", { type: "plots", format: "xlsx", year: y })} />
        <FmtBtn label="PDF" icon="document-text-outline" busy={busy === "p2"} onPress={run("p2", { type: "plots", format: "pdf", year: y })} />
      </ReportCard>

      <ReportCard icon="nutrition-outline" title="Raport inputesh" text="Plehra, trajtime, karburant dhe krah pune sipas parcelës">
        <FmtBtn label="Excel" icon="grid-outline" busy={busy === "i1"} onPress={run("i1", { type: "inputs", format: "xlsx", year: y })} />
        <FmtBtn label="PDF" icon="document-text-outline" busy={busy === "i2"} onPress={run("i2", { type: "inputs", format: "pdf", year: y })} />
      </ReportCard>

      <ReportCard icon="checkbox-outline" title="Raport detyrash" text="Detyrat e fushës: afate, përgjegjës dhe statusi">
        <FmtBtn label="Excel" icon="grid-outline" busy={busy === "k1"} onPress={run("k1", { type: "tasks", format: "xlsx", year: y })} />
        <FmtBtn label="PDF" icon="document-text-outline" busy={busy === "k2"} onPress={run("k2", { type: "tasks", format: "pdf", year: y })} />
      </ReportCard>

      <SectionTitle>Një lot i vetëm</SectionTitle>
      <Field label="Kodi i lotit" value={lot} onChangeText={setLot} autoCapitalize="characters" placeholder="W010F/1a-I-115-26" hint="Formati: zona-korrja-produkt-viti" />

      <ReportCard icon="document-outline" title="Fletë vjelje" text="Tabela e vjeljes për lotin, si Excel-i i BioBes">
        <FmtBtn label="Excel" icon="grid-outline" disabled={!lot.trim()} busy={busy === "l1"} onPress={run("l1", { type: "lot", format: "xlsx", lot_code: lot.trim() })} />
        <FmtBtn label="PDF" icon="document-text-outline" disabled={!lot.trim()} busy={busy === "l2"} onPress={run("l2", { type: "lot", format: "pdf", lot_code: lot.trim() })} />
      </ReportCard>

      <ReportCard icon="shield-checkmark-outline" title="Kartela e gjurmueshmërisë" text="Nga fermeri te klienti: vjelja, magazina, mostrat, inputet">
        <FmtBtn label="Excel" icon="grid-outline" disabled={!lot.trim()} busy={busy === "t1"} onPress={run("t1", { type: "trace", format: "xlsx", lot_code: lot.trim() })} />
        <FmtBtn label="PDF" icon="document-text-outline" disabled={!lot.trim()} busy={busy === "t2"} onPress={run("t2", { type: "trace", format: "pdf", lot_code: lot.trim() })} />
      </ReportCard>

      <SectionTitle>Për një fermer</SectionTitle>
      <Lookup title="Fermeri" cid={cid} cfg={LOOKUPS.farmer} value={farmer} onChange={setFarmer} />
      <ReportCard icon="person-outline" title="Përmbledhje fermeri" text="Vjeljet e fermerit sipas lotit dhe zonës">
        <FmtBtn label="Excel" icon="grid-outline" disabled={!farmer} busy={busy === "f1"} onPress={run("f1", { type: "farmer", format: "xlsx", farmer_id: farmer, year: y })} />
        <FmtBtn label="PDF" icon="document-text-outline" disabled={!farmer} busy={busy === "f2"} onPress={run("f2", { type: "farmer", format: "pdf", farmer_id: farmer, year: y })} />
      </ReportCard>

      <Text style={[s.mute, { fontSize: 11, marginTop: 18, textAlign: "center" }]}>Raportet krijohen në server (Supabase Functions) — Excel dhe PDF kanë të njëjtën pamje.</Text>
    </ScrollView>
  );
}
