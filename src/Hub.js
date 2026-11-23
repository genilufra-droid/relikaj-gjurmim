// Menuja e moduleve: e gjithë puna e fermës e grupuar sipas rrjedhës reale.
import React from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, C, Card, SectionTitle } from "./ui";

const pairUp = (list) => {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
};

const GROUPS = [
  {
    title: "Terreni dhe kultivimi",
    items: [
      ["parcelat", "Parcelat", "GPS, sipërfaqe, pronësi", "map-outline"],
      ["kultivimet", "Kultivimet", "Mbjelljet dhe fazat", "leaf-outline"],
      ["puna", "Puna në tokë", "Punime dhe trajtime", "construct-outline"],
      ["detyra", "Detyrat", "Puna e ekipit në terren", "checkbox-outline"],
      ["vezhgime", "Vëzhgimet", "Dëmtues, sëmundje, stres", "bug-outline"],
      ["inpute", "Inputet", "Fara, plehra, karburant", "nutrition-outline"],
    ],
  },
  {
    title: "Grumbullimi",
    items: [
      ["asistenti", "Asistenti", "Regjistro me zë ose shkrim", "mic-outline"],
      ["kujtuesit", "Kujtuesit", "Çka pret veprim sot", "alarm-outline"],
      ["blerje", "Blerjet", "Marrja nga fermerët", "basket-outline"],
      ["mostra", "Mostrat", "Në parcelë ose qendër", "flask-outline"],
      ["zonat", "Zonat", "Grumbulluesit e zonave", "people-outline"],
    ],
  },
  {
    title: "Qendra dhe eksporti",
    items: [
      ["perpunimi", "Përpunimi", "Tharje, prerje, vaj", "cog-outline"],
      ["magazine", "Magazina", "Dorëzime dhe eksport", "cube-outline"],
      ["printo", "Printo", "Drafte dhe fletë magazine", "print-outline"],
      ["dokumente", "Dokumentet", "Kontrata, fatura, foto", "document-text-outline"],
    ],
  },
  {
    title: "Të dhënat",
    staffOnly: true,
    items: [
      ["fillimi", "Fillimi i shpejtë", "Katër hapa deri te puna reale", "rocket-outline"],
      ["importo", "Importo Excel", "Zona, fermerë, parcela", "cloud-upload-outline"],
    ],
  },
  {
    title: "Toka dhe financat",
    items: [
      ["toka", "Toka dhe qiratë", "Qira, pagesa, kujtues", "home-outline"],
      ["gjurmimi", "Gjurmueshmëria", "Nga toka te klienti", "git-branch-outline"],
      ["raporte", "Raportet", "Excel dhe PDF", "bar-chart-outline"],
    ],
  },
];

export default function Hub({ role, onGo }) {
  const staff = role === "admin" || role === "staf";
  const groups = GROUPS.filter((g) => !g.staffOnly || staff).map((g) => ({
    ...g,
    items: g.items.filter(([k]) => (k === "mostra" ? staff || role === "grumbullues" : true)),
  })).concat(
    role === "admin"
      ? [{ title: "Administrimi", items: [
          ["perdorues", "Përdoruesit", "Role dhe qasje", "people-circle-outline"],
          ["backup", "Backup", "Ruaj dhe rikthe të dhënat", "shield-checkmark-outline"],
        ] }]
      : []
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Modulet</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>E gjithë puna e fermës: nga toka te eksporti.</Text>
      {groups.map((g) => (
        <View key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          {pairUp(g.items).map((pair, ri) => (
            <View key={ri} style={{ flexDirection: "row", marginBottom: 10 }}>
              {pair.map(([k, title, desc, icon], ci) => (
                <Card key={k} onPress={() => onGo(k)} style={{ flex: 1, marginBottom: 0, marginRight: ci === 0 && pair.length > 1 ? 10 : 0 }}>
                  <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                    <Ionicons name={icon} size={18} color={C.brand} />
                  </View>
                  <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14.5, marginTop: 9 }} numberOfLines={1}>{title}</Text>
                  <Text style={[s.mute, { marginTop: 2 }]} numberOfLines={2}>{desc}</Text>
                </Card>
              ))}
              {pair.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      ))}
      <Text style={[s.mute, { marginTop: 22, textAlign: "center" }]}>BioBes Farm · gjurmueshmëri nga toka te klienti</Text>
    </ScrollView>
  );
}
