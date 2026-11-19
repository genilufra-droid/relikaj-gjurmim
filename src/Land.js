// Toka dhe financat: qiratë e parcelave, pagesat dhe kujtuesit.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, Segmented, Stat, money, num, fmt, today, dShort, dueLabel, Kpis } from "./ui";

export function LandForm({ cid, mode, onDone }) {
  const [f, setF] = useState({ plot: null, owner: "", start: "", end: "", rent: "", term: "", deposit: "", date: today(), amount: "", method: "", payer: "company", receipt: "", farmer: null, title: "", note: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const save = async () => {
    setBusy(true); setErr("");
    let error = null;
    if (mode === "qira") {
      if (!f.plot) { setBusy(false); setErr("Zgjidhni parcelën"); return; }
      ({ error } = await sb.from("leases").insert({
        company_id: cid, plot_id: f.plot, owner_name: f.owner, start_date: f.start || null,
        end_date: f.end || null, rent_amount: num(f.rent), note: f.note,
        term_months: f.term ? Math.round(num(f.term)) : null, deposit: num(f.deposit),
      }));
    } else if (mode === "pagesa") {
      if (!f.amount) { setBusy(false); setErr("Shkruani shumën"); return; }
      let lease_id = null;
      if (f.plot) {
        const { data } = await sb.from("leases").select("id").eq("company_id", cid).eq("plot_id", f.plot).order("id", { ascending: false }).limit(1);
        lease_id = data && data[0] ? data[0].id : null;
      }
      ({ error } = await sb.from("payments").insert({
        company_id: cid, lease_id, farmer_id: f.farmer, date: f.date, amount: num(f.amount), method: f.method, note: f.note,
        paid_by: f.payer, receipt_no: f.receipt,
      }));
    } else {
      if (!f.title.trim()) { setBusy(false); setErr("Shkruani kujtuesin"); return; }
      ({ error } = await sb.from("reminders").insert({ company_id: cid, title: f.title.trim(), due_date: f.date }));
    }
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };

  const title = mode === "qira" ? "Qira e re" : mode === "pagesa" ? "Pagesë e re" : "Kujtues i ri";

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{title}</Text>

      {(mode === "qira" || mode === "pagesa") && <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />}
      {mode === "qira" && (
        <View>
          <Field label="Pronari i tokës" value={f.owner} onChangeText={set("owner")} placeholder="Emër Mbiemër" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Nga data" value={f.start} onChangeText={set("start")} placeholder="2026-01-01" /></View>
            <View style={{ flex: 1 }}><Field label="Deri më" value={f.end} onChangeText={set("end")} placeholder="2026-12-31" /></View>
          </View>
          <Field label="Qiraja vjetore (lekë)" value={f.rent} onChangeText={set("rent")} keyboardType="decimal-pad" placeholder="120000" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Afati (muaj)" value={f.term} onChangeText={set("term")} keyboardType="number-pad" placeholder="12" /></View>
            <View style={{ flex: 1 }}><Field label="Garancia (lekë)" value={f.deposit} onChangeText={set("deposit")} keyboardType="decimal-pad" /></View>
          </View>
        </View>
      )}
      {mode === "pagesa" && (
        <View>
          <Field label="Data" value={f.date} onChangeText={set("date")} placeholder="2026-11-19" />
          <Field label="Shuma (lekë)" value={f.amount} onChangeText={set("amount")} keyboardType="decimal-pad" placeholder="50000" />
          <Field label="Mënyra" value={f.method} onChangeText={set("method")} placeholder="bankë / cash" />
          <Text style={s.label}>Kush paguan</Text>
          <Segmented options={[["company", "Kompania"], ["collector", "Grumbulluesi"]]} value={f.payer} onChange={set("payer")} />
          <Field label="Nr. i faturës / fletëpagesës" value={f.receipt} onChangeText={set("receipt")} placeholder="K-01" />
          <Lookup title="Fermeri (për pagesa vjeljeje)" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
        </View>
      )}
      {mode === "kujtues" && (
        <View>
          <Field label="Kujtuesi" value={f.title} onChangeText={set("title")} placeholder="P.sh. Pagesa e qirasë së parcelës 1" />
          <Field label="Afati" value={f.date} onChangeText={set("date")} placeholder="2026-12-01" />
        </View>
      )}
      {(mode === "qira" || mode === "pagesa") && <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />}
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Land({ cid, role, part, onPart, onNew }) {
  const [leases, setLeases] = useState([]);
  const [pays, setPays] = useState([]);
  const [rems, setRems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [{ data: l, error: e1 }, { data: p }, { data: r }] = await Promise.all([
      sb.from("lease_summary").select("*").eq("company_id", cid).order("plot"),
      sb.from("payments").select("id,date,amount,method,note,farmers(first_name,last_name)").eq("company_id", cid).order("date", { ascending: false }).limit(80),
      sb.from("reminders").select("id,title,due_date,done").eq("company_id", cid).order("due_date"),
    ]);
    setErr(e1 ? e1.message : "");
    setLeases(l || []); setPays(p || []); setRems(r || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const t = today();
  const del = (table, id, what) => Alert.alert(`Fshi ${what}?`, "", [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from(table).delete().eq("id", id); load(); } },
  ]);
  const toggle = async (r) => { await sb.from("reminders").update({ done: !r.done }).eq("id", r.id); load(); };

  const canWrite = role !== "fermer";
  const canDel = role === "admin" || role === "staf";
  const rentTotal = leases.reduce((a, l) => a + Number(l.rent_amount || 0), 0);
  const paidTotal = leases.reduce((a, l) => a + Number(l.paid || 0), 0);
  const dueRem = rems.filter((r) => !r.done).length;
  const labels = { qira: "+ Qira e re", pagesa: "+ Pagesë e re", kujtues: "+ Kujtues i ri" };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Toka dhe financat</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>Qiratë, pagesat dhe kujtuesit e fermës.</Text>

      <Kpis style={{ marginTop: 12 }}>
        <Stat icon="home-outline" label="Qira vjetore" value={money(rentTotal)} sub={`${leases.length} kontrata`} />
        <Stat icon="checkmark-done-outline" label="Paguar" value={money(paidTotal)} sub={`mbetur ${money(rentTotal - paidTotal)}`} tone={rentTotal - paidTotal > 0 ? "warn" : "ok"} />
      </Kpis>

      <View style={{ marginTop: 14 }}>
        <Segmented options={[["qira", "Qiratë"], ["pagesa", "Pagesat"], ["kujtues", `Kujtuesit${dueRem ? ` (${dueRem})` : ""}`]]} value={part} onChange={onPart} />
      </View>

      {!!err && <ErrorBox message={"Të dhënat nuk u ngarkuan: " + err} onRetry={load} />}
      {loading && <Loading />}

      {canWrite && <Btn title={labels[part]} icon="add" onPress={onNew} />}

      {part === "qira" && !loading && (
        <View>
          <Text style={s.sectionTitle}>Qiratë e parcelave</Text>
          {leases.length === 0 ? (
            <Empty icon="home-outline" title="Asnjë qira" text="Regjistroni kontratën e qirasë për çdo parcelë që nuk është e zotëruar." />
          ) : leases.map((l) => {
            const pct = Number(l.rent_amount) > 0 ? Math.min(1, Number(l.paid) / Number(l.rent_amount)) : 0;
            return (
              <Card key={l.lease_id} onLongPress={() => canDel && del("leases", l.lease_id, "qiranë")}>
                <View style={s.listRow}>
                  <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}><Ionicons name="home-outline" size={18} color={C.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{l.plot}</Text>
                    <Text style={s.mute} numberOfLines={1}>{l.owner_name || "Pronar i panjohur"}{l.start_date ? ` · ${dShort(l.start_date)} → ${l.end_date ? dShort(l.end_date) : "…"}` : ""}</Text>
                  </View>
                  <Chip label={l.remaining > 0 ? `mbetur ${money(l.remaining)}` : "paguar"} tone={l.remaining > 0 ? "warn" : "ok"} />
                </View>
                <View style={{ height: 6, borderRadius: 99, backgroundColor: C.surfaceAlt, marginTop: 11, overflow: "hidden" }}>
                  <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: C.ok, borderRadius: 99 }} />
                </View>
                <Text style={[s.mute, { marginTop: 6 }]}>{money(l.paid)} nga {money(l.rent_amount)}</Text>
              </Card>
            );
          })}
        </View>
      )}

      {part === "pagesa" && !loading && (
        <View>
          <Text style={s.sectionTitle}>Pagesat</Text>
          {pays.length === 0 ? (
            <Empty icon="cash-outline" title="Asnjë pagesë" text="Regjistroni pagesat e qirasë ose pagesat për fermerët." />
          ) : pays.map((p) => (
            <Card key={p.id} onLongPress={() => canDel && del("payments", p.id, "pagesën")}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: C.okSoft }]}><Ionicons name="cash-outline" size={18} color={C.ok} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.ink }}>{money(p.amount)}</Text>
                  <Text style={s.mute} numberOfLines={1}>{p.method || "pa mënyrë"}{p.farmers ? ` · ${p.farmers.first_name} ${p.farmers.last_name}` : ""}{p.note ? ` · ${p.note}` : ""}</Text>
                </View>
                <Text style={s.mute}>{dShort(p.date)}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {part === "kujtues" && !loading && (
        <View>
          <Text style={s.sectionTitle}>Kujtuesit</Text>
          {rems.length === 0 ? (
            <Empty icon="notifications-outline" title="Asnjë kujtues" text="Vendosni kujtuesa për pagesa qiraje, inspektime ose afate." />
          ) : rems.map((r) => (
            <Card key={r.id} onLongPress={() => canDel && del("reminders", r.id, "kujtuesin")} style={{ opacity: r.done ? 0.55 : 1 }}>
              <View style={s.listRow}>
                <TouchableOpacity onPress={() => toggle(r)} hitSlop={10}>
                  <Ionicons name={r.done ? "checkmark-circle" : "ellipse-outline"} size={24} color={r.done ? C.ok : r.due_date < t ? C.red : C.mute} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.ink, textDecorationLine: r.done ? "line-through" : "none" }} numberOfLines={2}>{r.title}</Text>
                  <Text style={[s.mute, { color: !r.done && r.due_date < t ? C.red : C.mute }]}>{dShort(r.due_date)} · {dueLabel(r.due_date)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
