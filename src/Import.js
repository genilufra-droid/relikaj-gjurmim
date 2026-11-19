// Importim nga Excel / CSV: skedari → kolonat → importimi. Pa shkruar asnjë rresht me dorë.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { sb } from "./supabase";
import { pickSpreadsheet } from "./uploads";
import { readWorkbook, headerOf, guessHeaderRow } from "./import/parse";
import { ENTITIES, ENTITY_ORDER, guessMapping, prepareRows, buildContext, templateCsv, fieldsOf } from "./import/spec";
import { s, C, Btn, Card, Chip, ChipRow, ErrorBox, InfoBox, SectionTitle, Segmented, BackBar } from "./ui";

const ENTITY_TAB = { zones: "zonat", farmers: "parcelat", plots: "parcelat", products: null };
const ACTION_LABEL = { create: "I ri", update: "Përditësim", skip: "Ekziston" };
const ACTION_TONE = { create: "ok", update: "info", skip: "warn" };

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

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
  const [result, setResult] = useState(null);

  const entity = entityKey ? ENTITIES[entityKey] : null;
  const sheet = wb?.sheets?.[sheetIdx];
  const headers = useMemo(() => (sheet ? headerOf(sheet.rows[headerRow] || []) : []), [sheet, headerRow]);
  const dataRows = useMemo(() => (sheet ? sheet.rows.slice(headerRow + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== "")) : []), [sheet, headerRow]);

  // kolonat e skedarit si opsione për zgjedhësin
  const columnOptions = useMemo(
    () => headers.map((h, i) => ({ index: i, label: h ? `${h}` : `Kolona ${i + 1} (pa titull)` })).filter((o) => headers[o.index]),
    [headers]
  );

  const loadCtx = useCallback(async () => {
    const [z, f, p, pr] = await Promise.all([
      sb.from("zones").select("id,code,name").eq("company_id", cid),
      sb.from("farmers").select("id,first_name,last_name,id_number,phone,zone_code").eq("company_id", cid),
      sb.from("plots").select("id,code,name").eq("company_id", cid),
      sb.from("products").select("id,code,name").eq("company_id", cid),
    ]);
    const e = z.error || f.error || p.error || pr.error;
    if (e) throw new Error("Të dhënat ekzistuese nuk u lexuan: " + e.message);
    setCtx(buildContext({ zones: z.data || [], farmers: f.data || [], plots: p.data || [], products: pr.data || [] }));
  }, [cid]);

  const openFile = async () => {
    setErr("");
    try {
      const picked = await pickSpreadsheet();
      if (!picked) return;
      setLoading(true);
      const base64 = await FileSystem.readAsStringAsync(picked.uri, { encoding: FileSystem.EncodingType.Base64 });
      const book = await readWorkbook({ base64, name: picked.name });
      if (!book.sheets.length) throw new Error("Skedari s'ka asnjë fletë me të dhëna.");
      const hRow = guessHeaderRow(book.sheets[0].rows);
      setFile({ name: picked.name, size: picked.size });
      setWb(book);
      setSheetIdx(0);
      setHeaderRow(hRow);
      setMapping(guessMapping(headerOf(book.sheets[0].rows[hRow] || []), entityKey));
      if (!ctx) await loadCtx();
      setStep("map");
    } catch (e) {
      setErr(e.message || "Skedari nuk u lexua");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wb && entityKey) setMapping(guessMapping(headers, entityKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetIdx, headerRow, entityKey]);

  const prep = useMemo(() => {
    if (!ctx || !entity || !sheet) return null;
    try {
      return prepareRows(entityKey, mapping, dataRows, ctx, { mode, lineOffset: headerRow + 1 });
    } catch (e) {
      return { ready: [], errors: [{ line: 0, message: e.message }], counts: { total: dataRows.length, create: 0, update: 0, skip: 0, error: 1 } };
    }
  }, [ctx, entity, entityKey, mapping, dataRows, mode, headerRow, sheet]);

  const run = async () => {
    if (!prep || !entity) return;
    setLoading(true); setErr("");
    const table = entity.table;
    const todo = prep.ready.filter((r) => r.action !== "skip");
    let created = 0, updated = 0;
    const failed = [];
    try {
      for (const part of chunk(todo.filter((r) => r.action === "create"), 40)) {
        const payload = part.map((r) => ({ company_id: cid, ...r.values }));
        const { error } = await sb.from(table).insert(payload);
        if (!error) { created += payload.length; continue; }
        for (const r of part) {
          const { error: e1 } = await sb.from(table).insert({ company_id: cid, ...r.values });
          if (e1) failed.push({ line: r.line, message: e1.message }); else created++;
        }
      }
      for (const r of todo.filter((r) => r.action === "update" && r.id)) {
        const { error } = await sb.from(table).update(r.values).eq("id", r.id).eq("company_id", cid);
        if (error) failed.push({ line: r.line, message: error.message }); else updated++;
      }
      setResult({ created, updated, skipped: prep.counts.skip, failed, table: entity.table });
      setStep("done");
      await loadCtx();
    } catch (e) {
      setErr(e.message || "Importimi dështoi");
    } finally {
      setLoading(false);
    }
  };

  const shareTemplate = async () => {
    try {
      const csv = "\ufeff" + templateCsv(entityKey);
      const path = `${FileSystem.cacheDirectory}shabllon-${entityKey}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Shablloni i importimit" });
      else setErr("Shkarkimi nuk mbështetet në këtë pajisje.");
    } catch (e) { setErr(e.message); }
  };

  const reset = () => { setFile(null); setWb(null); setSheetIdx(0); setHeaderRow(0); setResult(null); setMapping({}); setStep(entityKey ? "file" : "entity"); };
  const pickEntity = (k) => { setEntityKey(k); setMapping({}); setStep("file"); };

  // ------------------------------------------------------------- 1. entiteti
  if (step === "entity") {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <Text style={s.h1}>Importo nga Excel</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>Çfarë doni të ngarkoni? Mund të përsëritet sa herë të doni — rreshtat që ekzistojnë nuk dublikohen.</Text>
        <SectionTitle>Hapi 1 · Zgjidhni</SectionTitle>
        {ENTITY_ORDER.map((k) => (
          <Card key={k} onPress={() => pickEntity(k)}>
            <View style={s.listRow}>
              <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
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
        <InfoBox icon="information-circle" tone="info">
          Skedari mund të jetë .xlsx ose .csv, me titujt tuaj të kolonave. Aplikacioni i njeh vetë dhe ju lë t'i rregulloni.
        </InfoBox>
      </ScrollView>
    );
  }

  // ------------------------------------------------------------- 2. skedari
  if (step === "file") {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.pad}>
        <BackBar title="Zgjidh llojin" onBack={() => (preset ? null : setStep("entity"))} />
        <Text style={s.h1}>{entity?.label}</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>{entity?.blurb}</Text>
        <SectionTitle>Hapi 2 · Skedari</SectionTitle>
        <Card onPress={openFile}>
          <View style={s.listRow}>
            <View style={[s.iconCircle, { backgroundColor: C.brandSoft }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{file ? file.name : "Zgjidh skedarin"}</Text>
              <Text style={[s.mute, { marginTop: 2 }]}>{file ? "Shtypni për të zëvendësuar" : "Excel (.xlsx) ose CSV — edhe .xls i eksportuar nga sisteme"}</Text>
            </View>
            {loading ? <ActivityIndicator color={C.brand} /> : <Ionicons name="folder-open-outline" size={20} color={C.mute} />}
          </View>
        </Card>
        {!!err && <ErrorBox message={err} onRetry={openFile} />}
        <Btn title="Shkarko shabllonin" alt icon="download-outline" onPress={shareTemplate} />
        <InfoBox icon="bulb-outline">
          Ka rëndësi vetëm që titujt e kolonave të përshkruajnë përmbajtjen (p.sh. «Emri», «Sipërfaqja», «Telefoni»). Në hapin tjetër i lidhni me fushat.
        </InfoBox>
      </ScrollView>
    );
  }

  // ------------------------------------------------------------- 3. kolonat
  if (step === "map") {
    const ready = prep?.ready || [];
    const errs = prep?.errors || [];
    const canRun = ready.some((r) => r.action !== "skip") || prep?.counts?.skip > 0;
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <BackBar title="Skedari" onBack={() => setStep("file")} />
        <Text style={s.h1}>Lidh kolonat</Text>
        <Text style={[s.sub, { marginTop: 4 }]}>
          {file?.name} · {dataRows.length} rreshta
        </Text>

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

        <SectionTitle right={<Text style={s.mute}>{Object.keys(mapping).length} / {fieldsOf(entityKey).length}</Text>}>Kolonat tuaja</SectionTitle>
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

        <SectionTitle>Nëse rreshti ekziston</SectionTitle>
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
          title={loading ? "Po importohet…" : `Importo ${prep?.counts.create + prep?.counts.update || 0} rreshta`}
          onPress={run}
          busy={loading}
          disabled={!canRun || loading || !(prep?.counts.create + prep?.counts.update)}
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

  // ------------------------------------------------------------- 4. rezultati
  const target = entityKey ? ENTITY_TAB[entityKey] : null;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>Importimi përfundoi</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>{entity?.label} · {file?.name}</Text>
      <View style={[s.card, { flexDirection: "row", marginTop: 16 }]}>
        {[["Të reja", result?.created || 0, C.ok], ["Përditësuar", result?.updated || 0, C.info], ["Anashkaluar", result?.skipped || 0, C.warn], ["Gabime", result?.failed?.length || 0, (result?.failed?.length ? C.red : C.mute)]].map(([l, v, col], i) => (
          <View key={l} style={{ flex: 1, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line, paddingLeft: i ? 10 : 0 }}>
            <Text style={{ fontSize: 21, fontWeight: "800", color: col }}>{v}</Text>
            <Text style={s.mute} numberOfLines={1}>{l}</Text>
          </View>
        ))}
      </View>
      {!!result?.failed?.length && (
        <>
          <SectionTitle>Nuk u ruajtën</SectionTitle>
          {result.failed.slice(0, 10).map((f, i) => (
            <View key={i} style={[s.errBox, { marginTop: 6 }]}>
              <Ionicons name="close-circle" size={16} color={C.red} />
              <Text style={{ flex: 1, color: C.red, fontSize: 12.5 }}>Rreshti {f.line}: {f.message}</Text>
            </View>
          ))}
        </>
      )}
      {target && <Btn title="Shiko të dhënat" icon="arrow-forward" onPress={() => onGo(target)} />}
      <Btn title="Importo skedar tjetër" alt onPress={reset} />
      <Btn title="Kthehu te modulet" alt onPress={() => onGo("modulet")} />
    </ScrollView>
  );
}
