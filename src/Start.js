// Fillimi: katër hapa deri te një BioBes që punon me të dhëna reale.
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Card, Chip, ErrorBox, InfoBox, Loading, SectionTitle } from "./ui";

const STEPS = [
  {
    key: "zones",
    title: "Zonat e grumbullimit",
    text: "Një zonë për çdo fshat ose krahinë ku grumbulloni.",
    icon: "people-outline",
    form: "zone",
    importEntity: "zones",
    cta: "Shto zonë",
  },
  {
    key: "members",
    title: "Grumbulluesit",
    text: "Llogari për njerëzit që mbledhin: secili sheh zonën e vet.",
    icon: "person-add-outline",
    tab: "perdorues",
    cta: "Shto përdorues",
  },
  {
    key: "farmers",
    title: "Fermerët",
    text: "Emri, telefoni dhe karta e çdo fermeri që ju sjell produkt.",
    icon: "id-card-outline",
    importEntity: "farmers",
    cta: "Importo fermerët",
  },
  {
    key: "plots",
    title: "Parcelat",
    text: "Sipërfaqja, prona dhe fermeri i çdo parcele.",
    icon: "map-outline",
    form: "parcela",
    importEntity: "plots",
    cta: "Importo parcelat",
  },
];

export default function Start({ cid, role, onGo, onForm, onImport }) {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const [z, f, p, m, pr] = await Promise.all([
      sb.from("zones").select("id").eq("company_id", cid),
      sb.from("farmers").select("id").eq("company_id", cid),
      sb.from("plots").select("id").eq("company_id", cid),
      sb.from("members").select("user_id,role").eq("company_id", cid).eq("active", true),
      sb.from("products").select("id").eq("company_id", cid),
    ]);
    const e = z.error || f.error || p.error || m.error || pr.error;
    if (e) setErr(e.message);
    setCounts({
      zones: (z.data || []).length,
      farmers: (f.data || []).length,
      plots: (p.data || []).length,
      products: (pr.data || []).length,
      members: (m.data || []).filter((r) => r.role === "grumbullues").length,
    });
    setLoading(false);
  }, [cid]);

  useEffect(() => { load(); }, [load]);

  if (loading && !counts) return <Loading text="Po kontrollohen të dhënat…" />;
  const done = STEPS.filter((st) => (counts?.[st.key] || 0) > 0).length;
  const pct = Math.round((done / STEPS.length) * 100);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.pad, { paddingBottom: 96 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.brand} />}
    >
      <Text style={s.h1}>Fillimi i shpejtë</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>
        Katër hapa dhe BioBes punon me të dhënat tuaja reale — jo me shembuj.
      </Text>

      <Card style={{ marginTop: 14 }}>
        <View style={s.row}>
          <Text style={{ color: C.ink, fontWeight: "800" }}>{done} nga {STEPS.length} hapa</Text>
          <Text style={{ color: C.brand, fontWeight: "800" }}>{pct}%</Text>
        </View>
        <View style={{ height: 8, backgroundColor: C.surfaceAlt, borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${pct}%`, backgroundColor: C.leaf, borderRadius: 999 }} />
        </View>
      </Card>

      {!!err && <ErrorBox message={"Të dhënat nuk u lexuan: " + err} onRetry={load} />}

      {STEPS.map((st, i) => {
        const n = counts?.[st.key] || 0;
        const ok = n > 0;
        return (
          <Card key={st.key} style={ok ? undefined : { borderLeftWidth: 4, borderLeftColor: C.leaf }}>
            <View style={[s.listRow, { alignItems: "flex-start" }]}>
              <View style={[s.iconCircle, { backgroundColor: ok ? C.okSoft : C.brandSoft }]}>
                <Ionicons name={ok ? "checkmark" : st.icon} size={19} color={ok ? C.ok : C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.row}>
                  <Text style={{ color: C.ink, fontWeight: "800", flex: 1 }} numberOfLines={1}>
                    {i + 1}. {st.title}
                  </Text>
                  <Chip label={ok ? String(n) : "bosh"} tone={ok ? "ok" : "warn"} />
                </View>
                <Text style={[s.mute, { marginTop: 3 }]}>{st.text}</Text>
                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  {!!st.form && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}
                      onPress={() => onForm(st.form)}
                    >
                      <Ionicons name="add" size={15} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>{st.cta}</Text>
                    </TouchableOpacity>
                  )}
                  {!!st.importEntity && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brandSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 }}
                      onPress={() => onImport(st.importEntity)}
                    >
                      <Ionicons name="cloud-upload-outline" size={15} color={C.brand} />
                      <Text style={{ color: C.brand, fontWeight: "700", fontSize: 12.5 }}>{st.cta}</Text>
                    </TouchableOpacity>
                  )}
                  {!!st.tab && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
                      onPress={() => onGo(st.tab)}
                    >
                      <Ionicons name="person-add-outline" size={15} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>{st.cta}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Card>
        );
      })}

      <SectionTitle>Më pas</SectionTitle>
      <Card onPress={() => onGo("importo")}>
        <View style={s.listRow}>
          <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
            <Ionicons name="document-attach-outline" size={19} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Importo nga Excel</Text>
            <Text style={[s.mute, { marginTop: 2 }]}>Zona, fermerë, parcela ose produkte — me titujt tuaj.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.mute} />
        </View>
      </Card>
      <Card onPress={() => onGo("raporte")}>
        <View style={s.listRow}>
          <View style={[s.iconCircle, { backgroundColor: C.infoSoft }]}>
            <Ionicons name="bar-chart-outline" size={19} color={C.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Raportet</Text>
            <Text style={[s.mute, { marginTop: 2 }]}>Gjurmueshmëri, blerje, pagesa, parcela — PDF dhe Excel.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.mute} />
        </View>
      </Card>

      <InfoBox icon="shield-checkmark-outline">
        Të dhënat janë të kompanisë suaj. Importimi nuk fshin asgjë: ose i shton, ose i përditëson rreshtat që ekzistojnë.
      </InfoBox>
    </ScrollView>
  );
}
