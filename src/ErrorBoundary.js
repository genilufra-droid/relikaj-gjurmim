// Kufiri i gabimeve: një gabim në një ekran nuk e lë aplikacionin me ekran bosh.
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, C, Btn } from "./ui";

export default class ErrorBoundary extends React.Component {
  state = { err: null, showDetail: false };

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    // Ruajmë gjurmën për diagnostikim (shfaqet me «Detajet»).
    this.setState({ info: info?.componentStack || "" });
    if (__DEV__) console.error("Ekran me gabim:", err, info);
  }

  reset = () => this.setState({ err: null, info: "", showDetail: false });

  render() {
    const { err, info, showDetail } = this.state;
    if (!err) return this.props.children;
    const msg = String(err?.message || err || "Gabim i panjohur");
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 28 }]}>
        <View style={[s.iconCircle, { backgroundColor: C.dangerSoft, width: 54, height: 54, borderRadius: 17, marginBottom: 14 }]}>
          <Ionicons name="alert-circle-outline" size={28} color={C.red} />
        </View>
        <Text style={s.h1}>Ekrani nuk u hap</Text>
        <Text style={[s.sub, { marginTop: 6 }]}>
          Të dhënat tuaja janë të sigurta dhe të ruajtura. Provoni përsëri; nëse gabimi përsëritet, dërgoni tekstin te administratori.
        </Text>

        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={[s.mute, { fontWeight: "700" }]}>Gabimi</Text>
          <Text selectable style={{ color: C.text, marginTop: 4 }}>{msg}</Text>
          {!!info && (
            <>
              <TouchableOpacity onPress={() => this.setState({ showDetail: !showDetail })} style={{ marginTop: 10 }}>
                <Text style={{ color: C.brand, fontWeight: "700" }}>{showDetail ? "Fshih detajet" : "Detajet"}</Text>
              </TouchableOpacity>
              {showDetail && (
                <Text selectable style={[s.mute, { marginTop: 6, fontFamily: "monospace", fontSize: 11 }]}>{info}</Text>
              )}
            </>
          )}
        </View>

        <Btn title="Provo përsëri" icon="refresh" onPress={this.reset} />
      </ScrollView>
    );
  }
}
