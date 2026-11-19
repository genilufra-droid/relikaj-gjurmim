// Detyrat në fushë (workflows) — me afate, përgjegjës dhe mbyllje.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn, today } from "./ui";

const TYPES = [["sow", "Mbjellje"], ["irrigate", "Ujitje"], ["fertilize", "Plehërim"], ["protect", "Mbrojtje"], ["care", "Kujdes"], ["scout", "Vëzhgim"], ["prune", "Krasitje"], ["harvest", "Vjelje"], ["other", "Tjetër"]];
const PRIO = [["low", "Ulet"], ["normal", "Normal"], ["high", "I lartë"]];

export function TaskForm({ cid, onDone }) {
  const [f, setF] = useState({ title: "", plot: null, type: "other", due: today(), farmer: null, priority: "normal", notes: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    if (!f.title.trim() || !f.due) { setErr("Shkruani detyrën dhe afatin"); return; }
    setBusy(true); setErr("");
    const { error } = await sb.from("tasks").insert({
      company_id: cid, title: f.title.trim(), plot_id: f.plot, type: f.type, due_date: f.due,
      assignee_farmer_id: f.farmer, priority: f.priority, notes: f.notes,
    });
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + error.message); return; }
    onDone();
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Detyrë e re</Text>
      <Field label="Detyra" value={f.title} onChangeText={set("title")} />
      <Lookup title="Parcela (opsionale)" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />
      <Text style={s.label}>Lloji</Text>
      {TYPES.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("type")(k)} style={[s.input, { marginBottom: 6 }, f.type === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.type === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Afati (VVVV-MM-DD)" value={f.due} onChangeText={set("due")} />
      <Lookup title="Përgjegjësi (fermer, opsionale)" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />
      <Text style={s.label}>Prioriteti</Text>
      {PRIO.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => set("priority")(k)} style={[s.input, { marginBottom: 6 }, f.priority === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.priority === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Shënim" value={f.notes} onChangeText={set("notes")} multiline />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Ruaj" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Tasks({ cid, role, onNew }) {
  const [rows, setRows] = useState([]), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("tasks")
      .select("id,title,type,due_date,status,priority,plots(name),farmers!tasks_assignee_farmer_id_fkey(first_name,last_name)")
      .eq("company_id", cid).order("due_date").limit(200);
    setErr(error ? "Të dhënat nuk u ngarkuan" : ""); setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const t = today();
  const toggle = async (r) => { await sb.from("tasks").update({ status: r.status === "done" ? "open" : "done" }).eq("id", r.id); load(); };
  const del = (r) => Alert.alert("Fshi detyrën?", r.title, [{ text: "Jo" }, { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("tasks").delete().eq("id", r.id); load(); } }]);
  const groups = [["Të vonuara", (r) => r.status === "open" && r.due_date < t], ["Sot", (r) => r.status === "open" && r.due_date === t], ["Të hapura", (r) => r.status === "open" && r.due_date > t], ["Të kryera", (r) => r.status === "done"]];
  const canWrite = role !== "fermer";
  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={s.pad} data={groups} keyExtractor={(g) => g[0]} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View><Text style={s.h1}>Detyrat</Text>{canWrite && <Btn title="+ Detyrë e re" onPress={onNew} />}{!!err && <Text style={s.err}>{err}</Text>}</View>}
        renderItem={({ item: [name, pred] }) => {
          const items = rows.filter(pred);
          if (!items.length) return null;
          return (
            <View>
              <Text style={[s.label, { marginTop: 14 }]}>{name} ({items.length})</Text>
              {items.map((r) => (
                <TouchableOpacity key={r.id} style={[s.card, { marginTop: 6, opacity: r.status === "done" ? 0.6 : 1 }]} onPress={() => toggle(r)} onLongPress={() => (role === "admin" || role === "staf") && del(r)}>
                  <View style={s.row}>
                    <Text style={{ fontWeight: "700", color: C.text, flex: 1, textDecorationLine: r.status === "done" ? "line-through" : "none" }}>{r.title}</Text>
                    <Text style={{ color: r.due_date < t && r.status === "open" ? C.red : C.mute }}>{r.due_date}</Text>
                  </View>
                  <Text style={s.mute}>{r.type}{!!r.plots ? ` · ${r.plots.name}` : ""}{r.farmers ? ` · ${r.farmers.first_name} ${r.farmers.last_name}` : ""} · {r.priority}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}
