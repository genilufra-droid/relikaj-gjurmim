// Asistenti: një fjali e folur ose e shkruar → regjistrim i gatshëm në sistem.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, ChipRow, ErrorBox, Field, InfoBox, SectionTitle, money, today } from "./ui";
import Lookup, { LOOKUPS } from "./Lookup";
import { parseCommand, EXAMPLES } from "./voice/parse";
import { hasDeviceSpeech, startListening, askMicPermission } from "./voice/speech";
import { cloudReady, startRecording, stopRecording, cancelRecording, transcribeFile } from "./voice/cloud";

const INTENT_LABEL = { purchase: "Blerje nga fermeri", task: "Detyrë", observation: "Vëzhgim", input: "Shpenzim / input" };
const INTENT_ICON = { purchase: "basket-outline", task: "checkbox-outline", observation: "bug-outline", input: "nutrition-outline" };

export default function Assistant({ cid, onGo }) {
  const [ctx, setCtx] = useState(null);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [parsed, setParsed] = useState(null);
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(null);
  const [server, setServer] = useState(false);
  const [hint, setHint] = useState("");
  const held = useRef(false);

  const load = useCallback(async () => {
    const [pr, pl, fa, zn] = await Promise.all([
      sb.from("products").select("id,code,name").eq("company_id", cid).eq("active", true).order("name"),
      sb.from("plots").select("id,code,name,zone_id,farmer_id").eq("company_id", cid).eq("active", true).order("code"),
      sb.from("farmers").select("id,first_name,last_name,zone_code").eq("company_id", cid).eq("active", true).order("first_name"),
      sb.from("zones").select("id,code,name").eq("company_id", cid).eq("active", true),
    ]);
    const e = pr.error || pl.error || fa.error || zn.error;
    if (e) { setErr("Të dhënat nuk u lexuan: " + e.message); return; }
    setCtx({ products: pr.data || [], plots: pl.data || [], farmers: fa.data || [], zones: zn.data || [] });
  }, [cid]);

  useEffect(() => { load(); cloudReady().then(setServer); }, [load]);

  const hints = useMemo(() => {
    if (!ctx) return [];
    return [
      ...ctx.products.map((p) => p.name),
      ...ctx.plots.map((p) => p.code || p.name),
      ...ctx.farmers.map((f) => `${f.first_name} ${f.last_name}`),
    ].filter(Boolean);
  }, [ctx]);

  const understand = (value) => {
    const t = String(value ?? text).trim();
    if (!t) { setErr("Shkruani ose thoni një komandë."); return; }
    setErr("");
    setText(t);
    const res = parseCommand(t, { ...(ctx || {}), today: today() });
    if (!res.intent) {
      setErr(res.summary);
      setParsed(null);
      return;
    }
    setParsed(res);
    setDraft({ ...res.draft });
  };

  const reset = () => { setParsed(null); setDraft({}); setText(""); setLive(""); setSaved(null); setErr(""); };

  // ------------------------------------------------------------ zëri
  const listenDevice = async () => {
    setErr("");
    const ok = await askMicPermission();
    if (!ok) { setErr("Leja për mikrofon u refuzua."); return; }
    if (!hasDeviceSpeech()) { setErr("Telefoni nuk ka shërbim të të folurit. Shkruajeni komandën."); return; }
    setListening(true); setLive("");
    const started = startListening({
      lang: "sq-AL",
      hints,
      onPartial: (t) => setLive(t),
      onFinal: (t) => { setListening(false); if (t) { setLive(t); understand(t); } },
      onError: (m, code) => {
        setListening(false);
        if (code === "language-not-supported" && server) setHint("Telefoni s'e mban shqipen — mbajeni shtypur butonin për transkriptim në server.");
        if (m) setErr(m);
      },
      onEnd: () => setListening(false),
    });
    if (!started) setListening(false);
  };

  const startHold = async () => {
    if (!server) { listenDevice(); return; }
    held.current = true;
    setErr(""); setListening(true); setLive("");
    try { await startRecording(); }
    catch (e) { held.current = false; setListening(false); setErr(e.message); }
  };

  const endHold = async () => {
    if (!held.current) return;
    held.current = false;
    setListening(false);
    setBusy(true);
    try {
      const uri = await stopRecording();
      const t = await transcribeFile(uri);
      if (t) { setLive(t); understand(t); }
      else setErr("Nuk u kuptua asgjë. Provoni përsëri.");
    } catch (e) {
      setErr(e.message || "Transkriptimi dështoi");
    } finally {
      setBusy(false);
    }
  };

  const cancelHold = async () => {
    if (!held.current) return;
    held.current = false;
    setListening(false);
    await cancelRecording();
  };

  // ------------------------------------------------------------ ruajtja
  const save = async () => {
    if (!parsed) return;
    setBusy(true); setErr("");
    try {
      if (parsed.intent === "purchase") {
        if (!draft.product_id || !draft.farmer_id || !draft.zone_id || !Number(draft.qty_dry)) {
          throw new Error("Mungon produkti, fermeri, zona ose sasia.");
        }
        const { error } = await sb.from("purchases").insert({
          company_id: cid, date: draft.date || today(), farmer_id: draft.farmer_id, zone_id: draft.zone_id,
          product_id: draft.product_id, plot_id: draft.plot_id || null, cut: draft.cut || "I",
          qty_fresh: Number(draft.qty_fresh) || Number(draft.qty_dry), qty_dry: Number(draft.qty_dry),
          price: Number(draft.price) || 0, note: "Regjistruar me asistent",
        });
        if (error) throw new Error(error.message);
        setSaved({ intent: "purchase" });
      } else if (parsed.intent === "task") {
        const { error } = await sb.from("tasks").insert({
          company_id: cid, title: (draft.title || text).slice(0, 120), type: draft.type || "other",
          due_date: draft.due_date || today(), plot_id: draft.plot_id || null,
          assignee_farmer_id: draft.farmer_id || null, priority: draft.priority || "normal", notes: "Regjistruar me asistent",
        });
        if (error) throw new Error(error.message);
        setSaved({ intent: "task" });
      } else if (parsed.intent === "observation") {
        const { error } = await sb.from("observations").insert({
          company_id: cid, plot_id: draft.plot_id || null, date: draft.date || today(),
          kind: draft.kind || "other", severity: Number(draft.severity) || 1,
          description: (draft.description || text).slice(0, 200), resolved: false,
        });
        if (error) throw new Error(error.message);
        setSaved({ intent: "observation" });
      } else if (parsed.intent === "input") {
        const { error } = await sb.from("inputs").insert({
          company_id: cid, plot_id: draft.plot_id || null, date: draft.date || today(),
          category: draft.category || "other", description: (draft.description || text).slice(0, 200),
          qty: Number(draft.qty) || null, unit: draft.unit || "", amount: Number(draft.amount) || 0,
        });
        if (error) throw new Error(error.message);
        setSaved({ intent: "input" });
      }
    } catch (e) {
      setErr(e.message || "Nuk u ruajt");
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  // ------------------------------------------------------------ pamja
  if (!ctx) return <View style={[s.screen, s.pad]}><ActivityIndicator color={C.brand} /><Text style={[s.mute, { marginTop: 10 }]}>Po hapen të dhënat…</Text></View>;

  if (saved) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <View style={[s.card, { alignItems: "center", paddingVertical: 26, marginTop: 20 }]}>
          <View style={[s.iconCircle, { backgroundColor: C.okSoft, width: 58, height: 58, borderRadius: 18 }]}>
            <Ionicons name="checkmark" size={30} color={C.ok} />
          </View>
          <Text style={[s.h2, { marginTop: 12 }]}>{INTENT_LABEL[saved.intent]} u regjistrua</Text>
          <Text style={[s.mute, { marginTop: 4, textAlign: "center" }]}>Asistenti e ka ruajtur të dhënën në sistem.</Text>
        </View>
        <Btn title="Regjistro tjetër" icon="mic-outline" onPress={reset} />
        {saved.intent === "purchase" && <Btn title="Shiko blerjet" alt onPress={() => onGo("blerje")} />}
        {saved.intent === "task" && <Btn title="Shiko detyrat" alt onPress={() => onGo("detyra")} />}
        {saved.intent === "observation" && <Btn title="Shiko vëzhgimet" alt onPress={() => onGo("vezhgime")} />}
        {saved.intent === "input" && <Btn title="Shiko inputet" alt onPress={() => onGo("inpute")} />}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Asistenti</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>
        Thoni ose shkruani çfarë bëtë në fushë — unë e kthej në regjistrim: blerje, detyrë, vëzhgim ose shpenzim.
      </Text>

      <View style={{ alignItems: "center", marginTop: 18 }}>
        <TouchableOpacity
          onPressIn={startHold}
          onPressOut={endHold}
          onLongPress={() => { if (!server) listenDevice(); }}
          delayLongPress={400}
          activeOpacity={0.85}
          style={{
            width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center",
            backgroundColor: listening ? C.red : C.brand,
            shadowColor: "#0B1F10", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
          }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={listening ? "stop" : "mic-outline"} size={42} color="#fff" />}
        </TouchableOpacity>
        <Text style={[s.mute, { marginTop: 10 }]}>
          {busy ? "Po dëgjohet…" : listening ? (server ? "Duke regjistruar — lëshojeni për të dërguar" : "Duke dëgjuar…") : server ? "Mbajeni shtypur për të folur" : "Shtypni për të folur"}
        </Text>
        {!!live && <Text style={{ color: C.ink, marginTop: 8, fontStyle: "italic", textAlign: "center" }}>«{live}»</Text>}
      </View>

      {!!hint && <InfoBox icon="information-circle">{hint}</InfoBox>}
      {!!err && <ErrorBox message={err} />}

      <SectionTitle>Ose shkruajeni</SectionTitle>
      <TextInput
        style={[s.input, { minHeight: 74, textAlignVertical: "top" }]}
        multiline
        value={text}
        onChangeText={setText}
        placeholder="blerje 120 kilo ferrë e zezë nga Ilir Koçi parcela D01 me çmim 80 lek"
        placeholderTextColor={C.mute}
      />
      <Btn title="Kupto komandën" icon="sparkles-outline" onPress={() => understand()} disabled={!text.trim()} />

      {!parsed && (
        <>
          <SectionTitle>Shembuj</SectionTitle>
          <ChipRow>
            {EXAMPLES.map((ex) => (
              <TouchableOpacity key={ex} onPress={() => { setText(ex); understand(ex); }}>
                <Chip label={ex.length > 34 ? `${ex.slice(0, 34)}…` : ex} tone="neutral" />
              </TouchableOpacity>
            ))}
          </ChipRow>
        </>
      )}

      {!!parsed && (
        <>
          <SectionTitle right={<Chip label={`${Math.round(parsed.confidence * 100)}%`} tone={parsed.confidence > 0.7 ? "ok" : "warn"} />}>
            Kuptova
          </SectionTitle>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: C.leaf }}>
            <View style={[s.listRow, { alignItems: "flex-start" }]}>
              <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
                <Ionicons name={INTENT_ICON[parsed.intent]} size={19} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.ink }}>{INTENT_LABEL[parsed.intent]}</Text>
                <Text style={[s.mute, { marginTop: 3 }]}>{parsed.summary}</Text>
              </View>
            </View>
          </Card>

          <SectionTitle>Kontrolloni dhe plotësoni</SectionTitle>

          {parsed.intent !== "task" && (
            <Field label="Data (yyyy-mm-dd)" value={String(draft.date || "")} onChangeText={set("date")} />
          )}

          {parsed.intent === "purchase" && (
            <>
              <Lookup title="Produkti" cid={cid} cfg={LOOKUPS.product} value={draft.product_id} onChange={(id) => set("product_id")(id)} />
              <Lookup title="Fermeri" cid={cid} cfg={LOOKUPS.farmer} value={draft.farmer_id} onChange={(id, row) => { set("farmer_id")(id); if (row?.zone_code && ctx.zones) { const z = ctx.zones.find((x) => x.code === row.zone_code); if (z) set("zone_id")(z.id); } }} />
              <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={draft.plot_id} onChange={(id, row) => { set("plot_id")(id); if (row?.zone_id) set("zone_id")(row.zone_id); if (row?.farmer_id) set("farmer_id")(row.farmer_id); }} />
              <Lookup title="Zona" cid={cid} cfg={LOOKUPS.zone} value={draft.zone_id} onChange={(id) => set("zone_id")(id)} />
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Field label="Sasia (kg)" value={draft.qty_dry == null ? "" : String(draft.qty_dry)} onChangeText={(v) => { set("qty_dry")(v); set("qty_fresh")(v); }} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Çmimi / kg" value={draft.price == null ? "" : String(draft.price)} onChangeText={set("price")} keyboardType="numeric" />
                </View>
              </View>
              <Text style={[s.mute, { marginTop: 6 }]}>
                Vlera: {money((Number(draft.qty_dry) || 0) * (Number(draft.price) || 0))} · loti krijohet vetë
              </Text>
            </>
          )}

          {parsed.intent === "task" && (
            <>
              <Field label="Titulli" value={draft.title || ""} onChangeText={set("title")} />
              <Field label="Afati (yyyy-mm-dd)" value={String(draft.due_date || "")} onChangeText={set("due_date")} />
              <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={draft.plot_id} onChange={(id) => set("plot_id")(id)} />
            </>
          )}

          {parsed.intent === "observation" && (
            <>
              <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={draft.plot_id} onChange={(id) => set("plot_id")(id)} />
              <Field label="Përshkrimi" value={draft.description || ""} onChangeText={set("description")} multiline />
              <Text style={[s.mute, { marginTop: 6 }]}>
                Lloji: {draft.kind || "other"} · ashpërsia: {draft.severity || 1}/3
              </Text>
            </>
          )}

          {parsed.intent === "input" && (
            <>
              <Lookup title="Parcela" cid={cid} cfg={LOOKUPS.plot} value={draft.plot_id} onChange={(id) => set("plot_id")(id)} />
              <Field label="Përshkrimi" value={draft.description || ""} onChangeText={set("description")} multiline />
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Field label="Sasia" value={draft.qty == null ? "" : String(draft.qty)} onChangeText={set("qty")} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Njësia" value={draft.unit || ""} onChangeText={set("unit")} />
                </View>
              </View>
              <Field label="Vlera (lekë)" value={draft.amount == null ? "" : String(draft.amount)} onChangeText={set("amount")} keyboardType="numeric" />
            </>
          )}

          {!!err && <ErrorBox message={err} />}
          <Btn title="Ruaj në sistem" icon="checkmark-done-outline" onPress={save} busy={busy} />
          <Btn title="Fshi dhe provo përsëri" alt onPress={reset} />
        </>
      )}

      {!server && (
        <InfoBox icon="cloud-offline-outline" tone="warn">
          Transkriptimi në server nuk është aktivizuar. Për shqipen ai është rruga më e sigurt: çelësi vendoset te Supabase → Edge Functions → Secrets (OPENAI_API_KEY).
        </InfoBox>
      )}
    </ScrollView>
  );
}
