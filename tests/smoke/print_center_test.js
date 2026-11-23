// Rrjedha e vërtetë e butonave të PrintCenter, me Supabase dhe Expo të simuluara.
import React from "react";
import { act, create } from "react-test-renderer";
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import PrintCenter from "../../src/PrintCenter";
import { getRpcCalls, setRows, setRpc } from "./stub-supabase-client";
import { getPrintOutput, resetPrintOutput } from "./stub-native";

let pass = 0, fail = 0;
const ok = (condition, message) => condition ? pass++ : (fail++, console.log(`✗ ${message}`));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

setRows((table) => ({
  companies: { id: 2, name: "BioBes", nipt: "L12345678A", vat_payer: true, vat_rate: 20 },
  purchases: [{ id: 4, date: "2026-11-18", qty_dry: 2, price: 100, amount: 200, products: { name: "Mjedër" }, farmers: { first_name: "Ilir", last_name: "Koçi" } }],
  stock_moves: [{ id: 7, date: "2026-11-19", qty_out: 3, kind: "out", products: { name: "Mjedër" }, customers: { name: "Klienti" } }],
}[table] ?? []));
setRpc((name, args) => name === "doc_number"
  ? { data: `${args.p_kind}-${args.p_id}`, error: null }
  : { data: "KOD-FISKAL-FALS", error: null });
resetPrintOutput();

let view;
await act(async () => { view = create(<PrintCenter cid={2} role="admin" />); await tick(); });
const textOf = (node) => node.findAll((n) => n.type === "Text").map((n) => n.children.filter((c) => typeof c === "string").join("")).join(" ");
const screenText = () => textOf(view.root);
async function click(label) {
  const buttons = view.root.findAll((n) => n.type === "TouchableOpacity" && n.findAll((x) => x.type === "Text" && x.children.join("") === label).length > 0);
  if (buttons.length !== 1) throw new Error(`Pritej një buton '${label}', u gjetën ${buttons.length}`);
  await act(async () => { await buttons[0].props.onPress(); await tick(); });
}
async function savedText(file) {
  const pdf = await PDFDocument.load(Buffer.from(file.data, "base64"));
  const decoder = new TextDecoder("windows-1252");
  return pdf.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? Array.from({ length: contents.size() }, (_, i) => contents.lookup(i)) : [contents];
    return streams.flatMap((stream) => {
      if (!(stream instanceof PDFRawStream)) return [];
      const ops = Buffer.from(decodePDFRawStream(stream).decode()).toString("ascii");
      return Array.from(ops.matchAll(/<([0-9a-f]+)>\s*Tj/gi), (m) => decoder.decode(Buffer.from(m[1], "hex")));
    }).join(" ");
  }).join("\n");
}

ok(screenText().includes("nuk janë fatura të fiskalizuara"), "paralajmërimi shihet para printimit");
await click("Draft blerje");
let output = getPrintOutput();
ok(output.printedFiles[0]?.endsWith("Draft-blerje-4.pdf"), "printimi i blerjes përdor emër drafti");
let text = await savedText(output.writtenFiles[0]);
ok(text.includes("DRAFT — JO E FISKALIZUAR") && !/NSLF|NIVF/i.test(text), "PDF e blerjes nuk paraqitet si fiskale");
await click("Nda");
output = getPrintOutput();
ok(output.sharedFiles[0]?.endsWith("Draft-blerje-4.pdf"), "ndarja e blerjes përdor emër drafti");
text = await savedText(output.writtenFiles[1]);
ok(text.includes("DRAFT — JO E FISKALIZUAR"), "PDF e ndarë e blerjes është draft");
await click("Fletë hyrje");
output = getPrintOutput();
ok(output.printedFiles[1]?.endsWith("Flete-hyrje-4.pdf"), "fleta e hyrjes vazhdon të printohet");
text = await savedText(output.writtenFiles[2]);
ok(text.includes("FLETË HYRJE") && text.includes("Draft blerje fature_blerje-4"), "fleta i referohet draftit, jo një fature fiskale");

await click("Daljet");
ok(screenText().includes("nuk janë fatura të fiskalizuara"), "paralajmërimi mbetet i dukshëm edhe te daljet");
await click("Draft shitje");
const price = view.root.findAll((n) => n.type === "TextInput" && n.props.placeholder === "0,00");
if (price.length !== 1) throw new Error("Nuk u gjet fusha e çmimit");
await act(async () => { price[0].props.onChangeText("150"); });
await click("Draft shitje");
output = getPrintOutput();
ok(output.printedFiles[2]?.endsWith("Draft-shitje-7.pdf"), "printimi i shitjes përdor emër drafti");
text = await savedText(output.writtenFiles[3]);
ok(text.includes("DRAFT — JO E FISKALIZUAR") && text.includes("450,00") && !/NSLF|NIVF/i.test(text), "PDF e shitjes ruan totalin dhe statusin");
await click("Nda");
output = getPrintOutput();
ok(output.sharedFiles[1]?.endsWith("Draft-shitje-7.pdf"), "ndarja e shitjes përdor emër drafti");
await click("Fletë dalje");
output = getPrintOutput();
ok(output.printedFiles[3]?.endsWith("Flete-dalje-7.pdf"), "fleta e daljes vazhdon të printohet");
const calls = getRpcCalls();
ok(calls.length === 7 && calls.every((call) => call.name === "doc_number"), "asnjë rrugë nuk thërret doc_nslf");

await click("Blerjet");
resetPrintOutput();
setRpc(() => ({ data: null, error: { message: "Numërimi nuk është i disponueshëm" } }));
await click("Draft blerje");
ok(screenText().includes("Numërimi nuk është i disponueshëm"), "gabimi i numërimit shfaqet në vend të PDF-së pa referencë");
ok(getPrintOutput().writtenFiles.length === 0, "nuk printohet nëse numërimi dështon");

await act(async () => { view.unmount(); });
console.log(`\n${pass} teste të rrjedhës së printimit kaluan, ${fail} dështuan`);
if (fail) process.exit(1);
