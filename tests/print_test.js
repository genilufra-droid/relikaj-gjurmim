// Testet e dokumenteve: fatura tatimore dhe fletët e magazinës krijohen si PDF të vlefshme.
import { PDFDocument } from "pdf-lib";
import { buildInvoicePdf } from "../src/print/invoice.js";
import { buildStockDocPdf } from "../src/print/stockDoc.js";
import { money, qty, dAlb } from "../src/print/layout.js";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log(`✗ ${msg}\n  pritej: ${JSON.stringify(b)}\n  doli:   ${JSON.stringify(a)}`); }
};
const ok = (c, msg) => (c ? pass++ : (fail++, console.log(`✗ ${msg}`)));

// ---------------------------------------------------------------- formatimi
eq(money(1250.5), "1.250,50", "money: mijëshet me pikë, dhjetorja me presje");
eq(money(0), "0,00", "money: zero");
eq(money(-36), "-36,00", "money: negativ");
eq(qty(12), "12", "qty: numër i plotë pa dhjetore");
eq(qty(3.5), "3,50", "qty: dhjetore");
eq(dAlb("2026-11-20"), "20.11.2026", "dAlb: data shqip");

// ---------------------------------------------------------------- fatura e shitjes
const company = {
  name: "BioBes", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë",
  phone: "+355 69 000 0000", email: "info@relikaj.al", vat_payer: true, vat_rate: 20,
  operator_code: "OP-01", bank_account: "AL47 2121 1009 0000 0002 3569 8741",
};
const sale = await buildInvoicePdf({
  company, kind: "sale", number: "FS-2026-0007", issueDate: "2026-11-20", dueDate: "2026-12-05",
  seller: { name: "BioBes sh.p.k.", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë" },
  buyer: { name: "Klient Sh.p.k.", nipt: "K98765432B", address: "Rr. Dëshmorët", city: "Vlorë" },
  items: [
    { description: "Ferrë e zezë e thatë", unit: "kg", qty: 120, price: 850 },
    { description: "Mjedër e thatë", unit: "kg", qty: 40.5, price: 1450 },
  ],
  payment: "Transfertë bankare", note: "Dërgesa nr. 22",
  fiscal: { nslf: "877246-3432-523235-23525" },
});
ok(sale.length > 3000, "fatura e shitjes: PDF jo e zbrazët");
{
  const pdf = await PDFDocument.load(sale);
  eq(pdf.getPageCount(), 1, "fatura e shitjes: një faqe");
  const size = pdf.getPage(0).getSize();
  ok(Math.abs(size.width - 595.28) < 1 && Math.abs(size.height - 841.89) < 1, "fatura: format A4");
}

// ---------------------------------------------------------------- fatura e blerjes (vetëfaturim)
const purchase = await buildInvoicePdf({
  company, kind: "purchase", number: "FB-2026-0004", issueDate: "2026-11-18",
  seller: { name: "Ilir Koçi", nipt: "J12345678K", address: "Fshati Kutë", city: "Mallakastër" },
  buyer: { name: "BioBes sh.p.k.", nipt: "L12345678A", address: "Rr. Kavajës 12", city: "Tiranë" },
  items: [{ description: "Mjedër e njomë", unit: "kg", qty: 210, price: 320 }],
  payment: "Para në dorë", fiscal: {},
});
ok(purchase.length > 3000, "fatura e blerjes: PDF jo e zbrazët");

// ---------------------------------------------------------------- fatura me shumë rreshta (faqe 2)
const many = await buildInvoicePdf({
  company, kind: "sale", number: "FS-2026-0100", issueDate: "2026-11-20",
  seller: { name: "BioBes sh.p.k.", nipt: "L12345678A" }, buyer: { name: "Klient", nipt: "K1" },
  items: Array.from({ length: 45 }, (_, i) => ({ description: `Produkti ${i + 1} me emër të gjatë për testim`, unit: "kg", qty: 10 + i, price: 100 + i })),
});
{
  const pdf = await PDFDocument.load(many);
  ok(pdf.getPageCount() >= 2, `fatura e gjatë kalon në faqe të dytë (${pdf.getPageCount()} faqe)`);
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
