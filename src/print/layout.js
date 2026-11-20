// Bazat e vizatimit të dokumenteve A4 (fatura, fletë magazinë): fonte, numra shqip, tabela me faqe.
import { StandardFonts, rgb } from "pdf-lib";

export const A4 = { w: 595.28, h: 841.89 };
export const MARGIN = 38;
export const INK = rgb(0.06, 0.1, 0.07);
export const SUB = rgb(0.33, 0.4, 0.35);
export const LINE = rgb(0.84, 0.87, 0.82);
export const BRAND = rgb(0.078, 0.325, 0.176);
export const SOFT = rgb(0.94, 0.96, 0.93);

// Helvetica punon me WinAnsi: zëvendësojmë çdo shenjë jashtë saj që PDF-ja të mos dështojë.
export const safe = (v) => String(v ?? "").replace(/[^ -~ -ÿ–—‘’“”•€]/g, "?");

/** Numra shqip: 1250.5 → «1.250,50» */
export function money(v, dec = 2) {
  const n = Number(v || 0);
  const raw = Math.abs(n).toFixed(dec);
  const [i, f] = raw.split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + int + (f ? "," + f : "");
}

export const qty = (v) => money(v, Number.isInteger(Number(v)) ? 0 : 2);

/** 2026-11-20 → 20.11.2026 */
export const dAlb = (iso) => {
  const t = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}`;
};

export async function newDocument({ landscape = false } = {}) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = landscape ? { w: A4.h, h: A4.w } : { w: A4.w, h: A4.h };
  const doc = {
    pdf, reg, bold,
    w: size.w, h: size.h,
    page: null,
    y: 0,
    footer: "",
    pageNo: 0,
    addPage() {
      doc.page = pdf.addPage([size.w, size.h]);
      doc.pageNo++;
      doc.y = size.h - MARGIN;
      if (doc.footer) {
        doc.page.drawText(safe(doc.footer), { x: MARGIN, y: 22, size: 7.5, font: reg, color: SUB });
        doc.page.drawText(safe(`Faqe ${doc.pageNo}`), { x: size.w - MARGIN - 34, y: 22, size: 7.5, font: reg, color: SUB });
      }
      return doc.page;
    },
    need(h) { if (doc.y - h < MARGIN + 18) doc.addPage(); },
    text(str, opts = {}) {
      const { x = MARGIN, size: fs = 9.5, font = reg, color2 = INK, maxWidth } = opts;
      const body = maxWidth ? doc.wrap(str, font, fs, maxWidth) : [String(str ?? "")];
      body.forEach((ln, i) => {
        doc.page.drawText(safe(ln), { x, y: doc.y - i * (fs + 3), size: fs, font, color: color2 });
      });
      return body.length * (fs + 3);
    },
    wrap(str, font, fs, width) {
      const out = [];
      String(str ?? "").split(/\r?\n/).forEach((para) => {
        let line = "";
        para.split(/\s+/).forEach((word) => {
          const t = line ? `${line} ${word}` : word;
          if (line && font.widthOfTextAtSize(safe(t), fs) > width) { out.push(line); line = word; }
          else line = t;
        });
        out.push(line);
      });
      return out;
    },
    hr(y = doc.y, color2 = LINE, thickness = 0.8) {
      doc.page.drawLine({ start: { x: MARGIN, y }, end: { x: doc.w - MARGIN, y }, thickness, color: color2 });
    },
    box(x, y, w, h, color2 = SOFT) { doc.page.drawRectangle({ x, y, width: w, height: h, color: color2 }); },
    right(str, xRight, opts = {}) {
      const fs = opts.size ?? 9.5, font = opts.font ?? reg;
      doc.page.drawText(safe(str), { x: xRight - font.widthOfTextAtSize(safe(str), fs), y: opts.y ?? doc.y, size: fs, font, color: opts.color2 ?? INK });
    },
    center(str, opts = {}) {
      const fs = opts.size ?? 9.5, font = opts.font ?? reg;
      doc.page.drawText(safe(str), { x: (doc.w - font.widthOfTextAtSize(safe(str), fs)) / 2, y: opts.y ?? doc.y, size: fs, font, color: opts.color2 ?? INK });
    },
    /**
     * Tabelë me kolona: [{ key, label, width, align }].
     * Rreshtat: objekt me çelësat e kolonave; `bold: true` për rreshtin e fundit.
     */
    table({ columns, rows, fontSize = 8.6, headerBg = BRAND, headerColor = rgb(1, 1, 1) }) {
      const totalW = columns.reduce((a, c) => a + c.width, 0);
      const scale = (doc.w - 2 * MARGIN) / totalW;
      const xs = [];
      let x = MARGIN;
      columns.forEach((c) => { xs.push(x); x += c.width * scale; });

      const drawHead = () => {
        const h = 18;
        doc.need(h + 4);
        doc.box(MARGIN, doc.y - h + 4, doc.w - 2 * MARGIN, h, headerBg);
        columns.forEach((c, i) => {
          const w = c.width * scale;
          const label = c.label;
          const tx = c.align === "right" ? xs[i] + w - 4 - doc.bold.widthOfTextAtSize(safe(label), fontSize) : xs[i] + 4;
          doc.page.drawText(safe(label), { x: tx, y: doc.y - h + 9, size: fontSize, font: doc.bold, color: headerColor });
        });
        doc.y -= h + 4;
      };

      drawHead();
      rows.forEach((row) => {
        const cells = columns.map((c, i) => {
          const w = c.width * scale;
          const font = row.bold ? doc.bold : doc.reg;
          return doc.wrap(row[c.key] ?? "", font, fontSize, w - 8);
        });
        const h = Math.max(...cells.map((c) => c.length)) * (fontSize + 2.6) + 6;
        if (doc.y - h < MARGIN + 18) { doc.addPage(); drawHead(); }
        cells.forEach((lines, i) => {
          const w = columns[i].width * scale;
          lines.forEach((ln, li) => {
            const font = row.bold ? doc.bold : doc.reg;
            const tx = columns[i].align === "right" ? xs[i] + w - 4 - font.widthOfTextAtSize(safe(ln), fontSize) : xs[i] + 4;
            doc.page.drawText(safe(ln), { x: tx, y: doc.y - 4 - li * (fontSize + 2.6), size: fontSize, font, color: INK });
          });
        });
        doc.y -= h;
        doc.hr(doc.y, LINE, 0.4);
      });
      return doc.y;
    },
    /** Kuti me etiketë/vlerë në dy kolona (shitësi / blerësi). */
    partyBlock({ title, name, lines, x, y, width }) {
      doc.box(x, y - 62, width, 66, SOFT);
      doc.page.drawText(safe(title), { x: x + 8, y: y - 14, size: 7.6, font: doc.bold, color: SUB });
      doc.page.drawText(safe(name || "—"), { x: x + 8, y: y - 27, size: 10, font: doc.bold, color: INK });
      lines.filter(Boolean).slice(0, 3).forEach((ln, i) => {
        doc.page.drawText(safe(ln), { x: x + 8, y: y - 40 - i * 11, size: 8, font: doc.reg, color: INK });
      });
    },
  };
  return doc;
}
