// Fletë hyrje / fletë dalje e magazinës: dokumenti që shoqëron mallin kur hyn ose del nga depoja.
import { rgb } from "pdf-lib";
import { BRAND, INK, MARGIN, money, newDocument, qty, dAlb, safe } from "./layout";

const WHITE = rgb(1, 1, 1);
const PALE = rgb(0.88, 0.94, 0.84);
const SOFTISH = rgb(0.96, 0.975, 0.95);

/**
 * doc = { type: "hyrje" | "dalje", number, date, warehouse, company, party,
 *         reference, items: [{ code, name, unit, qty, price }], note, transport }
 */
export async function buildStockDocPdf(doc) {
  const { type = "hyrje", number, date, warehouse = "", company = {}, party = {}, reference = "", items = [], note = "", transport = "" } = doc;
  const isIn = type === "hyrje";
  const title = isIn ? "FLETË HYRJE" : "FLETË DALJE";
  const subtitle = isIn ? "Hyrje mallrash në magazinë" : "Dalje mallrash nga magazina";

  const rows = items.map((it) => ({
    ...it,
    net: Number(it.qty || 0) * Number(it.price || 0),
  }));
  const totalQty = rows.reduce((a, r) => a + Number(r.qty || 0), 0);
  const totalValue = rows.reduce((a, r) => a + r.net, 0);

  const d = await newDocument();
  d.footer = `${company.name || "BioBes"} · ${title} ${number || ""} · ${dAlb(date)}`;
  d.addPage();
  const right = d.w - MARGIN;

  d.page.drawRectangle({ x: 0, y: d.h - 88, width: d.w, height: 88, color: BRAND });
  d.page.drawText(safe((company.name || "BIOBES FARM").toUpperCase()), { x: MARGIN, y: d.h - 36, size: 14, font: d.bold, color: WHITE });
  d.page.drawText(safe(`NIPT: ${company.nipt || "—"}${company.city ? ` · ${company.city}` : ""}`), { x: MARGIN, y: d.h - 52, size: 8.4, font: d.reg, color: PALE });
  if (company.address) d.page.drawText(safe(company.address), { x: MARGIN, y: d.h - 65, size: 8.4, font: d.reg, color: PALE });

  d.page.drawText(safe(title), { x: right - d.bold.widthOfTextAtSize(safe(title), 15), y: d.h - 38, size: 15, font: d.bold, color: WHITE });
  d.page.drawText(safe(subtitle), { x: right - d.reg.widthOfTextAtSize(safe(subtitle), 8.2), y: d.h - 52, size: 8.2, font: d.reg, color: PALE });

  d.y = d.h - 104;
  const meta = [
    ["Nr. dokumentit", number || "—"],
    ["Data", dAlb(date)],
    ["Magazina", warehouse || "—"],
    ["Dokumenti shoqërues", reference || "—"],
    ["Transporti", transport || "—"],
  ];
  meta.forEach(([k, v], i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const x = MARGIN + col * ((right - MARGIN) / 2 + 10);
    const y = d.y - rowIdx * 14;
    d.page.drawText(safe(`${k}:`), { x, y, size: 8.2, font: d.bold, color: INK });
    d.page.drawText(safe(v), { x: x + 92, y, size: 8.2, font: d.reg, color: INK });
  });
  d.y -= Math.ceil(meta.length / 2) * 14 + 10;

  d.partyBlock({
    title: isIn ? "FURNITORI" : "MARRËSI",
    name: party.name || "—",
    lines: [party.nipt ? `NIPT / ID: ${party.nipt}` : "", [party.address, party.city].filter(Boolean).join(", "), party.country || "Shqipëri"],
    x: MARGIN, y: d.y, width: right - MARGIN,
  });
  d.y -= 80;

  d.table({
    columns: [
      { key: "n", label: "Nr", width: 26 },
      { key: "code", label: "Kodi", width: 50 },
      { key: "name", label: "Emri i mallit", width: 210 },
      { key: "unit", label: "Njësia", width: 46 },
      { key: "qty", label: "Sasia", width: 55, align: "right" },
      { key: "price", label: "Çmimi", width: 62, align: "right" },
      { key: "net", label: "Vlera", width: 74, align: "right" },
    ],
    rows: rows.map((r, i) => ({
      n: String(i + 1),
      code: r.code || "",
      name: r.name || "",
      unit: r.unit || "kg",
      qty: qty(r.qty),
      price: r.price ? money(r.price) : "",
      net: r.price ? money(r.net) : "",
    })),
  });

  d.y -= 8;
  d.box(MARGIN, d.y - 30, right - MARGIN, 30, SOFTISH);
  d.page.drawText(safe(`Sasia totale: ${qty(totalQty)}${rows[0]?.unit ? " " + rows[0].unit : ""}`), { x: MARGIN + 10, y: d.y - 12, size: 9, font: d.bold, color: INK });
  d.page.drawText(safe(`Vlera totale: ${totalValue ? `${money(totalValue)} LEK` : "—"}`), { x: MARGIN + 10, y: d.y - 24, size: 9, font: d.bold, color: BRAND });
  d.page.drawText(safe(`Artikuj: ${rows.length}`), { x: right - 90, y: d.y - 18, size: 8.4, font: d.reg, color: INK });
  d.y -= 44;

  if (note) {
    d.page.drawText(safe("Shënim:"), { x: MARGIN, y: d.y, size: 8.4, font: d.bold, color: INK });
    d.y -= 11;
    const used = d.text(note, { x: MARGIN, size: 8.4, maxWidth: right - MARGIN });
    d.y -= used;
  }

  // ---------------------------------------------------------------- nënshkrimet
  d.need(70);
  d.y = Math.min(d.y, MARGIN + 78);
  const slot = (right - MARGIN) / 3;
  ["Dorëzoi", "Mori", "Magazinieri"].forEach((label, i) => {
    const x = MARGIN + i * slot;
    d.page.drawLine({ start: { x: x + 6, y: d.y - 4 }, end: { x: x + slot - 20, y: d.y - 4 }, thickness: 0.7, color: INK });
    d.page.drawText(safe(label), { x: x + 6, y: d.y - 16, size: 7.6, font: d.reg, color: INK });
  });

  return d.pdf.save();
}
