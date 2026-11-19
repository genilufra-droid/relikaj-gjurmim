// Toka dhe financat: qiratë e parcelave, pagesat (qira/fermerë) dhe kujtuesit.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, fmt, num, today } from "./ui";

const PARTS = [["qira", "Qiratë"], ["pagesa", "Pagesat"], ["kujtues", "Kujtuesit"]];

export function LandForm({ cid, mode, onDone }) {
  const [f, setF] = useState({ plot: null, owner: "", start: "", end: "", rent: "", date: today(), amount: "", method: "", farmer: null, title: "", note: "" });
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
      }));
    } else {
      if (!f.title.trim()) { setBusy(false); setErr("Shkruani kujtuesin"); return; }
      ({ error } = await sb.from("reminders").insert({ company_id: cid, title: f.title.trim(), due_date: f.date }));
    }
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{mode === "qira" ? "Qira e re" : mode === "pagesa" ? "Pagesë e re" : "Kujtues i ri"}</Text>
      {(mode === "qira" || mode === "pagesa") && <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />}
      {mode === "qira" && (
        <View>
          <Field label="Pronari i tokës" value={f.owner} onChangeText={set("owner")} />
          <Field label="Nga data (VVVV-MM-DD)" value={f.start} onChangeText={set("start")} placeholder="2026-01-01" />
          <Field label="Deri më (VVVV-MM-DD)" value={f.end} onChangeText={set("end")} placeholder="2026-12-31" />
          <Field label="Qiraja vjetore (lekë)" value={f.rent} onChangeText={set("rent")} keyboardType="decimal-pad" />
        </View>
      )}
      {mode === "pagesa" && (
        <View>
          <Field label="Data (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
          <Field label="Shuma (lekë)" value={f.amount} onChangeText={set("amount")} keyboardType="decimal-pad" />
          <Field label="Mënyra (bankë, cash…)" value={f.method} onChangeText={set("method")} />
          <Lookup title="Fermeri (për pagesa të vjeljes, opsionale)" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
        </View>
      )}
      {mode === "kujtues" && (
        <View>
          <Field label="Kujtuesi" value={f.title} onChangeText={set("title")} />
          <Field label="Afati (VVVV-MM-DD)" value={f.date} onChangeText={set("date")} />
        </View>
      )}
      {(mode === "qira" || mode === "pagesa") && <Field label="Shënim" value={f.note} onChangeText={set("note")} multiline />}
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Land({ cid, role, part, onNew }) {
  const [leases, setLeases] = useState([]), [pays, setPays] = useState([]), [rems, setRems] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const [{ data: l, error: e1 }, { data: p }, { data: r }] = await Promise.all([
      sb.from("lease_summary").select("*").eq("company_id", cid).order("plot"),
      sb.from("payments").select("id,date,amount,method,note,farmers(first_name,last_name)").eq("company_id", cid).order("date", { ascending: false }).limit(50),
      sb.from("reminders").select("id,title,due_date,done").eq("company_id", cid).order("due_date"),
    ]);
    setErr(e1 ? "Të dhënat nuk u ngarkuan" : ""); setLeases(l || []); setPays(p || []); setRems(r || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const t = today();
  const del = (table, id, what) => Alert.alert(`Fshi ${what}?`, "", [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from(table).delete().eq("id", id); load(); } }]);
  const toggle = async (r) => { await sb.from("reminders").update({ done: !r.done }).eq("id", r.id); load(); };
  const canWrite = role !== "fermer";
  const canDel = role === "admin" || role === "staf";
  const buttons = { qira: "+ Qira e re", pagesa: "+ Pagesë e re", kujtues: "+ Kujtues i ri" };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>Toka dhe financat</Text>
      {!!err && <Text style={s.err}>{err}</Text>}
      {canWrite ? <Btn title={buttons[part]} onPress={onNew} /> : <Text style={s.mute}>Vetëm stafi mund të shtojë të dhëna.</Text>}
      {part === "qira" && (
        <View>
          <Text style={s.label}>Qiratë e parcelave</Text>
          {leases.length === 0 && <Text style={s.mute}>Asnjë qira e regjistruar.</Text>}
          {leases.map((l) => (
            <TouchableOpacity key={l.lease_id} style={s.card} onLongPress={() => canDel && del("leases", l.lease_id, "qiranë")}>
              <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{l.plot}</Text><Text style={s.mute}>{fmt(l.rent_amount)} lekë/vit</Text></View>
              <Text style={s.mute}>{l.owner_name || "Pronar i panjohur"}{l.start_date ? ` · ${l.start_date} → ${l.end_date || "…"}` : ""}</Text>
              <Text style={{ color: l.remaining > 0 ? C.red : C.green }}>
                Paguar {fmt(l.paid)} · Mbetur {fmt(l.remaining)} lekë
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {part === "pagesa" && (
        <View>
          <Text style={s.label}>Pagesat</Text>
          {pays.length === 0 && <Text style={s.mute}>Asnjë pagesë e regjistruar.</Text>}
          {pays.map((p) => (
            <TouchableOpacity key={p.id} style={s.card} onLongPress={() => canDel && del("payments", p.id, "pagesën")}>
              <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{fmt(p.amount)} lekë</Text><Text style={s.mute}>{p.date}</Text></View>
              <Text style={s.mute}>{p.method || "pa mënyrë"}{p.farmers ? ` · ${p.farmers.first_name} ${p.farmers.last_name}` : ""}</Text>
              {!!p.note && <Text style={s.mute}>{p.note}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {part === "kujtues" && (
        <View>
          <Text style={s.label}>Kujtuesit</Text>
          {rems.length === 0 && <Text style={s.mute}>Asnjë kujtues.</Text>}
          {rems.map((r) => (
            <TouchableOpacity key={r.id} style={[s.card, { opacity: r.done ? 0.55 : 1 }]} onPress={() => toggle(r)} onLongPress={() => canDel && del("reminders", r.id, "kujtuesin")}>
              <View style={s.row}>
                <Text style={{ fontWeight: "700", color: C.text, flex: 1, textDecorationLine: r.done ? "line-through" : "none" }}>{r.title}</Text>
                <Text style={{ color: r.due_date < t && !r.done ? C.red : C.mute }}>{r.due_date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={[s.mute, { marginTop: 18, fontSize: 12 }]}>Shtypni gjatë një rreshti për ta fshirë. Shtypni një kujtues për ta shënuar të kryer.</Text>
    </ScrollView>
  );
}
