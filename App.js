import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { sb } from "./src/supabase";
import { s, C, Btn } from "./src/ui";
import Login from "./src/Login";
import Dashboard from "./src/Dashboard";
import Plots, { PlotForm } from "./src/Plots";
import Cultivations, { CultivationForm } from "./src/Cultivations";
import Tasks, { TaskForm } from "./src/Tasks";
import Observations, { ObservationForm } from "./src/Observations";
import Inputs, { InputForm } from "./src/Inputs";
import Land, { LandForm } from "./src/Land";
import Purchases, { PurchaseForm } from "./src/Purchases";
import Stock, { StockForm } from "./src/Stock";
import Reports from "./src/Reports";
import Samples, { SampleForm } from "./src/Samples";
import Users from "./src/Users";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [mem, setMem] = useState(null);          // [{company_id, role, companies:{name}}]
  const [cur, setCur] = useState(null);
  const [tab, setTab] = useState("pasqyra");
  const [form, setForm] = useState(null);        // formular aktiv ose null
  const [land, setLand] = useState("qira");      // nënndarja e «Toka»: qira | pagesa | kujtues
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
  const tabs = [["pasqyra", "Pasqyra"], ["parcelat", "Parcelat"], ["kultivimet", "Kultivimet"], ["detyra", "Detyrat"], ["vezhgime", "Vëzhgimet"], ["inpute", "Inputet"], ["toka", "Toka"], ["blerje", "Blerjet"], ["magazine", "Magazina"], ["raporte", "Raporte"], ...(role === "admin" || role === "staf" ? [["mostra", "Mostra"]] : []), ...(role === "admin" ? [["perdorues", "Përdorues"]] : []), ["dil", "Dil"]];
  const done = () => setForm(null);
  const go = (k) => { setForm(null); setTab(k); };
  let body;
  if (form === "blerje") body = <PurchaseForm cid={cid} onDone={done} />;
  else if (form === "mostra") body = <SampleForm cid={cid} onDone={done} />;
  else if (form === "magazine") body = <StockForm cid={cid} onDone={done} />;
  else if (form === "parcela") body = <PlotForm cid={cid} onDone={done} />;
  else if (form === "kultivim") body = <CultivationForm cid={cid} onDone={done} />;
  else if (form === "detyre") body = <TaskForm cid={cid} onDone={done} />;
  else if (form === "vezhgim") body = <ObservationForm cid={cid} onDone={done} />;
  else if (form === "input") body = <InputForm cid={cid} onDone={done} />;
  else if (form === "qira" || form === "pagesa" || form === "kujtues") body = <LandForm cid={cid} mode={form} onDone={done} />;
  else if (tab === "pasqyra") body = <Dashboard key={cid} cid={cid} onGo={go} />;
  else if (tab === "parcelat") body = <Plots key={cid} cid={cid} role={role} onNew={() => setForm("parcela")} />;
  else if (tab === "kultivimet") body = <Cultivations key={cid} cid={cid} role={role} onNew={() => setForm("kultivim")} />;
  else if (tab === "detyra") body = <Tasks key={cid} cid={cid} role={role} onNew={() => setForm("detyre")} />;
  else if (tab === "vezhgime") body = <Observations key={cid} cid={cid} role={role} onNew={() => setForm("vezhgim")} />;
  else if (tab === "inpute") body = <Inputs key={cid} cid={cid} role={role} onNew={() => setForm("input")} />;
  else if (tab === "toka") body = (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        {[["qira", "Qiratë"], ["pagesa", "Pagesat"], ["kujtues", "Kujtuesit"]].map(([k, tt]) => (
          <TouchableOpacity key={k} onPress={() => setLand(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: land === k ? C.green : "#fff", borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: land === k ? "#fff" : C.text, fontWeight: "600", fontSize: 13 }}>{tt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Land key={cid + land} cid={cid} role={role} part={land} onNew={() => setForm(land)} />
    </View>
  );
  else if (tab === "blerje") body = <Purchases key={cid} cid={cid} role={role} onNew={() => setForm("blerje")} />;
  else if (tab === "magazine") body = <Stock key={cid} cid={cid} role={role} onNew={() => setForm("magazine")} />;
  else if (tab === "mostra") body = <Samples key={cid} cid={cid} onNew={() => setForm("mostra")} />;
  else if (tab === "raporte") body = <Reports cid={cid} />;
  else body = <Users cid={cid} me={session.user.id} />;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.green }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.green} />
      <View style={[s.header, s.row]}>
        <View>
          <Text style={s.headerS}>BIOBES FARM</Text>
          <Text style={s.headerT}>{cur.companies?.name}</Text>
        </View>
        {mem.length > 1 && <TouchableOpacity onPress={() => { setCur(null); setForm(null); }}><Text style={{ color: "#fff", fontWeight: "600" }}>Ndrysho</Text></TouchableOpacity>}
      </View>
      <View style={{ flex: 1, backgroundColor: C.bg }}>{body}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ flexGrow: 1 }}>
        {tabs.map(([k, t]) => (
          <TouchableOpacity key={k} style={[s.tab, { flex: 1, minWidth: 72 }, tab === k && !form && k !== "dil" && s.tabOn]} onPress={() => (k === "dil" ? sb.auth.signOut() : (setForm(null), setTab(k)))}>
            <Text style={{ color: tab === k && !form ? C.green : C.mute, fontWeight: tab === k ? "700" : "400", fontSize: 12, letterSpacing: 0.3 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
