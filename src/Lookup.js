// Fushë kërkimi me «+ Shto»: nëse nuk gjendet rezultat, krijohet dhe ruhet aty për aty.
import React, { useEffect, useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import { sb } from "./supabase";
import { C, s, Btn } from "./ui";

// cfg: { table, label(row), search: ['kolona'], create(text) -> objekt për insert, order }
export default function Lookup({ title, cid, cfg, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [cur, setCur] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) { setCur(null); return; }
    sb.from(cfg.table).select("*").eq("id", value).maybeSingle().then(({ data }) => setCur(data));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let qb = sb.from(cfg.table).select("*").eq("company_id", cid).eq("active", true).limit(30);
    const t = q.trim().replace(/[%,()]/g, "");
    if (t) qb = qb.or(cfg.search.map((c) => `${c}.ilike.%${t}%`).join(","));
    qb.order(cfg.order || cfg.search[0]).then(({ data, error }) => { setErr(error ? "Kërkimi dështoi" : ""); setRows(data || []); });
  }, [open, q]);

  const add = async () => {
    setBusy(true); setErr("");
    const { data, error } = await sb.from(cfg.table).insert({ company_id: cid, ...cfg.create(q.trim()) }).select().single();
    setBusy(false);
    if (error) { setErr("Nuk u ruajt: " + (error.message || "gabim")); return; }
    pick(data);
  };
  const pick = (r) => { setCur(r); onChange(r.id, r); setOpen(false); setQ(""); };

  return (
    <View>
      <Text style={s.label}>{title}</Text>
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ color: cur ? C.text : C.mute, fontSize: 16 }}>{cur ? cfg.label(cur) : "Zgjidh…"}</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[s.screen, s.pad, { paddingTop: 48 }]}>
          <Text style={s.h1}>{title}</Text>
          <TextInput style={s.input} autoFocus placeholder="Kërko…" value={q} onChangeText={setQ} />
          {!!err && <Text style={s.err}>{err}</Text>}
          <FlatList
            style={{ marginTop: 10 }} data={rows} keyExtractor={(r) => String(r.id)} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={s.card} onPress={() => pick(item)}><Text style={{ fontSize: 16, color: C.text }}>{cfg.label(item)}</Text></TouchableOpacity>
            )}
            ListFooterComponent={q.trim() ? <Btn title={`+ Shto «${q.trim()}»`} onPress={add} busy={busy} /> : null}
            ListEmptyComponent={<Text style={s.mute}>Asnjë rezultat. {q.trim() ? "Shtypni «+ Shto» për ta krijuar." : "Shkruani për të kërkuar ose shtuar."}</Text>}
          />
          <Btn title="Mbyll" alt onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const splitName = (t) => { const p = t.split(/\s+/); return { first_name: p[0], last_name: p.slice(1).join(" ") }; };
export const LOOKUPS = {
  customer: { table: "customers", search: ["name"], label: (r) => r.name + (r.country ? ` (${r.country})` : ""), create: (t) => ({ name: t }) },
  farmer: { table: "farmers", search: ["first_name", "last_name"], label: (r) => `${r.first_name} ${r.last_name}`.trim(), create: splitName },
  zone: { table: "zones", search: ["code"], label: (r) => r.code + (r.fair_wild ? " (Fair Wild)" : ""), create: (t) => ({ code: t, fair_wild: /F\b/i.test(t) }) },
  product: { table: "products", search: ["name", "code"], label: (r) => `${r.code ? r.code + " · " : ""}${r.name}`, create: (t) => { const m = /^(\d+)\s+(.+)$/.exec(t); return m ? { code: m[1], name: m[2] } : { name: t }; } },
};
