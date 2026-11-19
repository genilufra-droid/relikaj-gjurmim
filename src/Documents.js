// Dokumentet: foto nga kamera/galeria dhe skedarë PDF/Word/Excel, të lidhura me parcelën.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, ScrollView, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import Lookup, { LOOKUPS } from "./Lookup";
import { s, C, Btn, Field, Card, Chip, Empty, ErrorBox, Loading, SearchBar, Segmented, FAB, fmt } from "./ui";
import { pickPhotoFromCamera, pickPhotoFromLibrary, pickDocument, uploadToBucket, kindOf, humanSize } from "./uploads";

const KINDS = [["all", "Të gjitha"], ["photo", "Foto"], ["pdf", "PDF"], ["doc", "Dokumente"]];
const KIND_LABEL = { photo: "Foto", pdf: "PDF", doc: "Dokument", other: "Skedar" };
const ICON = { photo: "image-outline", pdf: "document-text-outline", doc: "document-outline", other: "attach-outline" };

export function DocumentForm({ cid, onDone }) {
  const [f, setF] = useState({ title: "", plot: null, kind: "photo" });
  const [file, setFile] = useState(null);       // {uri, mime, name, size}
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [picking, setPicking] = useState("");

  const choose = async (how) => {
    setErr(""); setPicking(how);
    try {
      const picked = how === "camera" ? await pickPhotoFromCamera() : how === "library" ? await pickPhotoFromLibrary() : await pickDocument();
      if (!picked) return;
      setFile(picked);
      setF((o) => ({
        ...o,
        kind: kindOf(picked.mime, picked.name),
        title: o.title || picked.name.replace(/\.[a-z0-9]+$/i, ""),
      }));
    } catch (e) {
      setErr(e?.message || "Zgjedhja e skedarit dështoi");
    } finally { setPicking(""); }
  };

  const save = async () => {
    if (!file) { setErr("Zgjidhni një foto ose skedar"); return; }
    setBusy(true); setErr("");
    try {
      const up = await uploadToBucket("field-docs", file.uri, file.mime, file.name);
      const { error } = await sb.from("documents").insert({
        company_id: cid, plot_id: f.plot, kind: f.kind, title: f.title.trim() || file.name,
        path: up.path, url: up.url, mime: file.mime, size_bytes: file.size || 0,
      });
      if (error) throw new Error(error.message);
      onDone();
    } catch (e) {
      setErr(e?.message || "Ngarkimi dështoi");
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Dokument i ri</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>Foto nga kamera, foto nga galeria ose skedar PDF/Word/Excel (kontrata, analiza toke, fatura).</Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <TouchableOpacity style={[s.card, { flex: 1, alignItems: "center", gap: 6, paddingVertical: 18 }]} onPress={() => choose("camera")} activeOpacity={0.85}>
          {picking === "camera" ? <Text style={s.mute}>…</Text> : <Ionicons name="camera-outline" size={26} color={C.brand} />}
          <Text style={{ fontWeight: "700", color: C.ink, fontSize: 13 }}>Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.card, { flex: 1, alignItems: "center", gap: 6, paddingVertical: 18 }]} onPress={() => choose("library")} activeOpacity={0.85}>
          {picking === "library" ? <Text style={s.mute}>…</Text> : <Ionicons name="images-outline" size={26} color={C.brand} />}
          <Text style={{ fontWeight: "700", color: C.ink, fontSize: 13 }}>Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.card, { flex: 1, alignItems: "center", gap: 6, paddingVertical: 18 }]} onPress={() => choose("file")} activeOpacity={0.85}>
          {picking === "file" ? <Text style={s.mute}>…</Text> : <Ionicons name="document-attach-outline" size={26} color={C.brand} />}
          <Text style={{ fontWeight: "700", color: C.ink, fontSize: 13 }}>Skedar</Text>
        </TouchableOpacity>
      </View>

      {!!file && (
        <Card style={{ marginTop: 4 }}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
              <Ionicons name={ICON[kindOf(file.mime, file.name)] || "attach-outline"} size={19} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{file.name}</Text>
              <Text style={s.mute}>{KIND_LABEL[f.kind] || "Skedar"}{file.size ? ` · ${humanSize(file.size)}` : ""}</Text>
            </View>
            <TouchableOpacity onPress={() => setFile(null)} hitSlop={8}><Ionicons name="close-circle" size={20} color={C.mute} /></TouchableOpacity>
          </View>
        </Card>
      )}

      <Field label="Titulli" value={f.title} onChangeText={(v) => setF((o) => ({ ...o, title: v }))} placeholder="P.sh. Kontrata e qirasë 2026" />
      <Lookup title="Parcela (opsionale)" cid={cid} cfg={LOOKUPS.plot} value={f.plot} onChange={(v) => setF((o) => ({ ...o, plot: v }))} />

      {!!err && <ErrorBox message={err} />}
      <Btn title="Ngarko dokumentin" icon="cloud-upload-outline" onPress={save} busy={busy} disabled={!file} />
      <Btn title="Anulo" alt onPress={onDone} />
    </ScrollView>
  );
}

export default function Documents({ cid, role, onNew }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await sb.from("documents_list").select("*").eq("company_id", cid).order("created_at", { ascending: false }).limit(200);
    setErr(error ? error.message : "");
    setRows(data || []); setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const open = (r) => (r.url ? Linking.openURL(r.url) : null);
  const del = (r) => Alert.alert("Fshi dokumentin?", r.title, [
    { text: "Jo" },
    { text: "Fshi", style: "destructive", onPress: async () => { await sb.from("documents").delete().eq("id", r.id); load(); } },
  ]);

  const list = rows.filter((r) => (kind === "all" || r.kind === kind) && (!q.trim() || `${r.title} ${r.plot || ""}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <View style={s.screen}>
      <FlatList
        contentContainerStyle={[s.pad, { paddingBottom: 96 }]}
        data={list}
        keyExtractor={(r) => String(r.id)}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <View style={s.pageTitle}>
              <View>
                <Text style={s.h1}>Dokumentet</Text>
                <Text style={s.mute}>{rows.length} skedarë · foto, PDF, kontrata</Text>
              </View>
              <TouchableOpacity onPress={onNew} style={{ padding: 6 }} hitSlop={8}>
                <Ionicons name="cloud-upload-outline" size={23} color={C.brand} />
              </TouchableOpacity>
            </View>
            <SearchBar value={q} onChange={setQ} placeholder="Kërko dokument…" />
            <View style={{ marginTop: 10 }}><Segmented options={KINDS} value={kind} onChange={setKind} /></View>
            {!!err && <ErrorBox message={"Dokumentet nuk u ngarkuan: " + err} onRetry={load} />}
            {loading && rows.length === 0 && <Loading />}
          </View>
        }
        ListEmptyComponent={!loading && (
          <Empty
            icon="document-text-outline"
            title={q || kind !== "all" ? "Asnjë rezultat" : "Ende pa dokumente"}
            text={q || kind !== "all"
              ? "Provo një kërkim tjetër ose hiq filtrin."
              : "Ngarko kontratat e qirasë, analizat e tokës, faturat e inputeve ose fotot e vëzhgimeve."}
            action={<Btn title="Ngarko dokument" icon="cloud-upload-outline" onPress={onNew} />}
          />
        )}
        renderItem={({ item: r }) => (
          <TouchableOpacity style={s.card} onPress={() => open(r)} onLongPress={() => (role === "admin" || role === "staf") && del(r)} activeOpacity={0.85}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: r.kind === "pdf" ? C.dangerSoft : C.brandSoft }]}>
                <Ionicons name={ICON[r.kind] || "attach-outline"} size={19} color={r.kind === "pdf" ? C.red : C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.ink }} numberOfLines={1}>{r.title}</Text>
                <Text style={s.mute} numberOfLines={1}>
                  {KIND_LABEL[r.kind] || "Skedar"}{r.plot ? ` · ${r.plot}` : ""}{r.size_bytes ? ` · ${humanSize(r.size_bytes)}` : ""}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={C.mute} />
            </View>
          </TouchableOpacity>
        )}
      />
      <FAB label="Ngarko" icon="cloud-upload-outline" onPress={onNew} />
    </View>
  );
}
