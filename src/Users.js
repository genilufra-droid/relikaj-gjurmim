// Menaxhim përdoruesish (vetëm admin): krijim përmes funksionit admin-users.
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { sb } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Field, Btn } from "./ui";

async function call(body) {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY }, body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Veprimi dështoi");
  return j;
}
const ROLES = [["admin", "Admin"], ["staf", "Staf"], ["grumbullues", "Grumbullues"], ["fermer", "Fermer"]];

export default function Users({ cid, me }) {
  const [rows, setRows] = useState([]), [form, setForm] = useState(false), [msg, setMsg] = useState("");
  const [f, setF] = useState({ username: "", password: "", name: "", role: "grumbullues", farmer: null });
  const load = useCallback(async () => {
    const { data } = await sb.from("members").select("user_id,name,role,active").eq("company_id", cid).order("name");
    setRows(data || []);
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const create = async () => {
    setMsg("");
    try {
      await call({ action: "create", company_id: cid, username: f.username, password: f.password, name: f.name, role: f.role, farmer_id: f.farmer });
      setForm(false); setF({ username: "", password: "", name: "", role: "grumbullues", farmer: null }); load();
    } catch (e) { setMsg(e.message); }
  };
  const toggle = async (r) => { try { await call({ action: "set_active", company_id: cid, user_id: r.user_id, active: !r.active }); load(); } catch (e) { setMsg(e.message); } };
  if (form) return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Përdorues i ri</Text>
      <Field label="Emri" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
      <Field label="Emri i përdoruesit (a-z, 0-9)" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} autoCapitalize="none" />
      <Field label="Fjalëkalimi (min. 8)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
      <Text style={s.label}>Roli</Text>
      {ROLES.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => setF({ ...f, role: k })} style={[s.input, { marginBottom: 6 }, f.role === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.role === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      {f.role === "fermer" && <Lookup title="Fermeri i lidhur" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={(id) => setF({ ...f, farmer: id })} />}
      {!!msg && <Text style={s.err}>{msg}</Text>}
      <Btn title="Krijo" onPress={create} />
      <Btn title="Anulo" alt onPress={() => setForm(false)} />
    </ScrollView>
  );
  return (
    <FlatList style={s.screen} contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => r.user_id}
      ListHeaderComponent={<View><Text style={s.h1}>Përdoruesit</Text><Btn title="+ Përdorues i ri" onPress={() => setForm(true)} />{!!msg && <Text style={s.err}>{msg}</Text>}</View>}
      renderItem={({ item: r }) => (
        <View style={[s.card, s.row, { marginTop: 10 }]}>
          <View><Text style={{ color: C.text, fontWeight: "700" }}>{r.name || "(pa emër)"}</Text><Text style={s.mute}>{r.role}{r.active ? "" : " · joaktiv"}</Text></View>
          {r.user_id !== me && <TouchableOpacity onPress={() => toggle(r)}><Text style={{ color: C.green }}>{r.active ? "Çaktivizo" : "Aktivizo"}</Text></TouchableOpacity>}
        </View>
      )} />
  );
}
