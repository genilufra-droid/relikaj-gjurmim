// Testet e dokumenteve: draftet jo të fiskalizuara dhe fletët e magazinës.
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { buildInvoicePdf } from "../src/print/invoice.js";
import { buildStockDocPdf } from "../src/print/stockDoc.js";
import { money, qty, dAlb } from "../src/print/layout.js";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log(`✗ ${msg}\n  pritej: ${JSON.stringify(b)}\n  doli:   ${JSON.stringify(a)}`); }
};
const ok = (c, msg) => (c ? pass++ : (fail++, console.log(`✗ ${msg}`)));

// PDF-lib vizaton tekstin si vargje hex WinAnsi në content streams.
// Lexojmë çdo faqe veçmas për të kontrolluar edhe faqet pasuese.
function pageOperations(page) {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray
    ? Array.from({ length: contents.size() }, (_, i) => contents.lookup(i))
    : [contents];
  return streams.filter((stream) => stream instanceof PDFRawStream)
    .map((stream) => Buffer.from(decodePDFRawStream(stream).decode()).toString("ascii")).join("\n");
}
function pageText(page) {
  const decoder = new TextDecoder("windows-1252");
  return Array.from(pageOperations(page).matchAll(/<([0-9a-f]+)>\s*Tj/gi),
    (m) => decoder.decode(Buffer.from(m[1], "hex"))).join("\n");
}

async function checkDraft(bytes, kind) {
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages().map(pageText);
  pages.forEach((text, i) => {
    ok((text.match(/DRAFT — JO E FISKALIZUAR/g) || []).length >= 2,
      `${kind}: paralajmërim i dukshëm dhe fundfaqe në faqen ${i + 1}`);
    ok(!/NSLF|NIVF|FATURË TATIMORE|48 or|përputhje me Ligjin|KOD-FISKAL-FALS|QR-FALS/i.test(text),
      `${kind}: pa kode fiskale, QR ose pretendime ligjore në faqen ${i + 1}`);
  });
  ok(pages[0].includes("Dokument i brendshëm. Nuk është faturë e fiskalizuar."), `${kind}: shpjegim i statusit`);
  ok(pages[0].includes("Referencë e brendshme:"), `${kind}: numri është referencë e brendshme`);
  return { pdf, pages };
}

// ---------------------------------------------------------------- formatimi
eq(money(1250.5), "1.250,50", "money: mijëshet me pikë, dhjetorja me presje");
eq(money(0), "0,00", "money: zero");
eq(money(-36), "-36,00", "money: negativ");
eq(qty(12), "12", "qty: numër i plotë pa dhjetore");
eq(qty(3.5), "3,50", "qty: dhjetore");
eq(dAlb("2026-11-20"), "20.11.2026", "dAlb: data shqip");

// ---------------------------------------------------------------- drafti i shitjes
const company = {
  name: "BioBes", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë",
  phone: "+355 69 000 0000", email: "info@relikaj.al", vat_payer: true, vat_rate: 20,
  operator_code: "OP-01", bank_account: "AL47 2121 1009 0000 0002 3569 8741",
};
const saleParams = {
  company, kind: "sale", number: "FS-2026-0007", issueDate: "2026-11-20", dueDate: "2026-12-05",
  seller: { name: "BioBes sh.p.k.", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë" },
  buyer: { name: "Klient Sh.p.k.", nipt: "K98765432B", address: "Rr. Dëshmorët", city: "Vlorë" },
  items: [
    { description: "Ferrë e zezë e thatë", unit: "kg", qty: 120, price: 850 },
    { description: "Mjedër e thatë", unit: "kg", qty: 40.5, price: 1450 },
  ],
  payment: "Transfertë bankare", note: "Dërgesa nr. 22",
  // Edhe të dhënat e vjetra/të pavërtetuara nuk duhet të shfaqen si kode fiskale.
  fiscal: { nslf: "KOD-FISKAL-FALS", nivf: "KOD-FISKAL-FALS", qr: "QR-FALS" },
};
const sale = await buildInvoicePdf(saleParams);
ok(sale.length > 3000, "drafti i shitjes: PDF jo e zbrazët");
{
  const { pdf, pages } = await checkDraft(sale, "shitje");
  eq(pdf.getPageCount(), 1, "drafti i shitjes: një faqe");
  const size = pdf.getPage(0).getSize();
  ok(Math.abs(size.width - 595.28) < 1 && Math.abs(size.height - 841.89) < 1, "drafti: format A4");
  const withoutFiscal = await PDFDocument.load(await buildInvoicePdf({ ...saleParams, fiscal: undefined }));
  eq(pageOperations(pdf.getPage(0)), pageOperations(withoutFiscal.getPage(0)), "as kod QR grafik nuk vizatohet nga të dhëna fiskale të pavërtetuara");
  // Çmimi/sasitë dhe shënimi mbeten të pranishme pasi hiqet blloku fiskal.
  for (const value of ["FS-2026-0007", "Ferrë e zezë e thatë", "102.000,00", "192.870,00 LEK", "Dërgesa nr. 22"]) {
    ok(pages[0].includes(value), `shitje: ruhet ${value}`);
  }
}

// ---------------------------------------------------------------- drafti i blerjes
const purchase = await buildInvoicePdf({
  company, kind: "purchase", number: "FB-2026-0004", issueDate: "2026-11-18",
  seller: { name: "Ilir Koçi", nipt: "J12345678K", address: "Fshati Kutë", city: "Mallakastër" },
  buyer: { name: "BioBes sh.p.k.", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë" },
  items: [{ description: "Mjedër e njomë", unit: "kg", qty: 210, price: 320 }],
  payment: "Para në dorë", fiscal: { nslf: "KOD-FISKAL-FALS" },
});
ok(purchase.length > 1800, "drafti i blerjes: PDF jo e zbrazët");
{
  const { pages } = await checkDraft(purchase, "blerje");
  ok(pages[0].includes("DRAFT BLERJE") && pages[0].includes("Ilir Koçi"), "blerje: titulli dhe furnitori");
}

// ---------------------------------------------------------------- drafti i thjeshtuar
await checkDraft(await buildInvoicePdf({ company, kind: "sale_simple", number: "DS-1", issueDate: "2026-11-20" }), "shitje e thjeshtuar");

// ---------------------------------------------------------------- drafti me shumë rreshta (faqe 2)
const many = await buildInvoicePdf({
  company, kind: "sale", number: "FS-2026-0100", issueDate: "2026-11-20",
  seller: { name: "BioBes sh.p.k.", nipt: "L12345678A" }, buyer: { name: "Klient", nipt: "K1" },
  items: Array.from({ length: 45 }, (_, i) => ({ description: `Produkti ${i + 1} me emër të gjatë për testim`, unit: "kg", qty: 10 + i, price: 100 + i })),
  note: Array.from({ length: 100 }, (_, i) => `Fjala${i + 1}`).join(" "),
  fiscal: { nslf: "KOD-FISKAL-FALS", nivf: "KOD-FISKAL-FALS", qr: "QR-FALS" },
});
{
  const { pdf, pages } = await checkDraft(many, "draft i gjatë");
  ok(pdf.getPageCount() >= 2, `drafti i gjatë kalon në faqe të dytë (${pdf.getPageCount()} faqe)`);
  const allText = pages.join("\n");
  ok(allText.includes("Produkti 45") && allText.includes("Fjala100"), "draft i gjatë: përfshihen të gjithë artikujt dhe shënimi");
}

// ---------------------------------------------------------------- fletë hyrje / dalje
for (const type of ["hyrje", "dalje"]) {
  const bytes = await buildStockDocPdf({
    type, number: type === "hyrje" ? "FH-2026-0012" : "FD-2026-0031", date: "2026-11-20",
    warehouse: "Depo Qendrore", company,
    party: { name: "Ilir Koçi", nipt: "J12345678K", address: "Fshati Kutë", city: "Mallakastër" },
    reference: "FB-2026-0004",
    items: [{ code: "115", name: "Ferrë e zezë", unit: "kg", qty: 60, price: 850 }],
    note: "Transport me furgon",
  });
  ok(bytes.length > 2000, `fletë ${type}: PDF jo e zbrazët`);
  const pdf = await PDFDocument.load(bytes);
  eq(pdf.getPageCount(), 1, `fletë ${type}: një faqe`);
}

console.log(`\n${pass} teste kaluan, ${fail} dështuan`);
if (fail) process.exit(1);
