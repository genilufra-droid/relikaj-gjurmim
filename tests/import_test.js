// Testet e importimit nga Excel/CSV — ekzekutohen me esbuild + node (shih fundin e skedarit).
import JSZip from "jszip";
import { parseCsv, parseHtmlTable, parseXlsx, readWorkbook, guessHeaderRow, headerOf, base64ToText } from "../src/import/parse.js";
import { guessMapping, prepareRows, buildContext, toNum, norm } from "../src/import/spec.js";
import { buildTemplateWorkbook } from "../src/import/template.js";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log(`✗ ${msg}\n  pritej: ${JSON.stringify(b)}\n  doli:   ${JSON.stringify(a)}`); }
};
const ok = (c, msg) => (c ? pass++ : (fail++, console.log(`✗ ${msg}`)));

// ---------------------------------------------------------------- CSV
{
  const csv = "\ufeffKodi;Emri;Djerr\r\nW01;\"Tepelenë\";po\r\nW02;\"Çorovodë, Skrapar\";jo\r\n";
  const rows = parseCsv(csv);
  eq(rows.length, 3, "CSV: numri i rreshtave");
  eq(rows[0], ["Kodi", "Emri", "Djerr"], "CSV: titujt pastrohen nga BOM");
  eq(rows[1][1], "Tepelenë", "CSV: UTF-8 shqip");
  eq(rows[2][1], "Çorovodë, Skrapar", "CSV: presje brenda thonjëzave");
  eq(parseCsv('a,b\n1,"x""y"')[1][1], 'x"y', "CSV: thonjëza të dyfishuara");
}

// ---------------------------------------------------------------- HTML «.xls»
{
  const html = `<html><body><table><tr><td>Emri</td><td>Sipërfaqja</td></tr>
    <tr><td>D01 &amp; D02</td><td>2,5</td></tr></table></body></html>`;
  const rows = parseHtmlTable(html);
  eq(rows.length, 2, "HTML: rreshtat");
  eq(rows[1][0], "D01 & D02", "HTML: entitetet dekodohen");
}

// ---------------------------------------------------------------- XLSX i vërtetë
async function makeXlsx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets><sheet name="Parcelat" sheetId="1" r:id="rId1"/><sheet name="Fermerët" sheetId="2" r:id="rId2"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships>
    <Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="worksheet" Target="worksheets/sheet2.xml"/></Relationships>`);
  zip.file("xl/sharedStrings.xml", `<?xml version="1.0"?><sst count="8"><si><t>Kodi</t></si><si><t>Emri</t></si>
    <si><t>Parcela e sipërme</t></si><si><r><t>Parcela</t></r><r><t> e poshtme</t></r></si>
    <si><t>Ilir Koçi</t></si><si><t>Sipërfaqja</t></si></sst>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>5</v></c></row>
    <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="inlineStr"><is><t>D01</t></is></c><c r="C2"><v>2.5</v></c></row>
    <row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>D02</v></c><c r="C3"><v>3,75</v></c></row>
    <row r="4"/>
  </sheetData></worksheet>`);
  zip.file("xl/worksheets/sheet2.xml", `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>1</v></c></row>
    <row r="2"><c r="A2" t="s"><v>4</v></c></row>
  </sheetData></worksheet>`);
  return await zip.generateAsync({ type: "nodebuffer" });
}

const buf = await makeXlsx();
const b64 = Buffer.from(buf).toString("base64");
{
  const sheets = await parseXlsx(b64);
  eq(sheets.map((x) => x.name), ["Parcelat", "Fermerët"], "XLSX: emrat e fletëve");
  eq(sheets[0].rows[0], ["Kodi", "Emri", "Sipërfaqja"], "XLSX: titujt");
  eq(sheets[0].rows[1], ["Parcela e sipërme", "D01", 2.5], "XLSX: qeliza të përziera");
  eq(sheets[0].rows[2][0], "Parcela e poshtme", "XLSX: tekst i ndarë në rrahje");
  eq(sheets[1].rows[1][0], "Ilir Koçi", "XLSX: fleta e dytë");

  const wb = await readWorkbook({ base64: b64, name: "parcelat.xlsx" });
  eq(wb.kind, "xlsx", "readWorkbook: njeh xlsx-in");
  eq(wb.sheets.length, 2, "readWorkbook: të dyja fletët");

  const wbCsv = await readWorkbook({ base64: Buffer.from("Emri;Kodi\nA;1\n").toString("base64"), name: "x.csv" });
  eq(wbCsv.kind, "csv", "readWorkbook: njeh csv-n");
  eq(wbCsv.sheets[0].rows[1], ["A", "1"], "readWorkbook: csv me pikëpresje");

  eq(base64ToText(Buffer.from("Tepelenë Çorovodë").toString("base64")), "Tepelenë Çorovodë", "base64 → UTF-8 shqip");

  let threw = false;
  try { await readWorkbook({ base64: Buffer.from("\xd0\xcf\x11\xe0abcd").toString("base64"), name: "vjetër.xls" }); }
  catch (e) { threw = /xlsx/.test(e.message); }
  ok(threw, "readWorkbook: .xls i vjetër jep mesazh të qartë");
}

// ---------------------------------------------------------------- njohja e titujve
{
  const headers = ["Nr", "Emri i parcelës", "Sipërfaqja (ha)", "Zona", "Fermeri", "Gjerësi", "Gjatësi", "Ujitja"];
  const m = guessMapping(headers, "plots");
  eq(headers[m.name], "Emri i parcelës", "mapping: emri i parcelës");
  eq(headers[m.area_ha], "Sipërfaqja (ha)", "mapping: sipërfaqja");
  eq(headers[m.zone_code], "Zona", "mapping: zona");
  eq(headers[m.farmer_ref], "Fermeri", "mapping: fermeri");
  eq(headers[m.lat], "Gjerësi", "mapping: lat");
  eq(headers[m.irrigation], "Ujitja", "mapping: ujitja");

  const mf = guessMapping(["Emri i plotë", "Telefoni", "Nr. i kartës", "Zona"], "farmers");
  eq(["full_name", "phone", "id_number", "zone_code"].every((k) => mf[k] !== undefined), true, "mapping: fermerët me emër të plotë");

  const hp = headerOf(["Kodi", "", "Kodi", "Emri"]);
  eq(hp, ["Kodi", "", "Kodi (2)", "Emri"], "headerOf: titujt e përsëritur numerohen");
  eq(guessHeaderRow([["Raporti i parcelave"], ["Kodi", "Emri"], ["D01", "A"]]), 1, "guessHeaderRow: kalon titullin e raportit");
}

// ---------------------------------------------------------------- vlerat
eq(toNum("2,5"), 2.5, "toNum: presje dhjetore");
eq(toNum("1.250,50"), 1250.5, "toNum: format shqip");
eq(toNum("1,250.50"), 1250.5, "toNum: format anglisht");
eq(toNum("2.5 ha"), 2.5, "toNum: me njësi");
eq(toNum(""), null, "toNum: bosh");
eq(norm("Çorovodë"), "corovode", "norm: diakritikat");

// ---------------------------------------------------------------- përgatitja e rreshtave
{
  const ctx = buildContext({
    zones: [{ id: 10, code: "W01", name: "Tepelenë" }],
    farmers: [{ id: 20, first_name: "Ilir", last_name: "Koçi", id_number: "K123", phone: "0691234567", zone_code: "W01" }],
    plots: [{ id: 30, code: "D09", name: "Parcela e vjetër" }],
    products: [],
  });
  const mapping = { name: 0, code: 1, area_ha: 2, zone_code: 3, farmer_ref: 4, growing: 5, irrigation: 6, note: 7 };
  const rows = [
    ["Parcela A", "D01", "2,5", "W01", "Ilir Koçi", "arë", "pikëz", ""],
    ["Parcela B", "D02", "3.75", "W99", "Nuk Ekziston", "serë", "sprinkler", ""],
    ["", "D03", "1", "W01", "", "", "", ""],
    ["Parcela A dublike", "D01", "9", "W01", "", "", "", ""],
    ["Parcela e vjetër", "D09", "4", "W01", "K123", "", "", "ekzistuese"],
  ];
  const out = prepareRows("plots", mapping, rows, ctx, { mode: "skip", lineOffset: 1 });
  eq(out.counts.create, 2, "prepare: dy të reja (D01, D02)");
  eq(out.counts.skip, 1, "prepare: D09 ekziston → anashkalohet");
  eq(out.counts.error, 2, "prepare: pa emër + dublikatë");
  const a = out.ready.find((r) => r.values.code === "D01");
  eq(a.values.area_ha, 2.5, "prepare: sipërfaqja shqip → 2.5");
  eq(a.values.zone_id, 10, "prepare: zona lidhet me id");
  eq(a.values.farmer_id, 20, "prepare: fermeri lidhet me emër");
  eq(a.values.growing, "field", "prepare: «arë» → field");
  eq(a.values.irrigation, "drip", "prepare: «pikëz» → drip");
  const b = out.ready.find((r) => r.values.code === "D02");
  eq(b.values.farmer_id, null, "prepare: fermer i panjohur → pa lidhje");
  ok(b.warnings.some((w) => w.includes("W99")), "prepare: paralajmërim për zonën e panjohur");
  ok(b.warnings.some((w) => w.includes("Nuk Ekziston")), "prepare: paralajmërim për fermerin e panjohur");
  const e = out.ready.find((r) => r.values.code === "D09");
  eq(e.id, 30, "prepare: id-ja e parcelës ekzistuese");

  // prona dhe gjendja
  const pm = { name: 0, ownership: 1, status: 2 };
  const pout = prepareRows("plots", pm, [["P1", "me qira", "djerr"], ["P2", "djerr", "në prodhim"], ["P3", "", ""]], ctx, { mode: "skip" });
  eq([pout.ready[0].values.ownership, pout.ready[0].values.status], ["leased", "fallow"], "prepare: «me qira» + «djerr»");
  eq([pout.ready[1].values.ownership, pout.ready[1].values.status], ["wild", "active"], "prepare: «djerr» si pronë + «në prodhim»");
  eq([pout.ready[2].values.ownership, pout.ready[2].values.status], ["owned", "active"], "prepare: vlerat e paracaktuara");

  const upd = prepareRows("plots", mapping, rows, ctx, { mode: "update", lineOffset: 1 });
  eq(upd.counts.update, 1, "prepare: modaliteti «përditëso»");
  eq(upd.counts.skip, 0, "prepare: pa anashkalime në modalitetin update");

  // fermerët: emri i plotë ndahet, id-ja njihet
  const fctx = buildContext({ farmers: [{ id: 5, first_name: "Arben", last_name: "Memi", id_number: "K999", phone: "" }] });
  const fout = prepareRows("farmers", { full_name: 0, phone: 1, id_number: 2, zone_code: 3 },
    [["Arben Memi", "069 11 22 333", "K999", "W01"], ["Blerim Hoxha", "", "K777", ""]], fctx, { mode: "skip" });
  eq([fout.ready[0].values.first_name, fout.ready[0].values.last_name], ["Arben", "Memi"], "prepare: emri i plotë ndahet");
  eq(fout.ready[0].action, "skip", "prepare: fermeri me ID ekzistuese anashkalohet");
  eq(fout.ready[1].action, "create", "prepare: fermer i re me ID");
}

// ---------------------------------------------------------------- shablloni .xlsx
{
  const b64 = await buildTemplateWorkbook();
  const wb = await readWorkbook({ base64: b64, name: "shabllon.xlsx" });
  const names = wb.sheets.map((s) => s.name);
  eq(names, ["Udhëzime", "Zonat", "Fermerët", "Parcelat", "Produktet", "Shembuj"], "shabllon: radha e fletëve (Listat është e fshehur)");

  const guide = wb.sheets[0];
  ok(guide.rows.some((r) => String(r[0] || "").includes("Shabllon importimi")), "shabllon: titulli i udhëzimeve");
  ok(guide.rows.some((r) => String(r[0] || "").includes("RREGULLAT E PLOTËSIMIT")), "shabllon: rregullat");
  ok(guide.rows.some((r) => String(r[0] || "").includes("Fleta «Parcelat»")), "shabllon: dokumentimi i kolonave");

  const plots = wb.sheets[3];
  ok(plots.rows[0].some((c) => String(c).includes("Sipërfaqja")), "shabllon: titujt e parcelave");
  eq(plots.rows.length, 1, "shabllon: fleta e të dhënave ka vetëm titujt (pa shembull që importohet)");

  const ex = wb.sheets[5];
  ok(ex.rows.some((r) => String(r[0] || "").includes("Shembuj plotësimi")), "shabllon: fleta e shembujve");
  ok(ex.rows.some((r) => r[0] === "Parcela 1"), "shabllon: shembulli i parcelës");
  ok(ex.rows.some((r) => r.some((c) => typeof c === "number" && c > 40)), "shabllon: shembulli me numra");

  // struktura e skedarit: validime, rresht i ngrirë, bashkim qelizash, fletë e fshehur
  const zip = await JSZip.loadAsync(b64, { base64: true });
  const meta = await zip.file("xl/workbook.xml").async("string");
  ok(meta.includes('state="hidden"'), "shabllon: fleta «Listat» e fshehur");
  const parcelat = await zip.file("xl/worksheets/sheet4.xml").async("string");
  ok(parcelat.includes('type="list"'), "shabllon: lista zgjedhjeje (dropdown)");
  ok(parcelat.includes("state=\"frozen\""), "shabllon: rreshti i titujve i ngrirë");
  ok(parcelat.includes("Listat!$C$2:$C$4"), "shabllon: lista e pronës lidhet me fletën Listat");
  const udhezime = await zip.file("xl/worksheets/sheet1.xml").async("string");
  ok(udhezime.includes("<mergeCell"), "shabllon: qelizat e udhëzimeve të bashkuara");

  // shablloni me titujt tanë lidhet 100%
  const mp = guessMapping(headerOf(plots.rows[0]), "plots");
  eq(["name", "code", "area_ha", "zone_code", "farmer_ref", "ownership", "status", "irrigation"].every((k) => mp[k] !== undefined), true, "shabllon: kolonat njihen vetë");
}

console.log(`\n${pass} teste kaluan, ${fail} dështuan`);
if (fail) process.exit(1);
