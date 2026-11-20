// Detyrat në fushë: afate, përgjegjës, prioritet dhe mbyllje me një shtypje.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, Stat, FAB, dShort, dueLabel, today, Kpis } from "./ui";

const TYPES = [["sow", "Mbjellje", "flower-outline"], ["irrigate", "Ujitje", "water-outline"], ["fertilize", "Plehërim", "nutrition-outline"],
  ["protect", "Mbrojtje", "shield-checkmark-outline"], ["care", "Kujdes", "hand-left-outline"], ["scout", "Vëzhgim", "eye-outline"],
  ["prune", "Krasitje", "cut-outline"], ["harvest", "Vjelje", "basket-outline"], ["other", "Tjetër", "ellipsis-horizontal"]];
const PRIO = [["low", "Ulët"], ["normal", "Normal"], ["high", "I lartë"]];

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
      <Text style={[s.sub, { marginTop: 2 }]}>Caktoni punën në fushë, afatin dhe personin përgjegjës.</Text>

      <Field label="Detyra" value={f.title} onChangeText={set("title")} placeholder="P.sh. Ujitja e parcelës 1" />
      <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={set("plot")} />

      <Text style={s.label}>Lloji</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {TYPES.map(([k, t, icon]) => (
          <TouchableOpacity key={k} onPress={() => set("type")(k)} style={[s.chip, { paddingHorizontal: 11, paddingVertical: 8, backgroundColor: f.type === k ? C.brand : "#fff", borderWidth: 1, borderColor: f.type === k ? C.brand : C.line, marginRight: 8, marginBottom: 8 }]} activeOpacity={0.85}>
            <Ionicons name={icon} size={13} color={f.type === k ? "#fff" : C.sub} />
            <Text style={[s.chipT, { color: f.type === k ? "#fff" : C.sub }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Afati" value={f.due} onChangeText={set("due")} placeholder="2026-11-25" />
      <Lookup title="Përgjegjësi (fermer)" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={set("farmer")} />

      <Text style={s.label}>Prioriteti</Text>
      <Segmented options={PRIO} value={f.priority} onChange={set("priority")} />

      <Field label="Shënim" value={f.notes} onChangeText={set("notes")} multiline placeholder="Udhëzime për kryerjen" />
      {!!err && <ErrorBox message={err} />}
      <Btn title="Ruaj detyrën" icon="checkmark-circle-outline" onPress={save} busy={busy} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Tasks({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("tasks")
      .select("id,title,type,due_date,status,priority,notes,plots(name),farmers!tasks_assignee_farmer_id_fkey(first_name,last_name)")
      .eq("company_id", cid).order("due_date").limit(300);
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const t = today();
  const toggle = async (r) => { await sb.from("tasks").update({ status: r.status === "done" ? "open" : "done" }).eq("id", r.id); load(); };
  const del = (r) => Alert.alert("Fshi detyrën?", r.title, [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("tasks").delete().eq("id", r.id); load(); } },
  ]);
  const canWrite = role !== "fermer";
  const canDelete = role === "admin" || role === "staf";

  const open = rows.filter((r) => r.status === "open");
  const overdue = open.filter((r) => r.due_date < t);
  const todayTasks = open.filter((r) => r.due_date === t);
  const done = rows.filter((r) => r.status === "done");

  const base = filter === "done" ? done : filter === "overdue" ? overdue : filter === "today" ? todayTasks : open;
  const list = base.filter((r) => !q.trim() || `${r.title} ${r.plots?.name || ""}`.toLowerCase().includes(q.trim().toLowerCase()));

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
                <Text style={s.h1}>Detyrat</Text>
                <Text style={s.mute}>{open.length} të hapura · {overdue.length} të vonuara</Text>
              </View>
            </View>

            <Kpis style={{ marginTop: 12 }}>
              <Stat icon="today-outline" label="Sot" value={todayTasks.length} sub="për t'u kryer" onPress={() => setFilter("today")} />
              <Stat icon="alarm-outline" label="Të vonuara" value={overdue.length} sub="kërkojnë vëmendje" tone={overdue.length ? "danger" : "ok"} onPress={() => setFilter("overdue")} />
            </Kpis>

            <SearchBar value={q} onChange={setQ} placeholder="Kërko detyrë…" />
            <View style={{ marginTop: 10 }}>
              <Segmented options={[["open", "Të hapura"], ["today", "Sot"], ["overdue", "Të vonuara"], ["done", "Të kryera"]]} value={filter} onChange={setFilter} />
            </View>
            {!!err && <ErrorBox message={"Detyrat nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="checkbox-outline"
            title={q ? "Asnjë rezultat" : filter === "done" ? "Asnjë detyrë e kryer" : "Asnjë detyrë këtu"}
            text={q ? "Provo një fjalë tjetër." : "Krijoni detyra për ujitje, plehërim, mbrojtje ose vjelje dhe caktojini fermerëve."}
            action={canWrite ? <Btn title="Detyrë e re" icon="add" onPress={onNew} /> : null}
          />
        )}
        renderItem={({ item: r }) => {
          const late = r.status === "open" && r.due_date < t;
          const type = TYPES.find((x) => x[0] === r.type) || TYPES[TYPES.length - 1];
          return (
            <Card onLongPress={() => canDelete && del(r)} style={{ opacity: r.status === "done" ? 0.62 : 1 }}>
              <View style={s.listRow}>
                <TouchableOpacity onPress={() => toggle(r)} hitSlop={10}>
                  <Ionicons name={r.status === "done" ? "checkmark-circle" : "ellipse-outline"} size={26} color={r.status === "done" ? C.ok : late ? C.red : C.mute} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: C.ink, fontSize: 15, textDecorationLine: r.status === "done" ? "line-through" : "none" }} numberOfLines={2}>{r.title}</Text>
                  <Text style={s.mute} numberOfLines={1}>
                    {type[1]}{r.plots?.name ? ` · ${r.plots.name}` : ""}{r.farmers ? ` · ${r.farmers.first_name} ${r.farmers.last_name}` : ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <Chip label={dShort(r.due_date)} tone={late ? "danger" : r.due_date === t ? "warn" : "neutral"} icon="calendar-outline" />
                  {r.status !== "done" && <Text style={[s.mute, { fontSize: 11, color: late ? C.red : C.mute }]}>{dueLabel(r.due_date)}</Text>}
                  {r.priority === "high" && <Chip label="I lartë" tone="danger" />}
                </View>
              </View>
              {!!r.notes && <Text style={[s.mute, { marginTop: 8 }]}>{r.notes}</Text>}
            </Card>
          );
        }}
      />
      {canWrite && <FAB label="Detyrë" onPress={onNew} />}
    </View>
  );
}
