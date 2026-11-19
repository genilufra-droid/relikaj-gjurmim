import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { sb } from "./src/supabase";
import { s, C, Btn } from "./src/ui";
import Login from "./src/Login";
import Purchases, { PurchaseForm } from "./src/Purchases";
import Stock, { StockForm } from "./src/Stock";
import Reports from "./src/Reports";
import Samples, { SampleForm } from "./src/Samples";
import Users from "./src/Users";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [mem, setMem] = useState(null);          // [{company_id, role, companies:{name}}]
  const [cur, setCur] = useState(null);
  const [tab, setTab] = useState("blerje");
  const [form, setForm] = useState(null);        // 'blerje' | 'magazine' | null
  const [err, setErr] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, sess) => { setSession(sess); if (!sess) { setMem(null); setCur(null); } });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setErr("");
      const { data: pa } = await sb.rpc("is_platform_admin");
      let q = sb.from("members").select("company_id,role,companies(name)").eq("user_id", session.user.id).eq("active", true);
      const { data, error } = await q;
      if (error) { setErr("Kompanitë nuk u ngarkuan"); return; }
      let list = data || [];
      if (pa) {     // administratori i platformës zgjedh çdo kompani si admin
        const { data: all } = await sb.from("companies").select("id,name").eq("active", true).order("name");
        list = (all || []).map((c) => ({ company_id: c.id, role: "admin", companies: { name: c.name } }));
      }
      setMem(list);
      if (list.length === 1) setCur(list[0]);
    })();
  }, [session]);

  if (session === undefined) return <View style={[s.screen, { justifyContent: "center" }]}><ActivityIndicator color={C.green} /></View>;
  if (!session) return <Login />;
  const out = <Btn title="Dil" alt onPress={() => sb.auth.signOut()} />;
  if (err) return <SafeAreaView style={[s.screen, s.pad]}><Text style={s.err}>{err}</Text>{out}</SafeAreaView>;
  if (!mem) return <View style={[s.screen, { justifyContent: "center" }]}><ActivityIndicator color={C.green} /></View>;
  if (!cur) return (
    <SafeAreaView style={[s.screen, s.pad]}>
      <Text style={s.h1}>Zgjidhni kompaninë</Text>
      {mem.length === 0 && <Text style={s.mute}>Kjo llogari nuk i përket asnjë kompanie aktive. Kontaktoni administratorin.</Text>}
      {mem.map((m) => (
        <TouchableOpacity key={m.company_id} style={s.card} onPress={() => setCur(m)}>
          <Text style={{ fontSize: 16, color: C.text }}>{m.companies?.name}</Text><Text style={s.mute}>{m.role}</Text>
        </TouchableOpacity>
      ))}
      {out}
    </SafeAreaView>
  );

  const cid = cur.company_id, role = cur.role;
  const tabs = [["blerje", "Blerjet"], ["magazine", "Magazina"], ["raporte", "Raporte"], ...(role === "admin" || role === "staf" ? [["mostra", "Mostra"]] : []), ...(role === "admin" ? [["perdorues", "Përdorues"]] : []), ["dil", "Dil"]];
  const done = () => setForm(null);
  let body;
  if (form === "blerje") body = <PurchaseForm cid={cid} onDone={done} />;
  else if (form === "mostra") body = <SampleForm cid={cid} onDone={done} />;
  else if (form === "magazine") body = <StockForm cid={cid} onDone={done} />;
  else if (tab === "blerje") body = <Purchases key={cid} cid={cid} role={role} onNew={() => setForm("blerje")} />;
  else if (tab === "magazine") body = <Stock key={cid} cid={cid} role={role} onNew={() => setForm("magazine")} />;
  else if (tab === "mostra") body = <Samples key={cid} cid={cid} onNew={() => setForm("mostra")} />;
  else if (tab === "raporte") body = <Reports cid={cid} />;
  else body = <Users cid={cid} me={session.user.id} />;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[s.row, { padding: 10, paddingHorizontal: 16 }]}>
        <Text style={{ color: C.text, fontWeight: "700" }}>{cur.companies?.name}</Text>
        {mem.length > 1 && <TouchableOpacity onPress={() => { setCur(null); setForm(null); }}><Text style={{ color: C.green }}>Ndrysho</Text></TouchableOpacity>}
      </View>
      <View style={{ flex: 1 }}>{body}</View>
      <View style={s.tabs}>
        {tabs.map(([k, t]) => (
          <TouchableOpacity key={k} style={s.tab} onPress={() => (k === "dil" ? sb.auth.signOut() : (setForm(null), setTab(k)))}>
            <Text style={{ color: tab === k && !form ? C.green : C.mute, fontWeight: tab === k ? "700" : "400", fontSize: 12 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
