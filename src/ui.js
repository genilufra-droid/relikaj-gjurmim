// Sistemi i dizajnit i BioBes Farm: ngjyra, tipografi, hapësira dhe komponentë të përbashkët.
import React from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const C = {
  bg: "#F5F7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#EDF2E8",
  card: "#FFFFFF",
  brand: "#14532D",
  green: "#14532D",
  green2: "#1E6B3A",
  brandDark: "#0C3B20",
  brandSoft: "#E6F0E1",
  leaf: "#7CB342",
  ink: "#0F1A13",
  text: "#1B2A21",
  sub: "#55655B",
  mute: "#87948A",
  line: "#E1E7DC",
  red: "#B3261E",
  dangerSoft: "#FDECEA",
  warn: "#9A6400",
  warnSoft: "#FDF3DC",
  ok: "#1B7A46",
  okSoft: "#E7F4EC",
  info: "#2A5C8A",
  infoSoft: "#E8F1F9",
};

const shadow = { shadowColor: "#0B1F10", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 };
const shadowSoft = { shadowColor: "#0B1F10", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 };

export const s = StyleSheet.create({
  // --- bazë (emrat e vjetër mbahen që ekranet ekzistuese të punojnë) ---
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: S.lg, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line, ...shadowSoft },
  h1: { fontSize: 25, fontWeight: "800", color: C.ink, letterSpacing: -0.4 },
  h2: { fontSize: 16, fontWeight: "700", color: C.ink },
  sub: { color: C.sub, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, color: C.sub, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.9, fontWeight: "700" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, color: C.ink },
  btn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 8, ...shadowSoft },
  btn2: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, shadowOpacity: 0 },
  btnT: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
  btnT2: { color: C.brand },
  err: { color: C.red, marginTop: 10, fontWeight: "600", lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mute: { color: C.mute, fontSize: 13 },

  // --- shtresa e re ---
  headerWrap: { backgroundColor: C.brand, paddingHorizontal: S.lg, paddingTop: 10, paddingBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  headerS: { color: "#B9D8A8", fontSize: 10, letterSpacing: 2.4, fontWeight: "700" },
  headerT: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  roleChipT: { color: "#EAF5E3", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  toolbar: { paddingHorizontal: S.lg, paddingTop: S.md },
  pageTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.sub, letterSpacing: 1.2, textTransform: "uppercase", marginTop: S.xl, marginBottom: S.sm },

  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  seg: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  segItem: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
  segItemOn: { backgroundColor: C.brand, borderColor: C.brand },
  segT: { fontSize: 13, fontWeight: "600", color: C.sub },
  segTOn: { color: "#fff", fontWeight: "700" },

  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: C.surfaceAlt },
  chipT: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line, ...shadowSoft },
  kpiTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  kpiIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  kpiV: { fontSize: 23, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  kpiL: { fontSize: 12, color: C.sub, marginTop: 1 },

  listRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: C.line, marginVertical: S.sm },

  empty: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 22 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.ink, marginBottom: 6, textAlign: "center" },
  emptyX: { color: C.sub, fontSize: 13.5, textAlign: "center", lineHeight: 20 },

  errBox: { flexDirection: "row", gap: 10, backgroundColor: C.dangerSoft, borderRadius: 12, padding: 12, marginTop: 12, alignItems: "flex-start" },
  warnBox: { flexDirection: "row", gap: 10, backgroundColor: C.warnSoft, borderRadius: 12, padding: 12, alignItems: "flex-start" },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: C.infoSoft, borderRadius: 12, padding: 12, alignItems: "flex-start" },

  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },

  fab: { position: "absolute", right: 18, bottom: 18, backgroundColor: C.brand, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 14, shadowColor: "#0B1F10", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabT: { color: "#fff", fontWeight: "800", fontSize: 15 },

  tabs: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderColor: C.line, paddingBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  tabIc: { height: 24, justifyContent: "center" },
  tabT: { fontSize: 10.5, fontWeight: "600", color: C.mute, letterSpacing: 0.1 },
  tabTOn: { color: C.brand, fontWeight: "800" },
  tabOn: { borderTopWidth: 3, borderTopColor: C.leaf, paddingTop: 6 },

  formHead: { paddingTop: S.sm, paddingBottom: S.md },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backT: { color: C.brand, fontWeight: "700", fontSize: 14 },
});

// ---------- Komponentë ----------
export const Btn = ({ title, onPress, alt, busy, disabled, icon, tone }) => (
  <TouchableOpacity
    style={[s.btn, alt && s.btn2, tone === "danger" && { backgroundColor: C.red }, (busy || disabled) && { opacity: 0.45 }]}
    onPress={onPress} disabled={busy || disabled} activeOpacity={0.85}
  >
    {busy ? <ActivityIndicator color={alt ? C.brand : "#fff"} /> : (
      <>
        {!!icon && <Ionicons name={icon} size={18} color={alt ? C.brand : "#fff"} />}
        <Text style={[s.btnT, alt && s.btnT2]}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

export const Field = ({ label, hint, ...p }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} placeholderTextColor={C.mute} {...p} />
    {!!hint && <Text style={[s.mute, { marginTop: 4 }]}>{hint}</Text>}
  </View>
);

export const Card = ({ children, style, onPress, onLongPress }) => {
  const inner = <View style={[s.card, style]}>{children}</View>;
  if (!onPress && !onLongPress) return inner;
  return <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>{inner}</TouchableOpacity>;
};

export const SectionTitle = ({ children, right }) => (
  <View style={[s.row, { marginTop: S.xl, marginBottom: S.sm }]}>
    <Text style={[s.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>{children}</Text>
    {right}
  </View>
);

export const Chip = ({ label, tone = "neutral", icon }) => {
  const map = {
    neutral: [C.surfaceAlt, C.sub],
    brand: [C.brandSoft, C.brand],
    ok: [C.okSoft, C.ok],
    warn: [C.warnSoft, C.warn],
    danger: [C.dangerSoft, C.red],
    info: [C.infoSoft, C.info],
  };
  const [bg, fg] = map[tone] || map.neutral;
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      {!!icon && <Ionicons name={icon} size={11} color={fg} />}
      <Text style={[s.chipT, { color: fg }]}>{label}</Text>
    </View>
  );
};

export const Stat = ({ icon, label, value, sub, tone = "brand", onPress }) => {
  const map = { brand: [C.brandSoft, C.brand], ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], danger: [C.dangerSoft, C.red], info: [C.infoSoft, C.info] };
  const [bg, fg] = map[tone] || map.brand;
  const body = (
    <View style={s.kpi}>
      <View style={s.kpiTop}>
        <View style={[s.kpiIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={17} color={fg} /></View>
        <Text style={[s.kpiL, { marginTop: 0, flex: 1 }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={s.kpiV} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={s.mute} numberOfLines={1}>{sub}</Text>}
    </View>
  );
  return onPress ? <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.85}>{body}</TouchableOpacity> : <View style={{ flex: 1 }}>{body}</View>;
};

// Rrjeta KPI: rreshta të qartë me dy kolona — pa «flexWrap», që Yoga t'i llogarisë saktë lartësitë.
export const Kpis = ({ children, style }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={style}>
      {rows.map((pair, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: i === rows.length - 1 ? 0 : 10 }}>
          <View style={{ flex: 1, marginRight: 10 }}>{pair[0]}</View>
          <View style={{ flex: 1 }}>{pair[1] || null}</View>
        </View>
      ))}
    </View>
  );
};

// Rresht etiketash që thyhen në shumë rreshta, me hapësirë të sigurt (pa «gap» në wrap).
export const ChipRow = ({ children, style }) => (
  <View style={[{ flexDirection: "row", flexWrap: "wrap" }, style]}>
    {React.Children.toArray(children).filter(Boolean).map((c, i) => (
      <View key={i} style={{ marginRight: 6, marginBottom: 6 }}>{c}</View>
    ))}
  </View>
);

export const Segmented = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.seg}>
    {options.map(([k, t]) => (
      <TouchableOpacity key={k} onPress={() => onChange(k)} style={[s.segItem, value === k && s.segItemOn]} activeOpacity={0.85}>
        <Text style={[s.segT, value === k && s.segTOn]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

export const SearchBar = ({ value, onChange, placeholder = "Kërko…" }) => (
  <View style={[s.search, { marginTop: S.sm }]}>
    <Ionicons name="search" size={17} color={C.mute} />
    <TextInput style={s.searchInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.mute} />
    {!!value && (
      <TouchableOpacity onPress={() => onChange("")}>
        <Ionicons name="close-circle" size={17} color={C.mute} />
      </TouchableOpacity>
    )}
  </View>
);

export const Empty = ({ icon = "leaf-outline", title, text, action }) => (
  <View style={s.empty}>
    <View style={s.emptyIcon}><Ionicons name={icon} size={28} color={C.brand} /></View>
    <Text style={s.emptyT}>{title}</Text>
    {!!text && <Text style={s.emptyX}>{text}</Text>}
    {action}
  </View>
);

export const ErrorBox = ({ message, onRetry }) => (
  <View style={s.errBox}>
    <Ionicons name="alert-circle" size={18} color={C.red} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.red, fontWeight: "700", fontSize: 13.5 }}>{message || "Diçka shkoi keq"}</Text>
      {!!onRetry && (
        <TouchableOpacity onPress={onRetry} style={{ marginTop: 6 }}>
          <Text style={{ color: C.red, fontWeight: "800", fontSize: 13 }}>Provo përsëri</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export const InfoBox = ({ icon = "information-circle", tone = "info", children }) => {
  const map = { info: [C.infoSoft, C.info], warn: [C.warnSoft, C.warn] };
  const [bg, fg] = map[tone] || map.info;
  return (
    <View style={[s.infoBox, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={17} color={fg} />
      <Text style={{ flex: 1, color: fg, fontSize: 13, lineHeight: 19 }}>{children}</Text>
    </View>
  );
};

export const Loading = ({ text = "Po ngarkohet…" }) => (
  <View style={s.loadingWrap}>
    <ActivityIndicator color={C.brand} />
    <Text style={s.mute}>{text}</Text>
  </View>
);

export const FAB = ({ label, icon = "add", onPress }) => (
  <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.9}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={s.fabT}>{label}</Text>
  </TouchableOpacity>
);

export const BackBar = ({ title, onBack }) => (
  <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.7}>
    <Ionicons name="chevron-back" size={18} color={C.brand} />
    <Text style={s.backT}>{title || "Kthehu"}</Text>
  </TouchableOpacity>
);

// ---------- Formatim ----------
export const fmt = (n) => (n === null || n === undefined || n === "" ? "" : Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 }));
export const num = (t) => Number(String(t).replace(/\./g, "").replace(",", ".")) || 0;
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n) => `${fmt(Math.round(Number(n) || 0))} L`;
export const dShort = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
export const dFull = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
export const daysBetween = (iso) => {
  if (!iso) return null;
  const a = new Date(`${iso}T00:00:00Z`).getTime();
  const b = new Date(`${today()}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86400000);
};
export const dueLabel = (iso) => {
  const d = daysBetween(iso);
  if (d === null) return "";
  if (d === 0) return "Sot";
  if (d === 1) return "Nesër";
  if (d === -1) return "Dje";
  if (d < 0) return `${Math.abs(d)} ditë vonë`;
  return `Pas ${d} ditësh`;
};
