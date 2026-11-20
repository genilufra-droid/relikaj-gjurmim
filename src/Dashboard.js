// Pasqyra: KPI, alarme, moti 5-ditor, detyrat dhe vëzhgimet e fundit.
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Card, Chip, ErrorBox, Kpis, Loading, SectionTitle, Stat, fmt, money, dShort, dueLabel } from "./ui";

const WDAY = ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"];
const hero = {
  wrap: { flexDirection: "row", backgroundColor: C.brandDark, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 6, marginTop: 14 },
  cell: { flex: 1, paddingHorizontal: 12 },
  cellLine: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.16)" },
  label: { color: "#A9CF97", fontSize: 10, letterSpacing: 1.1, fontWeight: "700" },
  value: { color: "#fff", fontSize: 19, fontWeight: "800", marginTop: 4 },
};
const KIND_LABEL = { pest: "Dëmtues", disease: "Sëmundje", weed: "Barëra", stress: "Stres", damage: "Dëmtim", other: "Tjetër" };
const wxIcon = (rain, tmax) => (rain >= 5 ? "rainy" : rain >= 0.5 ? "rainy-outline" : tmax >= 30 ? "sunny" : "partly-sunny");

export default function Dashboard({ cid, role, onGo }) {
  const [st, setSt] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [obs, setObs] = useState([]);
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const [{ data: d, error: e1 }, { data: t }, { data: o }] = await Promise.all([
      sb.from("dashboard_stats").select("*").eq("company_id", cid).maybeSingle(),
      sb.from("tasks").select("id,title,due_date,status,type,plots(name)").eq("company_id", cid).eq("status", "open").order("due_date").limit(5),
      sb.from("observations").select("id,kind,severity,date,resolved,plots(name)").eq("company_id", cid).eq("resolved", false).order("date", { ascending: false }).limit(4),
    ]);
    if (e1) setErr(e1.message);
    setSt(d || null); setTasks(t || []); setObs(o || []); setLoading(false);
    try {
      const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.32&longitude=19.45&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max&timezone=Europe%2FTirane&forecast_days=5");
      const j = await r.json();
      if (j?.daily) setWx(j.daily);
    } catch (_e) { /* moti është shtesë */ }
  }, [cid]);

  useEffect(() => { load(); }, [load]);

  const alerts = [];
  if (st) {
    if (st.tasks_overdue > 0) alerts.push({ tone: "danger", icon: "alarm-outline", title: `${st.tasks_overdue} detyra të vonuara`, text: "Hapni «Detyrat» dhe mbyllini.", go: "detyra" });
    if (st.observations_open > 0) alerts.push({ tone: "warn", icon: "bug-outline", title: `${st.observations_open} vëzhgime të hapura`, text: "Kontrolloni dëmtuesit dhe sëmundjet.", go: "vezhgime" });
    if (st.reminders_overdue > 0) alerts.push({ tone: "warn", icon: "notifications-outline", title: `${st.reminders_overdue} kujtues të pambyllur`, text: "Shihni te «Toka».", go: "toka" });
  }
  if (wx) {
    const frost = wx.time.findIndex((_, i) => wx.temperature_2m_min[i] <= 1);
    const heat = wx.time.findIndex((_, i) => wx.temperature_2m_max[i] >= 35);
    const rain = wx.time.findIndex((_, i) => wx.precipitation_sum[i] >= 20);
    if (frost >= 0) alerts.push({ tone: "warn", icon: "snow-outline", title: `Rrezik acari — ${dShort(wx.time[frost])}`, text: `Minimumi ${Math.round(wx.temperature_2m_min[frost])}°C. Mbro bimët e ndjeshme.` });
    if (heat >= 0) alerts.push({ tone: "warn", icon: "thermometer-outline", title: `Nxehtësi — ${dShort(wx.time[heat])}`, text: `${Math.round(wx.temperature_2m_max[heat])}°C. Ujit herët në mëngjes.` });
    if (rain >= 0) alerts.push({ tone: "info", icon: "rainy-outline", title: `Shi i dendur — ${dShort(wx.time[rain])}`, text: `${Math.round(wx.precipitation_sum[rain])} mm. Shty trajtimet.` });
  }

  const todayStr = new Date().toLocaleDateString("sq-AL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.pad}
      refreshControl={<RefreshControl refreshing={loading && !!st} onRefresh={load} tintColor={C.brand} />}
    >
      <View style={[s.pageTitle, { marginBottom: 2 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.mute, { marginBottom: 2 }]}>{todayStr}</Text>
          <Text style={s.h1}>Pasqyra e fermës</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => onGo("asistenti")} activeOpacity={0.85}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brandSoft, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, marginRight: 8 }}>
            <Ionicons name="mic-outline" size={15} color={C.brand} />
            <Text style={{ color: C.brand, fontWeight: "800", fontSize: 12.5 }}>Zëri</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onGo("kujtuesit")} activeOpacity={0.85}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.dangerSoft, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999 }}>
            <Ionicons name="alarm-outline" size={15} color={C.red} />
            <Text style={{ color: C.red, fontWeight: "800", fontSize: 12.5 }}>Kujtuesit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!err && <ErrorBox message={"Statistikat nuk u ngarkuan: " + err} onRetry={load} />}
      {loading && !st && <Loading text="Po mblidhen të dhënat…" />}

      {st && st.plots === 0 && (
        <TouchableOpacity onPress={() => onGo("fillimi")} activeOpacity={0.85} style={{ marginTop: 14 }}>
          <View style={[s.card, { backgroundColor: C.brandSoft, borderColor: C.brand, borderWidth: 1 }]}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: "#fff" }]}>
                <Ionicons name="rocket-outline" size={20} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.brand, fontWeight: "800", fontSize: 15 }}>Filloni me katër hapa</Text>
                <Text style={[s.mute, { marginTop: 2 }]}>Zona → grumbullues → fermerë → parcela. Ose importoni nga Excel.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.brand} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {st && (
        <View style={hero.wrap}>
          {[
            ["Sipërfaqe", `${fmt(st.area_ha)} ha`],
            ["Parcela", String(st.plots ?? 0)],
            ["Kultivime", String(st.cultivations_active ?? 0)],
          ].map(([l, v], i) => (
            <View key={l} style={[hero.cell, i > 0 && hero.cellLine]}>
              <Text style={hero.label}>{l.toUpperCase()}</Text>
              <Text style={hero.value} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
      )}

      {st && (
        <Kpis style={{ marginTop: 12 }}>
          <Stat icon="checkbox-outline" label="Detyra të hapura" value={st.tasks_open} sub={st.tasks_overdue ? `${st.tasks_overdue} të vonuara` : "asnjë e vonuar"} tone={st.tasks_overdue ? "danger" : "brand"} onPress={() => onGo("detyra")} />
          <Stat icon="bug-outline" label="Vëzhgime" value={st.observations_open} sub="të pazgjidhura" tone={st.observations_open ? "warn" : "brand"} onPress={() => onGo("vezhgime")} />
          <Stat icon="nutrition-outline" label="Inpute këtë vit" value={money(st.inputs_year)} sub="plehra, trajtime, punë" tone="info" onPress={() => onGo("inpute")} />
          <Stat icon="basket-outline" label="Blerje këtë vit" value={money(st.purchases_year)} sub="nga fermerët" tone="ok" onPress={() => onGo("blerje")} />
        </Kpis>
      )}

      {alerts.length > 0 && <SectionTitle>Alarme</SectionTitle>}
      {alerts.map((a, i) => (
        <TouchableOpacity key={i} onPress={() => a.go && onGo(a.go)} activeOpacity={0.85}>
          <View style={[s.card, { flexDirection: "row", gap: 11, alignItems: "flex-start", borderLeftWidth: 4, borderLeftColor: a.tone === "danger" ? C.red : a.tone === "warn" ? C.warn : C.info }]}>
            <Ionicons name={a.icon} size={19} color={a.tone === "danger" ? C.red : a.tone === "warn" ? C.warn : C.info} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink, fontSize: 14 }}>{a.title}</Text>
              <Text style={s.mute}>{a.text}</Text>
            </View>
            {!!a.go && <Ionicons name="chevron-forward" size={16} color={C.mute} />}
          </View>
        </TouchableOpacity>
      ))}

      <SectionTitle right={<Text style={s.mute}>Durrës</Text>}>Moti — 5 ditë</SectionTitle>
      {wx ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {wx.time.map((d, i) => (
              <View key={d} style={{ alignItems: "center", flex: 1 }}>
                <Text style={[s.mute, { fontSize: 11 }]} numberOfLines={1}>{i === 0 ? "Sot" : WDAY[new Date(d + "T00:00:00Z").getUTCDay()]}</Text>
                <Ionicons name={wxIcon(wx.precipitation_sum[i], wx.temperature_2m_max[i])} size={20} color={C.brand} style={{ marginVertical: 4 }} />
                <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14 }} numberOfLines={1}>{Math.round(wx.temperature_2m_max[i])}°</Text>
                <Text style={[s.mute, { fontSize: 10.5 }]} numberOfLines={1}>{Math.round(wx.temperature_2m_min[i])}° · {Math.round(wx.precipitation_sum[i])} mm</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : <Card><Text style={s.mute}>Moti nuk u ngarkua — kontrolloni internetin.</Text></Card>}

      <SectionTitle right={<TouchableOpacity onPress={() => onGo("detyra")}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Të gjitha</Text></TouchableOpacity>}>Detyrat e ardhshme</SectionTitle>
      {tasks.length === 0 ? (
        <Card><Text style={s.mute}>Asnjë detyrë e hapur. Krijoni një detyrë për ujitje, plehërim ose vjelje.</Text></Card>
      ) : tasks.map((x) => (
        <TouchableOpacity key={x.id} style={s.card} onPress={() => onGo("detyra")} activeOpacity={0.85}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: x.due_date < new Date().toISOString().slice(0, 10) ? C.dangerSoft : C.brandSoft }]}>
              <Ionicons name="calendar-outline" size={18} color={x.due_date < new Date().toISOString().slice(0, 10) ? C.red : C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{x.title}</Text>
              <Text style={s.mute} numberOfLines={1}>{x.plots?.name ? `${x.plots.name} · ` : ""}{dueLabel(x.due_date)}</Text>
            </View>
            <Chip label={dShort(x.due_date)} tone={x.due_date < new Date().toISOString().slice(0, 10) ? "danger" : "neutral"} />
          </View>
        </TouchableOpacity>
      ))}

      <SectionTitle right={<TouchableOpacity onPress={() => onGo("vezhgime")}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Të gjitha</Text></TouchableOpacity>}>Vëzhgimet e fundit</SectionTitle>
      {obs.length === 0 ? (
        <Card><Text style={s.mute}>Asnjë vëzhgim i hapur. Regjistroni dëmtuesit me foto direkt nga fusha.</Text></Card>
      ) : obs.map((o) => (
        <TouchableOpacity key={o.id} style={s.card} onPress={() => onGo("vezhgime")} activeOpacity={0.85}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: o.severity >= 3 ? C.dangerSoft : C.warnSoft }]}>
              <Ionicons name="bug-outline" size={18} color={o.severity >= 3 ? C.red : C.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink }}>{KIND_LABEL[o.kind] || o.kind}</Text>
              <Text style={s.mute} numberOfLines={1}>{o.plots?.name || "Pa parcelë"} · {dShort(o.date)}</Text>
            </View>
            <Chip label={`${o.severity}/3`} tone={o.severity >= 3 ? "danger" : o.severity === 2 ? "warn" : "neutral"} />
          </View>
        </TouchableOpacity>
      ))}

      <Text style={[s.mute, { fontSize: 11, marginTop: 20, textAlign: "center" }]}>Moti: Open-Meteo · BioBes Farm</Text>
    </ScrollView>
  );
}
