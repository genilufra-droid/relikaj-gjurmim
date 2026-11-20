// Kujtuesit — «nuk harroj»: çdo gjë që pret veprim, në një ekran, me një klik te vendi ku zgjidhet.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, Empty, ErrorBox, Loading, SectionTitle, Stat, Kpis, fmt, money, dFull, daysBetween } from "./ui";
import { downloadReport } from "./reportBuilder";

const CATS = [
  { key: "pagesa", title: "Pagesa të papaguara", icon: "cash-outline", tone: C.red, soft: C.dangerSoft, go: "blerje", text: "Fermerët presin pagesën e korrjes." },
  { key: "mostra", title: "Mostra pa rezultat", icon: "flask-outline", tone: C.warn, soft: C.warnSoft, go: "mostra", text: "Laboratori nuk ka kthyer përgjigje." },
  { key: "detyra", title: "Detyra të vonuara", icon: "checkbox-outline", tone: C.warn, soft: C.warnSoft, go: "detyra", text: "Puna e fushës ka kaluar afatin." },
  { key: "qira", title: "Qira që skadon", icon: "home-outline", tone: C.info, soft: C.infoSoft, go: "toka", text: "Kontratat që mbarojnë brenda 45 ditësh." },
  { key: "pritje", title: "Brenda afatit të pritjes", icon: "time-outline", tone: C.info, soft: C.infoSoft, go: "puna", text: "Trajtime që s'lejojnë vjelje ende (PHI)." },
];

export default function Reminders({ cid, onGo }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true), [err, setErr] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
    const [{ data: pays }, { data: samples }, { data: tasks }, { data: leases }, { data: apps }] = await Promise.all([
      sb.from("purchase_payments").select("purchase_id,date,lot_code,farmer,plot,amount,remaining").eq("company_id", cid).order("date"),
      sb.from("samples").select("id,date,product_text,code,point,passed,lab").eq("company_id", cid).order("date", { ascending: false }),
      sb.from("tasks").select("id,title,due_date,status,plots(name)").eq("company_id", cid).order("due_date"),
      sb.from("leases").select("id,plot_id,end_date,status,rent_amount,owner_name,plots(name,code)").eq("company_id", cid),
      sb.from("applications").select("id,date,kind,product_name,phi_days,cost,plots(name,code)").eq("company_id", cid).order("date", { ascending: false }),
    ]);
    const pendingPhi = (apps || []).filter((a) => Number(a.phi_days) > 0 && new Date(Date.now() - Number(a.phi_days) * 864e5).toISOString().slice(0, 10) < a.date);
    setData({
      pagesa: (pays || []).filter((p) => Number(p.remaining) > 0),
      mostra: (samples || []).filter((m) => m.passed == null),
      detyra: (tasks || []).filter((t) => t.status === "open" && String(t.due_date) < today),
      qira: (leases || []).filter((l) => l.status !== "ended" && l.end_date && String(l.end_date) <= soon && String(l.end_date) >= today),
      pritje: pendingPhi,
      total: (pays || []).reduce((a, p) => a + Math.max(0, Number(p.remaining || 0)), 0),
    });
    setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const pdf = async () => {
    setBusy(true); setMsg("");
    try { const p = await downloadReport({ company_id: cid, type: "reminders", format: "pdf" }); setMsg(`U krijua: ${String(p).split("/").pop()}`); }
    catch (e) { setMsg(e.message || "Raporti nuk u krijua"); }
    setBusy(false);
  };

  const counts = CATS.map((c) => [c, (data[c.key] || []).length]);
  const total = counts.reduce((a, [, n]) => a + n, 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Kujtuesit</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Memoria e fermës: çdo gjë që pret veprim sot, me një klik te zgjidhja.</Text>

      <Kpis style={{ marginTop: 14 }}>
        <Stat icon="alarm-outline" label="Për veprim" value={String(total)} sub="zëra të hapur" tone={total ? "danger" : "ok"} />
        <Stat icon="cash-outline" label="Për t'u paguar" value={money(data.total || 0)} sub="fermerëve" tone="warn" />
      </Kpis>

      {!!err && <ErrorBox message={err} onRetry={load} />}
      {loading && <Loading />}
      <Btn title={busy ? "Po krijohet…" : "Raport kujtuesish (PDF)"} icon="document-text-outline" onPress={pdf} busy={busy} />
      {!!msg && <Text style={[s.mute, { marginTop: 8 }]}>{msg}</Text>}

      {!loading && total === 0 && (
        <Empty icon="checkmark-done-outline" title="Gjithçka në rregull" text="Nuk ka pagesa të papaguara, mostra në pritje ose detyra të vonuara. Kthehu nesër." />
      )}

      {!loading && CATS.map((c) => {
        const rows = data[c.key] || [];
        if (!rows.length) return null;
        return (
          <View key={c.key}>
            <SectionTitle right={<Chip label={String(rows.length)} tone={c.key === "pagesa" ? "danger" : "warn"} />}>{c.title}</SectionTitle>
            {c.key === "pagesa" && rows.slice(0, 12).map((p) => (
              <Card key={p.purchase_id} onPress={() => onGo(c.go)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: c.soft }]}><Ionicons name={c.icon} size={17} color={c.tone} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{p.farmer || "Fermer"} · {p.plot || "pa parcelë"}</Text>
                    <Text style={s.mute} numberOfLines={1}>Loti {p.lot_code} · {dFull(p.date)}</Text>
                  </View>
                  <Text style={{ fontWeight: "800", color: C.red }}>{money(p.remaining)}</Text>
                </View>
              </Card>
            ))}
            {c.key === "mostra" && rows.slice(0, 12).map((m) => (
              <Card key={m.id} onPress={() => onGo(c.go)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: c.soft }]}><Ionicons name={c.icon} size={17} color={c.tone} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{m.product_text || m.code}</Text>
                    <Text style={s.mute} numberOfLines={1}>{m.lab || "pa laborator"} · {dFull(m.date)}</Text>
                  </View>
                  <Chip label="Pritje" tone="warn" />
                </View>
              </Card>
            ))}
            {c.key === "detyra" && rows.slice(0, 12).map((t) => (
              <Card key={t.id} onPress={() => onGo(c.go)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: c.soft }]}><Ionicons name={c.icon} size={17} color={c.tone} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{t.title}</Text>
                    <Text style={s.mute} numberOfLines={1}>{t.plots?.name || "pa parcelë"} · afati {dFull(t.due_date)}</Text>
                  </View>
                  <Chip label={`${Math.abs(daysBetween(t.due_date))} ditë`} tone="danger" />
                </View>
              </Card>
            ))}
            {c.key === "qira" && rows.slice(0, 12).map((l) => (
              <Card key={l.id} onPress={() => onGo(c.go)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: c.soft }]}><Ionicons name={c.icon} size={17} color={c.tone} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{l.plots?.code || l.plots?.name || "Parcelë"}</Text>
                    <Text style={s.mute} numberOfLines={1}>{l.owner_name || "pronar"} · skadon {dFull(l.end_date)}</Text>
                  </View>
                  <Chip label={money(l.rent_amount)} tone="info" />
                </View>
              </Card>
            ))}
            {c.key === "pritje" && rows.slice(0, 12).map((a) => (
              <Card key={a.id} onPress={() => onGo(c.go)}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: c.soft }]}><Ionicons name={c.icon} size={17} color={c.tone} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{a.product_name || a.kind}</Text>
                    <Text style={s.mute} numberOfLines={1}>{a.plots?.name || "pa parcelë"} · trajtuar {dFull(a.date)} · pritje {a.phi_days} ditë</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      {!loading && total > 0 && (
        <Text style={[s.mute, { marginTop: 14, textAlign: "center" }]}>Trokitni një kartelë për të shkuar te zgjidhja.</Text>
      )}
    </ScrollView>
  );
}
