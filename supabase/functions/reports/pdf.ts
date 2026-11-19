// Vizaton të njëjtën rrjetë qelizash në PDF A4 (me përsëritje të kokës në çdo faqe).
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import type { Cell, Report } from "./types.ts";

const PT_PER_CHAR = 5.2;      // 1 njësi gjerësie Excel në pikë PDF (afërsisht)
const ROW_PT = 15;            // lartësia bazë e rreshtit
// Helvetica përdor WinAnsi: shkronjat e tjera zëvendësohen që të mos prishet krijimi i PDF-së
const safe = (s: string) => s.replace(/[^ -~ -ÿ–—‘’“”•€]/g, "?");

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const t = line + word;
      if (line && font.widthOfTextAtSize(t.trimEnd(), size) > width) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t;
    }
    out.push(line.trimEnd());
  }
  return out;
}

const text = (c: Cell): string => c.v === null || c.v === "" ? "" : typeof c.v === "number" ? fmtNum(c.v, c.fmt) : c.v;
export function fmtNum(v: number, fmt?: string): string {
  if (fmt && /d{1,2}\/m{1,2}\/y{2,4}/i.test(fmt)) return String(v);
  const dec = fmt && fmt.includes(".") ? (fmt.split(".")[1].match(/0/g) || []).length : (Number.isInteger(v) ? 0 : 2);
  const raw = Math.abs(v).toFixed(dec).split(".");
  const intPart = raw[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");   // pika për mijëshe, presje për dhjetore
  return (v < 0 ? "-" : "") + intPart + (raw[1] ? "," + raw[1] : "");
}

export async function buildPdf(rep: Report): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regT = await pdf.embedFont(StandardFonts.TimesRoman), boldT = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const [PW, PH] = rep.orientation === "landscape" ? [841.89, 595.28] : [595.28, 841.89];
  const margin = 28, usableW = PW - 2 * margin, usableH = PH - 2 * margin - 14;
  const total = rep.widths.reduce((a, b) => a + b, 0);
  const scale = Math.min(1, usableW / (total * PT_PER_CHAR));
  const colW = rep.widths.map((w) => w * PT_PER_CHAR * scale);
  const x0 = rep.orientation === "landscape" || scale < 1 ? margin : margin;     // majtas, si te Excel
  const fscale = scale < 1 ? Math.max(0.6, scale) : 1;

  const mergeAt = new Map<string, [number, number, number, number]>();
  const covered = new Set<string>();
  rep.merges.forEach((m) => {
    mergeAt.set(`${m[0]},${m[1]}`, m);
    for (let r = m[0]; r <= m[2]; r++) for (let c = m[1]; c <= m[3]; c++) if (r !== m[0] || c !== m[1]) covered.add(`${r},${c}`);
  });

  // Lartësitë: e dhënë, ose sa i duhet tekstit të mbështjellë
  const heights = rep.rows.map((row, r) => {
    let h = (row.height ?? ROW_PT) * scale;
    row.cells.forEach((c, i) => {
      if (!c.wrap || covered.has(`${r},${i}`)) return;
      const m = mergeAt.get(`${r},${i}`);
      const w = colW.slice(i, (m ? m[3] : i) + 1).reduce((a, b) => a + b, 0) - 6;
      const size = (c.size ?? 11) * fscale;
      const f = c.font === "times" ? (c.bold ? boldT : regT) : (c.bold ? bold : reg);
      h = Math.max(h, wrapText(safe(text(c)), f, size, w).length * size * 1.2 + 6);
    });
    return h;
  });

  let page = pdf.addPage([PW, PH]), y = PH - margin;
  const headerIdx = rep.rows.map((r, i) => (r.header ? i : -1)).filter((i) => i >= 0);

  const drawRow = (r: number) => {
    const row = rep.rows[r], h = heights[r];
    let x = x0;
    row.cells.forEach((c, i) => {
      const w0 = colW[i];
      if (covered.has(`${r},${i}`)) { x += w0; return; }
      const m = mergeAt.get(`${r},${i}`);
      const w = m ? colW.slice(i, m[3] + 1).reduce((a, b) => a + b, 0) : w0;
      const hh = m ? heights.slice(r, m[2] + 1).reduce((a, b) => a + b, 0) : h;
      if (c.fill) page.drawRectangle({ x, y: y - hh, width: w, height: hh, color: hex(c.fill) });
      if (c.border) page.drawRectangle({ x, y: y - hh, width: w, height: hh, borderColor: rgb(0, 0, 0), borderWidth: 0.6 });
      const t = safe(text(c));
      if (t) {
        const size = (c.size ?? 11) * fscale;
        const f = c.font === "times" ? (c.bold ? boldT : regT) : (c.bold ? bold : reg);
        const lines = c.wrap ? wrapText(t, f, size, w - 6) : [t];
        const blockH = lines.length * size * 1.2;
        let ty = c.valign === "t" ? y - 3 - size : y - (hh - blockH) / 2 - size * 0.95;
        for (const ln of lines) {
          const tw = f.widthOfTextAtSize(ln, size);
          const al = c.align ?? (typeof c.v === "number" ? "r" : "l");
          const tx = al === "c" ? x + (w - tw) / 2 : al === "r" ? x + w - tw - 3 : x + 3;
          page.drawText(ln, { x: tx, y: ty, size, font: f, color: rgb(0, 0, 0) });
          ty -= size * 1.2;
        }
      }
      x += w0;
    });
    y -= h;
  };

  for (let r = 0; r < rep.rows.length; r++) {
    // një rresht i bashkuar vertikalisht nuk ndahet midis faqeve
    let need = heights[r];
    for (const m of mergeAt.values()) if (m[0] === r) need = heights.slice(r, m[2] + 1).reduce((a, b) => a + b, 0);
    if (y - need < margin + 14 && y < PH - margin - 1) {
      page = pdf.addPage([PW, PH]); y = PH - margin;
      if (!rep.rows[r].header) for (const hi of headerIdx) { if (hi < r) drawRow(hi); }
    }
    drawRow(r);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(safe(`Faqe ${i + 1}/${pages.length}`), { x: PW - margin - 50, y: margin - 12, size: 8, font: reg, color: rgb(0.3, 0.3, 0.3) });
  });
  return await pdf.save();
}
