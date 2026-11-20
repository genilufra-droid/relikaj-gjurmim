// Menaxhim përdoruesish (vetëm admin): krijim përmes funksionit admin-users,
// kontaktet e anëtarëve (email/telefon/hyrja e fundit) dhe rivendosja e fjalëkalimit.
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { sb } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import Lookup, { LOOKUPS } from "./Lookup";
import { RESET_REDIRECT } from "./auth/links";
import { s, C, Field, Btn, Card, Chip, InfoBox, ErrorBox, SectionTitle, dFull } from "./ui";

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
const SYNTHETIC = /@login\.relikaj\.al$/i;

const tempPassword = () => {
  const abc = "abcdefghjkmnpqrstuvwxyz", num = "23456789";
  let t = "";
  for (let i = 0; i < 6; i++) t += abc[Math.floor(Math.random() * abc.length)];
  for (let i = 0; i < 3; i++) t += num[Math.floor(Math.random() * num.length)];
  return t + "R" + num[Math.floor(Math.random() * num.length)];
};

export default function Users({ cid, me }) {
  const [rows, setRows] = useState([]), [contacts, setContacts] = useState({});
  const [form, setForm] = useState(false), [act, setAct] = useState(null);
  const [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const [busy, setBusy] = useState(false), [newPass, setNewPass] = useState("");
  const [f, setF] = useState({ username: "", email: "", password: "", name: "", role: "grumbullues", farmer: null });

  const load = useCallback(async () => {
    const { data } = await sb.from("members").select("user_id,name,role,active").eq("company_id", cid).order("name");
    setRows(data || []);
    const { data: ct } = await sb.rpc("member_contacts", { p_company: cid });
    const map = {};
    (ct || []).forEach((c) => { map[c.user_id] = c; });
    setContacts(map);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setMsg(""); setErr("");
    try {
      await call({ action: "create", company_id: cid, username: f.username, email: f.email, password: f.password, name: f.name, role: f.role, farmer_id: f.farmer });
      setForm(false); setF({ username: "", email: "", password: "", name: "", role: "grumbullues", farmer: null }); load();
    } catch (e) { setErr(e.message); }
  };
  const toggle = async (r) => { try { await call({ action: "set_active", company_id: cid, user_id: r.user_id, active: !r.active }); load(); } catch (e) { setErr(e.message); } };

  const sendLink = async () => {
    setErr(""); setMsg(""); setBusy(true);
    const email = contacts[act.user_id]?.email || "";
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg(`Lidhja e rivendosjes u dërgua në ${email}. Vlen 60 minuta dhe hap vetëm një herë.`);
  };

  const setTemp = async () => {
    setErr(""); setMsg(""); setBusy(true);
    const pass = tempPassword();
    try {
      await call({ action: "reset_password", company_id: cid, user_id: act.user_id, password: pass });
      setNewPass(pass);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (form) return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Përdorues i ri</Text>
      <Field label="Emri" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
      <Field label="Email (rekomandohet — lejon rivendosjen vetë)" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Emri i përdoruesit (a-z, 0-9)" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} autoCapitalize="none" />
      <Field label="Fjalëkalimi fillestar (min. 8)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
      <Text style={s.label}>Roli</Text>
      {ROLES.map(([k, t]) => (
        <TouchableOpacity key={k} onPress={() => setF({ ...f, role: k })} style={[s.input, { marginBottom: 6 }, f.role === k && { backgroundColor: C.green }]}>
          <Text style={{ color: f.role === k ? "#fff" : C.text }}>{t}</Text>
        </TouchableOpacity>
      ))}
      {f.role === "fermer" && <Lookup title="Fermeri i lidhur" cid={cid} cfg={LOOKUPS.farmer} value={f.farmer} onChange={(id) => setF({ ...f, farmer: id })} />}
      {!!err && <ErrorBox message={err} />}
      <Btn title="Krijo" onPress={create} busy={busy} />
      <Btn title="Anulo" alt onPress={() => setForm(false)} />
    </ScrollView>
  );

  if (act) {
    const ct = contacts[act.user_id] || {};
    const synthetic = SYNTHETIC.test(ct.email || "");
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>{act.name || "Përdorues"}</Text>
        <Text style={s.sub}>{ct.email || "Pa email të regjistruar"}</Text>

        <SectionTitle>Rivendos fjalëkalimin</SectionTitle>
        {!synthetic && !!ct.email && (
          <Btn title="Dërgo lidhje në email" icon="mail-outline" onPress={sendLink} busy={busy} />
        )}
        {synthetic && (
          <InfoBox icon="information-circle" tone="warn">
            Kjo llogari hyn me emër përdoruesi dhe email-i i saj është i brendshëm, pra lidhja në email nuk arrin te punonjësi. Përdorni fjalëkalimin e përkohshëm më poshtë ose rikrijoni llogarinë me email të vërtetë.
          </InfoBox>
        )}
        <Btn title="Vendos fjalëkalim të përkohshëm" alt icon="key-outline" onPress={setTemp} busy={busy} />

        {!!newPass && (
          <Card style={{ marginTop: 12 }}>
            <Text style={s.mute}>Fjalëkalimi i ri i përkohshëm</Text>
            <Text selectable style={{ fontSize: 22, fontWeight: "800", letterSpacing: 1.5, color: C.brand, marginVertical: 6 }}>{newPass}</Text>
            <Text style={s.mute}>Jepjani punonjësit; ai e ndryshon vetë te «Profili» pas hyrjes.</Text>
          </Card>
        )}
        {!!err && <ErrorBox message={err} />}
        {!!msg && <InfoBox icon="checkmark-circle">{msg}</InfoBox>}
        <Btn title="Mbylle" alt onPress={() => { setAct(null); setNewPass(""); setMsg(""); setErr(""); }} />
      </ScrollView>
    );
  }

  return (
    <FlatList style={s.screen} contentContainerStyle={s.pad} data={rows} keyExtractor={(r) => r.user_id}
      ListHeaderComponent={
        <View>
          <Text style={s.h1}>Përdoruesit</Text>
          <Btn title="+ Përdorues i ri" onPress={() => { setErr(""); setForm(true); }} />
          {!!err && <ErrorBox message={err} />}
        </View>
      }
      renderItem={({ item: r }) => {
        const ct = contacts[r.user_id] || {};
        return (
          <Card onPress={() => { setErr(""); setMsg(""); setNewPass(""); setAct(r); }} style={{ marginTop: 10 }}>
            <View style={s.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "800" }}>{r.name || "(pa emër)"}</Text>
                <Text style={s.mute} numberOfLines={1}>{ct.email || "pa email"}{ct.phone ? ` · ${ct.phone}` : ""}</Text>
                {!!ct.last_sign_in && <Text style={s.mute}>Hyrja e fundit: {dFull(ct.last_sign_in.slice(0, 10))}</Text>}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Chip label={r.role} tone={r.active ? "brand" : "neutral"} />
                {r.user_id !== me && (
                  <TouchableOpacity onPress={() => toggle(r)} hitSlop={8}>
                    <Text style={{ color: C.green, fontWeight: "700", fontSize: 12 }}>{r.active ? "Çaktivizo" : "Aktivizo"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        );
      }} />
  );
}
