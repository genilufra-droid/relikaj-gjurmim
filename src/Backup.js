// Backup i të dhënave të kompanisë: krijohet në server, ruhet si skedar .json dhe rikthehet prej tij.
// Vetëm administratori. Rikthimi shton/plotëson — nuk fshin asgjë.
import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { sb } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import ResetData from "./ResetData";
import { s, C, Btn, Card, Chip, ErrorBox, InfoBox, SectionTitle, fmt } from "./ui";

export const TABLE_LABEL = {
  warehouses: "Depo", zones: "Zona", farmers: "Fermerë", products: "Produkte", customers: "Klientë",
  plots: "Parcela", leases: "Qira", cultivations: "Kultivime", purchases: "Blerje", shipments: "Dërgesa",
  samples: "Mostra", stock_moves: "Lëvizje magazine", tasks: "Detyra", observations: "Vëzhgime",
  inputs: "Inpute", applications: "Trajtime", land_operations: "Punime toke", payments: "Pagesa",
  batches: "Batch-e", reminders: "Kujtues", documents: "Dokumente",
};

const callFn = async (body) => {
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Veprimi dështoi");
  return j;
};

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const sizeLabel = (bytes) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function Backup({ cid, role }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [last, setLast] = useState(null);       // { at, size, counts }
  const [preview, setPreview] = useState(null);  // { file, payload, dry }
  const [result, setResult] = useState(null);

  const createBackup = async () => {
    setErr(""); setMsg(""); setResult(null);
    setBusy(true);
    try {
      const data = await callFn({ action: "export", company_id: cid });
      const json = JSON.stringify(data);
      const path = `${FileSystem.cacheDirectory}BioBes-Backup-${stamp()}.json`;
      await FileSystem.writeAsStringAsync(path, json);
      setLast({ at: data.created_at, size: json.length, counts: data.counts });
      const total = Object.values(data.counts || {}).reduce((a, n) => a + n, 0);
      setMsg(`Backupi u krijua: ${fmt(total)} rreshta nga ${Object.keys(data.counts || {}).length} tabela.`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Ruaj ose dërgo backupin" });
      }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const pickFile = async () => {
    setErr(""); setMsg(""); setResult(null); setPreview(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) return;
      const file = picked.assets[0];
      setBusy(true);
      const text = await FileSystem.readAsStringAsync(file.uri);
      let payload;
      try { payload = JSON.parse(text); } catch { throw new Error("Skedari nuk lexohet si JSON."); }
      if (payload?.format !== "biobes-backup") throw new Error("Ky skedar nuk është backup i BioBes Farm.");
      const dry = await callFn({ action: "import", company_id: cid, payload, dry_run: true });
      setPreview({ name: file.name || "backup.json", size: text.length, payload, dry });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const runImport = () => {
    if (!preview) return;
    const d = preview.dry.summary;
    Alert.alert(
      "Të rikthehet backupi?",
      `${fmt(d.created)} rreshta do të shtohen, ${fmt(d.reused)} ekzistojnë dhe do të ripërdoren. Asgjë nuk fshihet.`,
      [
        { text: "Anulo", style: "cancel" },
        {
          text: "Rikthe",
          onPress: async () => {
            setBusy(true); setErr("");
            try {
              const r = await callFn({ action: "import", company_id: cid, payload: preview.payload, dry_run: false });
              setResult(r);
              setPreview(null);
              setMsg(`Rikthimi përfundoi: ${fmt(r.summary.created)} u shtuan, ${fmt(r.summary.reused)} u ripërdorën, ${fmt(r.summary.skipped)} u anashkaluan.`);
            } catch (e) { setErr(e.message); }
            setBusy(false);
          },
        },
      ]
    );
  };

  const Counts = ({ counts }) => (
    <View style={{ marginTop: 8 }}>
      {Object.entries(counts || {}).filter(([, n]) => n > 0).map(([t, n]) => (
        <View key={t} style={[s.row, { paddingVertical: 5, borderBottomWidth: 1, borderColor: C.line }]}>
          <Text style={{ color: C.text }}>{TABLE_LABEL[t] || t}</Text>
          <Text style={{ color: C.brand, fontWeight: "700" }}>{fmt(n)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Backup</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>
        Një skedar i vetëm me të gjitha të dhënat e kompanisë. Krijohet në server, ruhet në telefon dhe rikthehet po prej atij skedari.
      </Text>

      <InfoBox icon="shield-checkmark-outline">
        Përfshihen: parcelat, fermerët, zonat, blerjet, mostrat, magazina, punimet, pagesat, dokumentet (regjistrat). Nuk përfshihen: fjalëkalimet, përdoruesit dhe vetë fotot/skedarët e dokumenteve.
      </InfoBox>

      <SectionTitle>Krijo backup</SectionTitle>
      <Btn title="Krijo dhe ruaj skedarin" icon="cloud-download-outline" onPress={createBackup} busy={busy} />
      {!!last && (
        <Card style={{ marginTop: 12 }}>
          <Text style={s.mute}>Backupi i fundit</Text>
          <Text style={{ fontWeight: "800", color: C.ink, marginTop: 2 }}>
            {new Date(last.at).toLocaleString("sq-AL")} · {sizeLabel(last.size)}
          </Text>
          <Counts counts={last.counts} />
        </Card>
      )}

      <SectionTitle>Rikthe nga backup</SectionTitle>
      <Btn title="Zgjidh skedarin .json" alt icon="folder-open-outline" onPress={pickFile} busy={busy} />

      {!!preview && (
        <Card style={{ marginTop: 12 }}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>{preview.name}</Text>
              <Text style={s.mute}>{sizeLabel(preview.size)} · {preview.payload.company?.name || "kompani"}{preview.payload.created_at ? ` · ${new Date(preview.payload.created_at).toLocaleDateString("sq-AL")}` : ""}</Text>
            </View>
            <Chip label={`${fmt(preview.dry.summary.created)} të reja`} tone="brand" />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Chip label={`${fmt(preview.dry.summary.reused)} ekzistojnë`} tone="neutral" icon="checkmark-done-outline" />
            {preview.dry.summary.skipped > 0 && <Chip label={`${fmt(preview.dry.summary.skipped)} anashkalohen`} tone="warn" icon="alert-circle-outline" />}
          </View>
          <Btn title="Rikthe tani" icon="cloud-upload-outline" onPress={runImport} busy={busy} />
        </Card>
      )}

      {!!result && (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "800", color: C.ink }}>U rikthye</Text>
          <Text style={s.mute}>{fmt(result.summary.created)} u shtuan · {fmt(result.summary.reused)} u ripërdorën · {fmt(result.summary.skipped)} u anashkaluan</Text>
          <Counts counts={Object.fromEntries(Object.entries(result.created).filter(([, n]) => n > 0))} />
        </Card>
      )}

      {!!err && <ErrorBox message={err} />}
      {!!msg && <InfoBox icon="checkmark-circle">{msg}</InfoBox>}
      <ResetData cid={cid} role={role} />
    </ScrollView>
  );
}
