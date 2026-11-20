// Pamja e grumbulluesit: hyrje e shpejtë në punën e ditës — dy veprime të mëdha dhe çfarë u regjistrua sot.
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Card, Empty, ErrorBox, Loading, SectionTitle, fmt, money, today, Kpis } from "./ui";

const dayLabel = () =>
  new Date().toLocaleDateString("sq-AL", { weekday: "long", day: "numeric", month: "long" });

export default function Field({ cid, name, onNew, onGo }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("purchases")
      .select("id,lot_code,qty_fresh,qty_dry,amount,farmers(first_name,last_name),products(name),zones(code)")
      .eq("company_id", cid)
      .eq("date", today())
      .order("id", { ascending: false });
    setErr(error ? "Të dhënat e ditës nuk u ngarkuan." : "");
    setRows(data || []);
    setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const kg = (r) => Number(r.qty_fresh || 0) + Number(r.qty_dry || 0);
  const totalKg = rows.reduce((a, r) => a + kg(r), 0);
  const totalAmount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const name4 = (r) => (r.farmers ? `${r.farmers.first_name || ""} ${r.farmers.last_name || ""}`.trim() : "Pa fermer");

  const Action = ({ icon, title, sub, onPress }) => (
    <TouchableOpacity style={[s.card, { flex: 1, alignItems: "flex-start", gap: 8, paddingVertical: 18 }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
        <Ionicons name={icon} size={22} color={C.brand} />
      </View>
      <Text style={{ fontWeight: "800", color: C.ink, fontSize: 16 }}>{title}</Text>
      <Text style={s.mute}>{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={[s.pad, { paddingBottom: 40 }]}
      data={rows}
      keyExtractor={(r) => String(r.id)}
      refreshing={loading}
      onRefresh={load}
      ListHeaderComponent={
        <View>
          <Text style={s.h1}>Fusha</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>{dayLabel()}{name ? ` · ${name}` : ""}</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Action icon="basket-outline" title="Blerje" sub="Marrje nga fermeri" onPress={() => onNew("blerje")} />
            <Action icon="flask-outline" title="Mostër" sub="Kod, lagështi, pastërti" onPress={() => onNew("mostra")} />
          </View>

          {rows.length > 0 && (
            <Kpis style={{ marginTop: 14 }}>
              <StatLite icon="scale-outline" label="Sot, sasia" value={`${fmt(totalKg)} kg`} sub={`${rows.length} ${rows.length === 1 ? "regjistrim" : "regjistrime"}`} />
              <StatLite icon="cash-outline" label="Sot, vlera" value={money(totalAmount)} sub="sipas çmimit të blerjes" tone="ok" />
            </Kpis>
          )}

          {!!err && <ErrorBox message={err} onRetry={load} />}
          <SectionTitle right={<TouchableOpacity onPress={() => onGo("blerje")}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Historiku</Text></TouchableOpacity>}>
            Sot
          </SectionTitle>
          {loading && rows.length === 0 && <Loading text="Po ngarkohet dita…" />}
        </View>
      }
      ListEmptyComponent={!loading && (
        <Empty icon="sunny-outline" title="Asnjë regjistrim sot" text="Zgjidhni «Blerje» ose «Mostër» për të nisur ditën." />
      )}
      renderItem={({ item: r }) => (
        <Card>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.surfaceAlt }]}>
              <Ionicons name="leaf-outline" size={18} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{name4(r)}</Text>
              <Text style={s.mute} numberOfLines={1}>
                {r.products?.name || "Produkt"}{r.lot_code ? ` · ${r.lot_code}` : ""}
                {r.zones?.code ? ` · ${r.zones.code}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontWeight: "800", color: C.brand }}>{fmt(kg(r))} kg</Text>
              <Text style={s.mute}>{money(r.amount)}</Text>
            </View>
          </View>
        </Card>
      )}
    />
  );
}

// Kartelë e thjeshtë statistikore, pa varësi nga ekranet e tjera.
const StatLite = ({ icon, label, value, sub, tone = "brand" }) => {
  const bg = tone === "ok" ? C.okSoft : C.brandSoft;
  const fg = tone === "ok" ? C.ok : C.brand;
  return (
    <View style={s.kpi}>
      <View style={s.kpiTop}>
        <View style={[s.kpiIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={17} color={fg} /></View>
        <Text style={[s.kpiL, { marginTop: 0, flex: 1 }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={s.kpiV} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={s.mute} numberOfLines={1}>{sub}</Text>}
    </View>
  );
};
