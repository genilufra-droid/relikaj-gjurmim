// Pasqyra (dashboard) si Cropin: statistika, alarme, moti 5 ditë, detyrat e javës.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { sb } from "./supabase";
import { s, C, fmt, today } from "./ui";

const WDAY = ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"];

function Stat({ v, t }) {
  return <View style={[s.card, { flex: 1, minWidth: "45%" }]}><Text style={{ fontSize: 24, fontWeight: "800", color: C.green }}>{v}</Text><Text style={s.mute}>{t}</Text></View>;
}

export default function Dashboard({ cid, onGo }) {
  const [st, setSt] = useState(null), [tasks, setTasks] = useState([]), [obs, setObs] = useState([]);
  const [wx, setWx] = useState(null), [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr("");
    const [{ data: d, error: e1 }, { data: t }, { data: o }] = await Promise.all([
      sb.from("dashboard_stats").select("*").eq("company_id", cid).maybeSingle(),
      sb.from("tasks").select("id,title,due_date,status,plots(name)").eq("company_id", cid).eq("status", "open").order("due_date").limit(7),
      sb.from("observations").select("id,kind,severity,date,plots(name)").eq("company_id", cid).eq("resolved", false).order("date", { ascending: false }).limit(5),
    ]);
    if (e1) setErr("Statistikat nuk u ngarkuan");
    setSt(d || null); setTasks(t || []); setObs(o || []);
    // Moti: Open-Meteo (pa çelës), për koordinatat e Shqipërisë (Durrës si parazgjedhje)
    try {
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.32&longitude=19.45&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max&timezone=Europe%2FTirane&forecast_days=5");
      const j = await r.json();
      if (j && j.daily) setWx(j.daily);
    } catch (_e) { /* moti është shtesë, mos blloko pasqyrën */ }
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  const t = today();
  const alerts = [];
  if (st && st.tasks_overdue > 0) alerts.push(["bad", `${st.tasks_overdue} detyra të vonuara`, "Shiko te Detyrat"]);
  if (st && st.observations_open > 0) alerts.push(["warn", `${st.observations_open} vëzhgime të hapura`, "Shiko te Vëzhgimet"]);
  if (st && st.reminders_overdue > 0) alerts.push(["warn", `${st.reminders_overdue} kujtues të pambyllur`, "Shiko te Detyrat"]);
  if (wx) {
    const frost = wx.time.findIndex((d, i) => wx.temperature_2m_min[i] <= 1);
    if (frost >= 0) alerts.push(["warn", `Rrezik acari më ${wx.time[frost].slice(8)}/${wx.time[frost].slice(5, 7)} (${fmt(wx.temperature_2m_min[frost])}°C)`, "Mbro bimët e ndjeshme"]);
    const heat = wx.time.findIndex((d, i) => wx.temperature_2m_max[i] >= 35);
    if (heat >= 0) alerts.push(["warn", `Nxehtësi më ${wx.time[heat].slice(8)}/${wx.time[heat].slice(5, 7)} (${fmt(wx.temperature_2m_max[heat])}°C)`, "Ujit herët në mëngjes"]);
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>Pasqyra</Text>
      {!!err && <Text style={s.err}>{err}</Text>}
      {st && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Stat v={fmt(st.area_ha)} t={`hektarë · ${st.plots} parcela`} />
          <Stat v={st.cultivations_active} t="Kultivime aktive" />
          <Stat v={st.tasks_open} t={`Detyra të hapura (${st.tasks_overdue} të vonuara)`} />
          <Stat v={st.observations_open} t="Vëzhgime të hapura" />
          <Stat v={fmt(st.inputs_year)} t="Inpute këtë vit (lekë)" />
          <Stat v={fmt(st.purchases_year)} t="Blerje këtë vit (lekë)" />
        </View>
      )}
      {alerts.length > 0 && <Text style={[s.label, { marginTop: 18 }]}>Alarme</Text>}
      {alerts.map(([sev, title, text], i) => (
        <View key={i} style={[s.card, { borderLeftWidth: 4, borderLeftColor: sev === "bad" ? C.red : "#a96a0c" }]}>
          <Text style={{ fontWeight: "700", color: C.text }}>{title}</Text><Text style={s.mute}>{text}</Text>
        </View>
      ))}
      <Text style={[s.label, { marginTop: 18 }]}>Moti — 5 ditët e ardhshme</Text>
      {wx ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {wx.time.map((d, i) => (
            <View key={d} style={[s.card, { flex: 1, alignItems: "center", padding: 8 }]}>
              <Text style={s.mute}>{d === t ? "Sot" : WDAY[new Date(d + "T00:00:00Z").getUTCDay()]}</Text>
              <Text style={{ fontWeight: "800", fontSize: 16, color: C.text }}>{fmt(wx.temperature_2m_max[i])}°</Text>
              <Text style={s.mute}>{fmt(wx.temperature_2m_min[i])}° · {fmt(wx.precipitation_sum[i])} mm</Text>
            </View>
          ))}
        </View>
      ) : <Text style={s.mute}>Moti nuk u ngarkua (pa internet?).</Text>}
      <Text style={[s.label, { marginTop: 18 }]}>Detyrat e ardhshme</Text>
      {tasks.length === 0 && <Text style={s.mute}>Asnjë detyrë e hapur.</Text>}
      {tasks.map((x) => (
        <TouchableOpacity key={x.id} style={s.card} onPress={() => onGo && onGo("detyra")}>
          <View style={s.row}><Text style={{ fontWeight: "700", color: C.text, flex: 1 }}>{x.title}</Text><Text style={{ color: x.due_date < t ? C.red : C.mute }}>{x.due_date < t ? "e vonuar" : x.due_date}</Text></View>
          {!!x.plots && <Text style={s.mute}>{x.plots.name}</Text>}
        </TouchableOpacity>
      ))}
      <Text style={[s.label, { marginTop: 18 }]}>Vëzhgimet e fundit</Text>
      {obs.length === 0 && <Text style={s.mute}>Asnjë vëzhgim i hapur.</Text>}
      {obs.map((o) => (
        <View key={o.id} style={s.card}>
          <View style={s.row}><Text style={{ fontWeight: "700", color: C.text }}>{o.kind}</Text><Text style={s.mute}>{o.date}</Text></View>
          <Text style={s.mute}>Ashpërsia {o.severity}/3{!!o.plots ? ` · ${o.plots.name}` : ""}</Text>
        </View>
      ))}
      <Text style={[s.mute, { marginTop: 18, fontSize: 12 }]}>Moti: Open-Meteo (pa çelës). Koordinatat e parazgjedhura: Durrës.</Text>
    </ScrollView>
  );
}
