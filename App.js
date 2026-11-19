import "./src/polyfills";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./src/supabase";
import { s, C, Btn, ErrorBox } from "./src/ui";
import Login from "./src/Login";
import Dashboard from "./src/Dashboard";
import Plots, { PlotForm } from "./src/Plots";
import Cultivations, { CultivationForm } from "./src/Cultivations";
import Tasks, { TaskForm } from "./src/Tasks";
import Observations, { ObservationForm } from "./src/Observations";
import Inputs, { InputForm } from "./src/Inputs";
import Land, { LandForm } from "./src/Land";
import Documents, { DocumentForm } from "./src/Documents";
import Purchases, { PurchaseForm } from "./src/Purchases";
import Stock, { StockForm } from "./src/Stock";
import Reports from "./src/Reports";
import Samples, { SampleForm } from "./src/Samples";
import Users from "./src/Users";
import Hub from "./src/Hub";
import Trace from "./src/Trace";
import Operations, { OperationForm, ApplicationForm } from "./src/Operations";
import Processing, { BatchForm } from "./src/Processing";
import Zones, { ZoneForm } from "./src/Zones";
import PlotDetail from "./src/PlotDetail";
import Reminders from "./src/Reminders";

const ROLE = { admin: "Administrator", staf: "Staf", grumbullues: "Grumbullues", fermer: "Fermer" };

export default function App() {
  const [session, setSession] = useState(undefined);
  const [mem, setMem] = useState(null);          // [{company_id, role, companies:{name}}]
  const [cur, setCur] = useState(null);
  const [tab, setTab] = useState("pasqyra");
  const [form, setForm] = useState(null);        // formular aktiv ose null
  const [land, setLand] = useState("qira");      // nënndarja e «Toka»
  const [work, setWork] = useState("punime");    // nënndarja e «Puna në tokë»
  const [zoneEdit, setZoneEdit] = useState(null); // zona që po ndryshohet
  const [plotId, setPlotId] = useState(null);    // kartela e parcelës e hapur
  const [err, setErr] = useState("");

  const loadMembers = async (sess) => {
    if (!sess) return;
    setErr("");
    const { data: pa } = await sb.rpc("is_platform_admin");
    const { data, error } = await sb.from("members").select("company_id,role,companies(name)").eq("user_id", sess.user.id).eq("active", true);
    if (error) { setErr("Kompanitë nuk u ngarkuan. Kontrolloni internetin."); return; }
    let list = data || [];
    if (pa) {
      const { data: all } = await sb.from("companies").select("id,name").eq("active", true).order("name");
      list = (all || []).map((c) => ({ company_id: c.id, role: "admin", companies: { name: c.name } }));
    }
    setMem(list);
    if (list.length === 1) setCur(list[0]);
  };

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, sess) => { setSession(sess); if (!sess) { setMem(null); setCur(null); } });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { loadMembers(session); }, [session]);

  if (session === undefined) return <View style={[s.screen, { justifyContent: "center" }]}><ActivityIndicator color={C.brand} /></View>;
  if (!session) return <Login />;
  if (err) {
    return (
      <SafeAreaView style={[s.screen, s.pad]}>
        <Text style={s.h1}>Problem lidhjeje</Text>
        <ErrorBox message={err} onRetry={() => loadMembers(session)} />
        <Btn title="Dil" alt icon="log-out-outline" onPress={() => sb.auth.signOut()} />
      </SafeAreaView>
    );
  }
  if (!mem) return <View style={[s.screen, { justifyContent: "center" }]}><ActivityIndicator color={C.brand} /></View>;

  if (!cur) {
    return (
      <SafeAreaView style={[s.screen]}>
        <StatusBar barStyle="light-content" backgroundColor={C.brand} />
        <View style={s.headerWrap}>
          <View style={[s.headerRow, { marginTop: 18 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={s.brandMark}><Ionicons name="leaf" size={20} color="#fff" /></View>
              <View>
                <Text style={s.headerS}>BIOBES FARM</Text>
                <Text style={s.headerT}>Zgjidhni kompaninë</Text>
              </View>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={s.pad}>
          {mem.length === 0 && (
            <View style={s.card}>
              <Text style={[s.h2, { marginBottom: 6 }]}>Nuk ka kompani</Text>
              <Text style={s.sub}>Kjo llogari nuk i përket asnjë kompanie aktive. Kërkojini administratorit t'ju shtojë.</Text>
            </View>
          )}
          {mem.map((m) => (
            <TouchableOpacity key={m.company_id} style={s.card} onPress={() => setCur(m)} activeOpacity={0.85}>
              <View style={s.listRow}>
                <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                  <Ionicons name="business-outline" size={19} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>{m.companies?.name}</Text>
                  <Text style={s.mute}>{ROLE[m.role] || m.role}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mute} />
              </View>
            </TouchableOpacity>
          ))}
          <Btn title="Dil" alt icon="log-out-outline" onPress={() => sb.auth.signOut()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cid = cur.company_id, role = cur.role;
  const staff = role === "admin" || role === "staf";
  const TABS = [
    ["pasqyra", "Pasqyra", "speedometer-outline"],
    ["parcelat", "Parcelat", "map-outline"],
    ["gjurmimi", "Gjurmimi", "git-branch-outline"],
    ["modulet", "Modulet", "grid-outline"],
    ["raporte", "Raporte", "bar-chart-outline"],
  ];
  const PRIMARY = ["pasqyra", "parcelat", "gjurmimi", "modulet", "raporte"];
  const done = () => setForm(null);
  const go = (k) => { setForm(null); setPlotId(null); setTab(k); };

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
  else if (form === "dokument") body = <DocumentForm cid={cid} onDone={done} />;
  else if (form === "punim") body = <OperationForm cid={cid} onDone={done} />;
  else if (form === "trajtim") body = <ApplicationForm cid={cid} onDone={done} />;
  else if (form === "batch") body = <BatchForm cid={cid} onDone={done} />;
  else if (form === "zone") body = <ZoneForm cid={cid} zone={zoneEdit} onDone={() => { setZoneEdit(null); done(); }} />;
  else if (plotId) body = <PlotDetail cid={cid} plotId={plotId} onGo={go} onBack={() => setPlotId(null)} />;
  else if (tab === "kujtuesit") body = <Reminders key={cid} cid={cid} onGo={go} />;
  else if (tab === "modulet") body = <Hub role={role} onGo={go} />;
  else if (tab === "gjurmimi") body = <Trace key={cid} cid={cid} />;
  else if (tab === "pasqyra") body = <Dashboard key={cid} cid={cid} role={role} onGo={go} />;
  else if (tab === "parcelat") body = <Plots key={cid} cid={cid} role={role} onNew={() => setForm("parcela")} onOpen={(id) => setPlotId(id)} />;
  else if (tab === "kultivimet") body = <Cultivations key={cid} cid={cid} role={role} onNew={() => setForm("kultivim")} />;
  else if (tab === "detyra") body = <Tasks key={cid} cid={cid} role={role} onNew={() => setForm("detyre")} />;
  else if (tab === "vezhgime") body = <Observations key={cid} cid={cid} role={role} onNew={() => setForm("vezhgim")} />;
  else if (tab === "inpute") body = <Inputs key={cid} cid={cid} role={role} onNew={() => setForm("input")} />;
  else if (tab === "puna") body = <Operations key={cid} cid={cid} role={role} part={work} onPart={setWork} onNew={() => setForm(work === "punime" ? "punim" : "trajtim")} />;
  else if (tab === "perpunimi") body = <Processing key={cid} cid={cid} role={role} onNew={() => setForm("batch")} />;
  else if (tab === "zonat") body = <Zones key={cid} cid={cid} role={role} onNew={() => { setZoneEdit(null); setForm("zone"); }} onEdit={(z) => { setZoneEdit(z); setForm("zone"); }} />;
  else if (tab === "toka") body = <Land key={cid} cid={cid} role={role} part={land} onPart={setLand} onNew={() => setForm(land)} />;
  else if (tab === "dokumente") body = <Documents key={cid} cid={cid} role={role} onNew={() => setForm("dokument")} />;
  else if (tab === "blerje") body = <Purchases key={cid} cid={cid} role={role} onNew={() => setForm("blerje")} />;
  else if (tab === "magazine") body = <Stock key={cid} cid={cid} role={role} onNew={() => setForm("magazine")} />;
  else if (tab === "mostra") body = <Samples key={cid} cid={cid} role={role} onNew={() => setForm("mostra")} />;
  else if (tab === "raporte") body = <Reports cid={cid} />;
  else body = <Users cid={cid} me={session.user.id} />;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.brand }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.brand} />
      <View style={s.headerWrap}>
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11, flex: 1 }}>
            <View style={s.brandMark}><Ionicons name="leaf" size={19} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.headerS}>BIOBES FARM</Text>
              <Text style={s.headerT} numberOfLines={1}>{cur.companies?.name}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={s.roleChip}>
              <Ionicons name="person-circle-outline" size={13} color="#EAF5E3" />
              <Text style={s.roleChipT}>{ROLE[role] || role}</Text>
            </View>
            {mem.length > 1 && (
              <TouchableOpacity onPress={() => { setCur(null); setForm(null); }} hitSlop={8}>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => sb.auth.signOut()} hitSlop={10} accessibilityLabel="Dil">
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {!form && plotId && (
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity style={s.backRow} onPress={() => setPlotId(null)} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={C.brand} />
            <Text style={s.backT}>Parcelat</Text>
          </TouchableOpacity>
        </View>
      )}

      {!form && !plotId && !PRIMARY.includes(tab) && (
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity style={s.backRow} onPress={() => go("modulet")} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={C.brand} />
            <Text style={s.backT}>Modulet</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!form && (
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity style={s.backRow} onPress={done} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={C.brand} />
            <Text style={s.backT}>Kthehu</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1, backgroundColor: C.bg }}>{body}</View>

      <View style={s.tabs}>
        {TABS.map(([k, title, icon]) => {
          const on = k !== "dil" && (tab === k || (k === "modulet" && !PRIMARY.includes(tab)));
          return (
            <TouchableOpacity key={k} style={[s.tab, on && s.tabOn]} onPress={() => (k === "dil" ? sb.auth.signOut() : go(k))} activeOpacity={0.8}>
              <View style={s.tabIc}>
                <Ionicons name={icon} size={21} color={on ? C.brand : C.mute} />
              </View>
              <Text style={[s.tabT, on && s.tabTOn]} numberOfLines={1}>{title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
