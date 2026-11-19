// Menuja e moduleve: e gjithë puna e fermës e grupuar sipas rrjedhës reale.
import React from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, C, SectionTitle } from "./ui";

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
      ["dokumente", "Dokumentet", "Kontrata, fatura, foto", "document-text-outline"],
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
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(([k]) => (k === "mostra" ? staff || role === "grumbullues" : true)),
  })).concat(
    role === "admin"
      ? [{ title: "Administrimi", items: [["perdorues", "Përdoruesit", "Role dhe qasje", "people-circle-outline"]] }]
      : []
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 96 }]}>
      <Text style={s.h1}>Modulet</Text>
      <Text style={[s.sub, { marginTop: 2 }]}>E gjithë puna e fermës: nga toka te eksporti.</Text>
      {groups.map((g) => (
        <View key={g.title}>
          <SectionTitle>{g.title}</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {g.items.map(([k, title, desc, icon]) => (
              <TouchableOpacity
                key={k}
                onPress={() => onGo(k)}
                activeOpacity={0.85}
                style={[s.card, { width: "47.5%", flexGrow: 1, minHeight: 104, justifyContent: "space-between" }]}
              >
                <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                  <Ionicons name={icon} size={18} color={C.brand} />
                </View>
                <View>
                  <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14.5, marginTop: 8 }} numberOfLines={1}>{title}</Text>
                  <Text style={s.mute} numberOfLines={2}>{desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <Text style={[s.mute, { marginTop: 22, textAlign: "center" }]}>BioBes Farm · gjurmueshmëri nga toka te klienti</Text>
    </ScrollView>
  );
}
