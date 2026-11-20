// Faturë tatimore (shitje ose blerje) sipas elementeve të detyrueshme të Ligjit Nr. 87/2019
// «Për faturën dhe sistemin e monitorimit të qarkullimit» dhe Udhëzimit Nr. 16/2020.
// Elementet: kreu i faturës, shitësi, blerësi, numri, datat, sasia/përshkrimi/çmimi,
// vlera, TVSH-ja, vlera totale, mënyra dhe afati i pagesës, NSLF, NIVF, kodi QR, kodi i operatorit.
import { rgb } from "pdf-lib";
import { BRAND, INK, LINE, MARGIN, money, newDocument, qty, dAlb, safe } from "./layout";
import { drawQr } from "./qr";

const WHITE = rgb(1, 1, 1);
const SOFTISH = rgb(0.96, 0.975, 0.95);
const SUBISH = rgb(0.45, 0.5, 0.46);
const PALE = rgb(0.88, 0.94, 0.84);

const TITLES = {
  sale: "FATURË TATIMORE",
  sale_simple: "FATURË-TH",
  purchase: "FATURË TATIMORE — BLERJE",
};

export async function buildInvoicePdf(doc) {
  const {
    company = {}, kind = "sale", number, issueDate, supplyDate, dueDate,
    seller = {}, buyer = {}, items = [], payment = "", currency = "LEK",
    note = "", fiscal = {}, series = "",
  } = doc;

  const vatRate = Number(doc.vatRate ?? company.vat_rate ?? 20);
  const vatPayer = doc.vatPayer ?? company.vat_payer ?? true;
  const rows = items.map((it) => {
    const net = Number(it.qty || 0) * Number(it.price || 0);
    const rate = vatPayer ? Number(it.vat ?? vatRate) : 0;
    return { ...it, net, rate, vat: (net * rate) / 100, gross: net + (net * rate) / 100 };
  });
  const sumNet = rows.reduce((a, r) => a + r.net, 0);
  const sumVat = rows.reduce((a, r) => a + r.vat, 0);
  const sumGross = sumNet + sumVat;

  const d = await newDocument();
  d.footer = `${company.name || "BioBes"} · NIPT ${company.nipt || "—"} · ${TITLES[kind] || "FATURË"}`;
  d.addPage();
  const right = d.w - MARGIN;

  // ---------------------------------------------------------------- kreu
  d.page.drawRectangle({ x: 0, y: d.h - 96, width: d.w, height: 96, color: BRAND });
  d.page.drawText(safe((company.name || "BIOBES FARM").toUpperCase()), { x: MARGIN, y: d.h - 40, size: 15, font: d.bold, color: WHITE });
  const ident = [company.address, company.city].filter(Boolean).join(", ");
  if (ident) d.page.drawText(safe(ident), { x: MARGIN, y: d.h - 56, size: 8.5, font: d.reg, color: PALE });
  d.page.drawText(safe(`NIPT: ${company.nipt || "—"}${company.operator_code ? `   ·   Kodi i operatorit: ${company.operator_code}` : ""}`), { x: MARGIN, y: d.h - 69, size: 8.5, font: d.reg, color: PALE });
  const contact = [company.phone, company.email].filter(Boolean).join(" · ");
  if (contact) d.page.drawText(safe(contact), { x: MARGIN, y: d.h - 82, size: 8, font: d.reg, color: PALE });

  d.page.drawText(safe(TITLES[kind] || "FATURË"), { x: right - d.bold.widthOfTextAtSize(safe(TITLES[kind] || "FATURË"), 13), y: d.h - 42, size: 13, font: d.bold, color: WHITE });
  const nrText = `Nr. ${number || "—"}`;
  d.page.drawText(safe(nrText), { x: right - d.bold.widthOfTextAtSize(safe(nrText), 10), y: d.h - 58, size: 10, font: d.bold, color: WHITE });
  d.page.drawText(safe(`Data: ${dAlb(issueDate)}`), { x: right - d.reg.widthOfTextAtSize(safe(`Data: ${dAlb(issueDate)}`), 8.5), y: d.h - 71, size: 8.5, font: d.reg, color: PALE });
  if (supplyDate && supplyDate !== issueDate) {
    const t = `Furnizimi: ${dAlb(supplyDate)}`;
    d.page.drawText(safe(t), { x: right - d.reg.widthOfTextAtSize(safe(t), 8.5), y: d.h - 82, size: 8.5, font: d.reg, color: PALE });
  }

  // ---------------------------------------------------------------- palët
  d.y = d.h - 110;
  const half = (d.w - 2 * MARGIN - 12) / 2;
  d.partyBlock({
    title: kind === "purchase" ? "SHITËSI (furnitori)" : "SHITËSI",
    name: seller.name,
    lines: [
      `NIPT / ID: ${seller.nipt || "—"}`,
      [seller.address, seller.city].filter(Boolean).join(", "),
      seller.country || "Shqipëri",
    ],
    x: MARGIN, y: d.y, width: half,
  });
  d.partyBlock({
    title: kind === "purchase" ? "BLERËSI (kompania)" : "BLERËSI",
    name: kind === "purchase" ? (company.name || buyer.name) : buyer.name,
    lines: [
      `NIPT / ID: ${(kind === "purchase" ? company.nipt : buyer.nipt) || "—"}`,
      (kind === "purchase" ? [company.address, company.city] : [buyer.address, buyer.city]).filter(Boolean).join(", "),
      (kind === "purchase" ? [company.phone, company.email].filter(Boolean).join(" · ") : (buyer.phone || "")) || "Shqipëri",
    ],
    x: MARGIN + half + 12, y: d.y, width: half,
  });
  d.y -= 80;

  // ---------------------------------------------------------------- artikujt
  if (series) {
    d.page.drawText(safe(series), { x: MARGIN, y: d.y + 6, size: 8, font: d.reg, color: INK });
    d.y -= 4;
  }
  d.table({
    columns: [
      { key: "n", label: "Nr", width: 26 },
      { key: "description", label: "Përshkrimi i mallit / shërbimit", width: 190 },
      { key: "unit", label: "Njësia", width: 42 },
      { key: "qty", label: "Sasia", width: 50, align: "right" },
      { key: "price", label: "Çmimi", width: 62, align: "right" },
      { key: "net", label: "Vlera", width: 74, align: "right" },
      { key: "rate", label: "TVSH %", width: 44, align: "right" },
      { key: "gross", label: "Vlera me TVSH", width: 84, align: "right" },
    ],
    rows: rows.map((r, i) => ({
      n: String(i + 1),
      description: r.description,
      unit: r.unit || "kg",
      qty: qty(r.qty),
      price: money(r.price),
      net: money(r.net),
      rate: vatPayer ? String(r.rate) : "—",
      gross: money(r.gross),
    })),
  });

  // ---------------------------------------------------------------- totalet
  d.y -= 10;
  const boxW = 250, boxX = right - boxW;
  const totalLines = [
    ["Vlera pa TVSH", money(sumNet)],
    ...(vatPayer ? [[`TVSH ${vatRate}%`, money(sumVat)]] : []),
    ["VLERA TOTALE", `${money(sumGross)} ${currency}`],
  ];
  d.need(totalLines.length * 15 + 16);
  d.box(boxX, d.y - totalLines.length * 15 - 6, boxW, totalLines.length * 15 + 6, SOFTISH);
  totalLines.forEach(([label, value], i) => {
    const isLast = i === totalLines.length - 1;
    const y = d.y - 14 - i * 15;
    d.page.drawText(safe(label), { x: boxX + 10, y, size: isLast ? 10 : 8.8, font: isLast ? d.bold : d.reg, color: INK });
    d.page.drawText(safe(value), { x: boxX + boxW - 10 - (isLast ? d.bold : d.reg).widthOfTextAtSize(safe(value), isLast ? 10 : 8.8), y, size: isLast ? 10 : 8.8, font: isLast ? d.bold : d.reg, color: isLast ? BRAND : INK });
  });

  // ---------------------------------------------------------------- pagesa
  d.y -= totalLines.length * 15 + 20;
  const payLines = [
    ["Mënyra e pagesës", payment || "Transfertë bankare"],
    ["Monedha", currency],
    ...(dueDate ? [["Afati i pagesës", dAlb(dueDate)]] : []),
    ...(company.bank_account ? [["Llogaria bankare", company.bank_account]] : []),
  ];
  payLines.forEach(([k, v]) => {
    d.page.drawText(safe(`${k}:`), { x: MARGIN, y: d.y, size: 8.6, font: d.bold, color: INK });
    d.page.drawText(safe(v), { x: MARGIN + 108, y: d.y, size: 8.6, font: d.reg, color: INK });
    d.y -= 13;
  });

  if (note) {
    d.y -= 6;
    d.page.drawText(safe("Shënim:"), { x: MARGIN, y: d.y, size: 8.6, font: d.bold, color: INK });
    d.y -= 12;
    const used = d.text(note, { x: MARGIN, size: 8.6, maxWidth: right - MARGIN });
    d.y -= used + 4;
  }

  // ---------------------------------------------------------------- blloku fiskal
  d.need(96);
  d.y = Math.min(d.y, MARGIN + 96);
  d.hr(d.y + 6, LINE, 0.6);
  d.y -= 6;
  d.page.drawText(safe("TË DHËNAT E FISKALIZIMIT"), { x: MARGIN, y: d.y, size: 7.2, font: d.bold, color: SUBISH });
  d.y -= 12;
  const nslf = fiscal.nslf || "—";
  const nivf = fiscal.nivf || "";
  d.page.drawText(safe(`NSLF: ${nslf}`), { x: MARGIN, y: d.y, size: 8.4, font: d.reg, color: INK });
  d.page.drawText(safe(`NIVF: ${nivf || "—  (fatura nuk është fiskalizuar)"}`), { x: MARGIN, y: d.y - 12, size: 8.4, font: d.reg, color: INK });
  d.page.drawText(safe(`Kodi i operatorit: ${fiscal.operator || company.operator_code || "—"}   ·   Vendi: AL`), { x: MARGIN, y: d.y - 24, size: 8.4, font: d.reg, color: INK });

  if (nivf) {
    drawQr(d.page, fiscal.qr || `NIVF:${nivf}|NSLF:${nslf}|NIPT:${company.nipt || ""}|TOTAL:${sumGross.toFixed(2)}|DATE:${issueDate || ""}`, { x: right - 74, y: d.y + 6, size: 68, color: INK });
  } else {
    d.page.drawText(safe("Pa NIVF, fatura printohet sipas rregullit"), { x: right - 200, y: d.y + 10, size: 6.8, font: d.reg, color: SUBISH });
    d.page.drawText(safe("të punës jashtë linje dhe transmetohet për"), { x: right - 200, y: d.y + 3, size: 6.8, font: d.reg, color: SUBISH });
    d.page.drawText(safe("fiskalizim brenda 48 orëve."), { x: right - 200, y: d.y - 4, size: 6.8, font: d.reg, color: SUBISH });
  }

  d.page.drawText(safe('Lëshuar në përputhje me Ligjin Nr. 87/2019 «Për faturën dhe sistemin e monitorimit të qarkullimit».'), { x: MARGIN, y: 34 + 8, size: 6.6, font: d.reg, color: SUBISH });

  return d.pdf.save();
}
