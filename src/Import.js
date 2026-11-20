// Importim nga Excel / CSV: shablloni → skedari → kolonat → importimi.
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { sb } from "./supabase";
import { pickSpreadsheet } from "./uploads";
import { readWorkbook, headerOf, guessHeaderRow } from "./import/parse";
import { ENTITIES, ENTITY_ORDER, guessMapping, prepareRows, fieldsOf, norm } from "./import/spec";
import { buildTemplateWorkbook, templateSheetName } from "./import/template";
import { loadContext, persist, importRows } from "./import/run";
import { s, C, Btn, Card, Chip, ChipRow, ErrorBox, InfoBox, SectionTitle, Segmented, BackBar } from "./ui";

const ENTITY_TAB = { zones: "zonat", farmers: "parcelat", plots: "parcelat", products: null };
const ACTION_LABEL = { create: "I ri", update: "Përditësim", skip: "Ekziston" };
const ACTION_TONE = { create: "ok", update: "info", skip: "warn" };
const ORDER_ALL = ["zones", "farmers", "products", "plots"];

function Picker({ open, title, options, selected, onPick, onClose }) {
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: 44 }]}>
        <View style={[s.pad, { paddingBottom: 0 }]}>
          <Text style={s.h1}>{title}</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>Zgjidhni kolonën e skedarit që përputhet.</Text>
        </View>
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.index)}
          contentContainerStyle={s.pad}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, { borderColor: selected === item.index ? C.brand : C.line, borderWidth: selected === item.index ? 2 : 1 }]}
              onPress={() => onPick(item.index)}
            >
              <View style={s.listRow}>
                <Text style={{ flex: 1, color: C.ink, fontWeight: "600" }}>{item.label}</Text>
                {selected === item.index && <Ionicons name="checkmark-circle" size={20} color={C.brand} />}
              </View>
            </TouchableOpacity>
          )}
        />
        <View style={[s.pad, { paddingTop: 0 }]}>
          <Btn title="Pa kolonë" alt onPress={() => onPick(-1)} />
          <Btn title="Mbyll" alt onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default function Import({ cid, preset, onGo }) {
  const [entityKey, setEntityKey] = useState(preset || null);
  const [step, setStep] = useState(preset ? "file" : "entity");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [file, setFile] = useState(null);
  const [wb, setWb] = useState(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState("skip");
  const [ctx, setCtx] = useState(null);
  const [picking, setPicking] = useState(null);
  const [result, setResult] = useState(null);   // { rows: [ {entityKey, created...} ] }
  const [batch, setBatch] = useState(false);

  const entity = entityKey ? ENTITIES[entityKey] : null;
  const sheet = wb?.sheets?.[sheetIdx];
  const headers = useMemo(() => (sheet ? headerOf(sheet.rows[headerRow] || []) : []), [sheet, headerRow]);
  const dataRows = useMemo(() => (sheet ? sheet.rows.slice(headerRow + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== "")) : []), [sheet, headerRow]);
  const columnOptions = useMemo(
    () => headers.map((h, i) => ({ index: i, label: h || `Kolona ${i + 1}` })).filter((o) => headers[o.index] !== ""),
    [headers]
  );

  const refreshCtx = async () => setCtx(await loadContext(sb, cid));

  const downloadTemplate = async () => {
    setErr(""); setLoading(true);
    try {
      const base64 = await buildTemplateWorkbook();
      const path = `${FileSystem.cacheDirectory}BioBes-Import-Shabllon.xlsx`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Shablloni i importimit",
          UTI: "org.openxmlformats.spreadsheetml.sheet",
        });
      } else {
        setErr("Shkarkimi nuk mbështetet në këtë pajisje. Skedari ruhet te " + path);
      }
    } catch (e) { setErr(e.message || "Shablloni nuk u përgatit"); }
    finally { setLoading(false); }
  };

  const sheetForEntity = (book, key) => {
    const want = norm(templateSheetName(key));
    const i = (book?.sheets || []).findIndex((sh) => norm(sh.name) === want);
    if (i >= 0) return i;
    return (book?.sheets || []).findIndex((sh) => sh.rows.length > 1 && sh.rows.some((r) => r.filter((c) => String(c ?? "").trim()).length > 1));
  };

  const openFile = async (all = false) => {
    setErr("");
    try {
      const picked = await pickSpreadsheet();
      if (!picked) return;
      setLoading(true);
      const base64 = await FileSystem.readAsStringAsync(picked.uri, { encoding: FileSystem.EncodingType.Base64 });
      const book = await readWorkbook({ base64, name: picked.name });
      if (!book.sheets.length) throw new Error("Skedari s'ka asnjë fletë me të dhëna.");
      setFile({ name: picked.name, size: picked.size });
      setWb(book);
      if (!ctx) await refreshCtx();

      if (all) {
        const found = ORDER_ALL.filter((k) => (book.sheets || []).some((sh) => norm(sh.name) === norm(templateSheetName(k))));
        if (!found.length) throw new Error("Skedari nuk përmban fletët «Zonat», «Fermerët», «Parcelat» ose «Produktet».");
        const rows = [];
        for (const k of found) {
          const i = sheetForEntity(book, k);
          const sh = book.sheets[i];
          const hr = guessHeaderRow(sh.rows);
          const data = sh.rows.slice(hr + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
          if (!data.length) continue;
          const mp = guessMapping(headerOf(sh.rows[hr] || []), k);
          const res = await importRows(sb, cid, k, data, mp, { mode: "skip", lineOffset: hr + 1 });
          rows.push(res);
        }
        await refreshCtx();
        setBatch(true);
        setResult({ rows });
        setStep("done");
        return;
      }

      const i = Math.max(0, sheetForEntity(book, entityKey));
      const hr = guessHeaderRow(book.sheets[i].rows);
      setSheetIdx(i);
      setHeaderRow(hr);
      setMapping(guessMapping(headerOf(book.sheets[i].rows[hr] || []), entityKey));
      setBatch(false);
      setStep("map");
    } catch (e) {
      setErr(e.message || "Skedari nuk u lexua");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wb && entityKey && !batch) setMapping(guessMapping(headers, entityKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetIdx, headerRow, entityKey]);

  const prep = useMemo(() => {
    if (!ctx || !entity || !sheet || batch) return null;
    try {
      return prepareRows(entityKey, mapping, dataRows, ctx, { mode, lineOffset: headerRow + 1 });
    } catch (e) {
      return { ready: [], errors: [{ line: 0, message: e.message }], counts: { total: dataRows.length, create: 0, update: 0, skip: 0, error: 1 } };
    }
  }, [ctx, entity, entityKey, mapping, dataRows, mode, headerRow, sheet, batch]);

  const run = async () => {
    if (!prep || !entity) return;
    setLoading(true); setErr("");
    try {
      const res = await persist(sb, cid, entityKey, prep.ready);
      setResult({ rows: [{ entityKey, ...res, errors: prep.errors, counts: prep.counts }] });
      setBatch(false);
      setStep("done");
      await refreshCtx();
    } catch (e) {
      setErr(e.message || "Importimi dështoi");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setWb(null); setSheetIdx(0); setHeaderRow(0); setResult(null); setMapping({}); setBatch(false);
    setStep(entityKey ? "file" : "entity");
  };
  const pickEntity = (k) => { setEntityKey(k); setMapping({}); setBatch(false); setStep("file"); };

  // ------------------------------------------------------------- 1. regjistri
  if (step === "entity") {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <Text style={s.h1}>Importimi</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>Një skedar, katër fletë. Shablloni përmban udhëzime, lista zgjedhjeje dhe shembuj.</Text>

        <Card style={{ marginTop: 16, borderColor: C.brand, borderWidth: 1, backgroundColor: C.brandSoft }} onPress={downloadTemplate}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: "#fff" }]}>
              <Ionicons name="download-outline" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.brand, fontWeight: "800", fontSize: 15 }}>Shablloni i importimit (.xlsx)</Text>
              <Text style={[s.mute, { marginTop: 2 }]}>Zonat · Fermerët · Parcelat · Produktet</Text>
            </View>
            {loading ? <ActivityIndicator color={C.brand} /> : <Ionicons name="arrow-down-circle-outline" size={22} color={C.brand} />}
          </View>
        </Card>

        <Card onPress={() => openFile(true)}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.infoSoft }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={C.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>Importo shabllonin e plotë</Text>
              <Text style={[s.mute, { marginTop: 2 }]}>Të katër fletët njëherësh, sipas radhës së saktë</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.mute} />
          </View>
        </Card>

        {!!err && <ErrorBox message={err} />}

        <SectionTitle>Ose një regjistër më vete</SectionTitle>
        {ENTITY_ORDER.map((k) => (
          <Card key={k} onPress={() => pickEntity(k)}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: C.surfaceAlt }]}>
                <Ionicons name={ENTITIES[k].icon} size={19} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>{ENTITIES[k].label}</Text>
                <Text style={[s.mute, { marginTop: 2 }]}>{ENTITIES[k].blurb}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.mute} />
            </View>
          </Card>
        ))}
        <InfoBox icon="document-attach-outline">
          Pranon .xlsx dhe .csv. Titujt e kolonave njihen vetë; nëse skedari juaj ka tituj të tjerë, i lidhni në hapin tjetër.
        </InfoBox>
      </ScrollView>
    );
  }

  // ------------------------------------------------------------- 2. skedari
  if (step === "file") {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <BackBar title="Importimi" onBack={() => { setErr(""); setStep("entity"); }} />
        <Text style={s.h1}>{entity?.label}</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>{entity?.blurb}</Text>
        <SectionTitle>Burimi</SectionTitle>
        <Card onPress={() => openFile(false)}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
              <Ionicons name="folder-open-outline" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{file ? file.name : "Zgjidh skedarin"}</Text>
              <Text style={[s.mute, { marginTop: 2 }]}>{file ? "Shtypni për ta zëvendësuar" : "Excel (.xlsx) ose CSV"}</Text>
            </View>
            {loading ? <ActivityIndicator color={C.brand} /> : <Ionicons name="chevron-forward" size={18} color={C.mute} />}
          </View>
        </Card>
        {!!err && <ErrorBox message={err} onRetry={() => openFile(false)} />}
        <Btn title="Shablloni i importimit" alt icon="download-outline" onPress={downloadTemplate} busy={loading} />
        <InfoBox icon="information-circle">
          Shablloni ka nga një fletë për çdo regjistër dhe e gjen vetë fletën «{entity ? templateSheetName(entityKey) : ""}» kur e importoni.
        </InfoBox>
      </ScrollView>
    );
  }

  // ------------------------------------------------------------- 3. kolonat
  if (step === "map") {
    const ready = prep?.ready || [];
    const errs = prep?.errors || [];
    const total = (prep?.counts.create || 0) + (prep?.counts.update || 0);
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
        <BackBar title="Burimi" onBack={() => setStep("file")} />
        <Text style={s.h1}>Lidhja e kolonave</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>{file?.name} · {dataRows.length} rreshta</Text>

        {wb?.sheets?.length > 1 && (
          <>
            <SectionTitle>Fleta</SectionTitle>
            <ChipRow>
              {wb.sheets.map((sh, i) => (
                <TouchableOpacity key={`${sh.name}-${i}`} onPress={() => { setSheetIdx(i); setHeaderRow(guessHeaderRow(sh.rows)); }}>
                  <Chip label={sh.name} tone={i === sheetIdx ? "brand" : "neutral"} />
                </TouchableOpacity>
              ))}
            </ChipRow>
          </>
        )}

        <SectionTitle>Rreshti i titujve</SectionTitle>
        <ChipRow>
          {sheet.rows.slice(0, 6).map((r, i) => (
            <TouchableOpacity key={i} onPress={() => setHeaderRow(i)}>
              <Chip label={`${i + 1}: ${String(r.find((c) => String(c ?? "").trim()) ?? "").slice(0, 16) || "bosh"}`} tone={i === headerRow ? "brand" : "neutral"} />
            </TouchableOpacity>
          ))}
        </ChipRow>

        <SectionTitle right={<Text style={s.mute}>{Object.keys(mapping).length} / {fieldsOf(entityKey).length}</Text>}>Kolonat</SectionTitle>
        {fieldsOf(entityKey).map((f) => (
          <TouchableOpacity key={f.key} style={s.card} onPress={() => setPicking(f.key)} activeOpacity={0.85}>
            <View style={s.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: "700" }}>
                  {f.label}{!!f.req && <Text style={{ color: C.red }}> *</Text>}
                </Text>
                <Text style={[s.mute, { marginTop: 3 }]} numberOfLines={1}>
                  {mapping[f.key] !== undefined && headers[mapping[f.key]] ? `← ${headers[mapping[f.key]]}` : "Pa kolonë"}
                </Text>
              </View>
              <Chip label={mapping[f.key] !== undefined ? "lidhur" : "bosh"} tone={mapping[f.key] !== undefined ? "ok" : f.req ? "danger" : "neutral"} />
            </View>
          </TouchableOpacity>
        ))}

        <SectionTitle>Rreshtat që ekzistojnë</SectionTitle>
        <Segmented options={[["skip", "Anashkaloje"], ["update", "Përditësoje"]]} value={mode} onChange={setMode} />

        <SectionTitle>Parapamje</SectionTitle>
        <View style={[s.card, { flexDirection: "row" }]}>
          {[["Të reja", prep?.counts.create || 0, C.ok], ["Përditësime", prep?.counts.update || 0, C.info], ["Ekzistojnë", prep?.counts.skip || 0, C.warn], ["Gabime", prep?.counts.error || 0, errs.length ? C.red : C.mute]].map(([l, v, col], i) => (
            <View key={l} style={{ flex: 1, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line, paddingLeft: i ? 10 : 0 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: col }}>{v}</Text>
              <Text style={s.mute} numberOfLines={1}>{l}</Text>
            </View>
          ))}
        </View>

        {ready.slice(0, 4).map((r) => (
          <Card key={r.line}>
            <View style={s.row}>
              <Text style={{ color: C.ink, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                {r.values.name || r.values.code || `${r.values.first_name || ""} ${r.values.last_name || ""}`.trim() || `Rreshti ${r.line}`}
              </Text>
              <Chip label={ACTION_LABEL[r.action]} tone={ACTION_TONE[r.action]} />
            </View>
            <Text style={[s.mute, { marginTop: 4 }]} numberOfLines={1}>
              {[
                r.values.code && `kod ${r.values.code}`,
                r.values.area_ha != null && `${r.values.area_ha} ha`,
                r.values.zone_id && "zonë ✓",
                r.values.farmer_id && "fermer ✓",
                r.values.phone,
                r.values.zone_code && `zonë ${r.values.zone_code}`,
              ].filter(Boolean).join(" · ") || "—"}
            </Text>
            {r.warnings.map((w, i) => (
              <Text key={i} style={{ color: C.warn, fontSize: 12, marginTop: 3 }}>• {w}</Text>
            ))}
          </Card>
        ))}
        {ready.length > 4 && <Text style={[s.mute, { marginTop: 2 }]}>…dhe {ready.length - 4} rreshta të tjerë.</Text>}

        {errs.length > 0 && (
          <>
            <SectionTitle>Rreshtat me gabime</SectionTitle>
            {errs.slice(0, 8).map((e, i) => (
              <View key={i} style={[s.warnBox, { marginTop: 6 }]}>
                <Ionicons name="alert-circle" size={16} color={C.warn} />
                <Text style={{ flex: 1, color: C.warn, fontSize: 12.5 }}>Rreshti {e.line}: {e.message}</Text>
              </View>
            ))}
            {errs.length > 8 && <Text style={[s.mute, { marginTop: 6 }]}>…dhe {errs.length - 8} të tjera. Ato nuk importohen.</Text>}
          </>
        )}

        {!!err && <ErrorBox message={err} />}
        <Btn
          title={loading ? "Po importohet…" : `Importo ${total} rreshta`}
          onPress={run}
          busy={loading}
          disabled={!total || loading}
        />
        <Btn title="Anulo" alt onPress={reset} />

        <Picker
          open={!!picking}
          title={picking ? `Kolona për «${fieldsOf(entityKey).find((f) => f.key === picking)?.label}»` : ""}
          options={columnOptions}
          selected={picking && mapping[picking] !== undefined ? mapping[picking] : null}
          onClose={() => setPicking(null)}
          onPick={(idx) => {
            setMapping((m) => {
              const next = { ...m };
              if (idx < 0) delete next[picking];
              else next[picking] = idx;
              return next;
            });
            setPicking(null);
          }}
        />
      </ScrollView>
    );
  }

  // ------------------------------------------------------------- 4. përfundimi
  const rows = result?.rows || [];
  const created = rows.reduce((n, r) => n + (r.created || 0), 0);
  const updated = rows.reduce((n, r) => n + (r.updated || 0), 0);
  const skipped = rows.reduce((n, r) => n + (r.skipped || 0), 0);
  const fails = rows.reduce((n, r) => n + (r.failed?.length || 0), 0);
  const target = !batch && entityKey ? ENTITY_TAB[entityKey] : "parcelat";

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>Importimi përfundoi</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>{file?.name}</Text>
      <View style={[s.card, { flexDirection: "row", marginTop: 16 }]}>
        {[["Të reja", created, C.ok], ["Përditësuar", updated, C.info], ["Anashkaluar", skipped, C.warn], ["Gabime", fails, fails ? C.red : C.mute]].map(([l, v, col], i) => (
          <View key={l} style={{ flex: 1, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line, paddingLeft: i ? 10 : 0 }}>
            <Text style={{ fontSize: 21, fontWeight: "800", color: col }}>{v}</Text>
            <Text style={s.mute} numberOfLines={1}>{l}</Text>
          </View>
        ))}
      </View>

      {rows.map((r) => (
        <Card key={r.entityKey}>
          <View style={s.row}>
            <Text style={{ color: C.ink, fontWeight: "700", flex: 1 }}>{ENTITIES[r.entityKey]?.label}</Text>
            <Chip label={`+${r.created || 0}${r.updated ? ` · ↻${r.updated}` : ""}`} tone={r.created || r.updated ? "ok" : "neutral"} />
          </View>
          <Text style={[s.mute, { marginTop: 4 }]}>
            {r.created || 0} të reja · {r.updated || 0} përditësuar · {r.skipped || 0} ekzistues · {r.errors?.length || 0} gabime
          </Text>
          {!!r.failed?.length && (
            <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
              Rreshti {r.failed[0].line}: {r.failed[0].message}
            </Text>
          )}
        </Card>
      ))}

      <Btn title="Shiko të dhënat" icon="arrow-forward" onPress={() => onGo(target)} />
      <Btn title="Importo skedar tjetër" alt onPress={reset} />
      <Btn title="Kthehu te modulet" alt onPress={() => onGo("modulet")} />
    </ScrollView>
  );
}
