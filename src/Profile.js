// Profili i llogarisë: të dhënat, ndryshimi i fjalëkalimit dhe dalja.
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, ErrorBox, Field, InfoBox, SectionTitle } from "./ui";

const ROLE = { admin: "Administrator", staf: "Staf", grumbullues: "Grumbullues", fermer: "Fermer" };
const SYNTHETIC = /@login\.relikaj\.al$/i;

export default function Profile({ role }) {
  const [user, setUser] = useState(null);
  const [cur, setCur] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const sub = sb.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const change = async () => {
    setErr(""); setOk("");
    if (p1.length < 8) { setErr("Fjalëkalimi i ri duhet të ketë të paktën 8 shkronja."); return; }
    if (p1 !== p2) { setErr("Të dyja fushat e fjalëkalimit të ri duhet të jenë të njëjta."); return; }
    setBusy(true);
    const email = user?.email || "";
    const check = await sb.auth.signInWithPassword({ email, password: cur });
    if (check.error) { setBusy(false); setErr("Fjalëkalimi aktual nuk është i saktë."); return; }
    const { error } = await sb.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCur(""); setP1(""); setP2("");
    setOk("Fjalëkalimi u ndryshua.");
  };

  const synthetic = SYNTHETIC.test(user?.email || "");

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Profili</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>Llogaria juaj në BioBes Farm.</Text>

      <Card style={{ marginTop: 16 }}>
        <View style={s.listRow}>
          <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
            <Ionicons name="person-circle-outline" size={20} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: C.ink }}>{user?.user_metadata?.name || user?.email || "…"}</Text>
            <Text style={s.mute} numberOfLines={1}>{synthetic ? "Llogari me emër përdoruesi" : user?.email || ""}</Text>
          </View>
          <Chip label={ROLE[role] || role} tone="brand" />
        </View>
      </Card>

      {synthetic && (
        <InfoBox icon="information-circle" tone="warn">
          Kjo llogari nuk ka email të vërtetë, pra rivendosja me email nuk punon. Fjalëkalimin e rivendos administratori i kompanisë te «Përdoruesit», ose kërkojini të vendosë një email.
        </InfoBox>
      )}

      <SectionTitle>Ndrysho fjalëkalimin</SectionTitle>
      <Field label="Fjalëkalimi aktual" value={cur} onChangeText={setCur} secureTextEntry autoCapitalize="none" />
      <Field label="Fjalëkalimi i ri (min. 8 shkronja)" value={p1} onChangeText={setP1} secureTextEntry autoCapitalize="none" />
      <Field label="Përsëriteni fjalëkalimin e ri" value={p2} onChangeText={setP2} secureTextEntry autoCapitalize="none" />
      {!!err && <ErrorBox message={err} />}
      {!!ok && <InfoBox icon="checkmark-circle">{ok}</InfoBox>}
      <Btn title="Ruaj fjalëkalimin" icon="key-outline" onPress={change} busy={busy} disabled={!cur || !p1 || !p2} />

      <SectionTitle>Sesioni</SectionTitle>
      <Btn title="Dil nga llogaria" alt icon="log-out-outline" onPress={() => sb.auth.signOut()} />
    </ScrollView>
  );
}
