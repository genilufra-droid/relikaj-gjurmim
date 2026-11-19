// Shkruesi i vogël XLSX (pa varësi të rënda): stile, bashkime qelizash, gjerësi, orientim A4 dhe përshtatje në gjerësi.
import JSZip from "jszip";
import type { Cell, Report } from "./types.ts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // karakteret e kontrollit nuk lejohen në XML
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

export function colName(i: number): string {
  let n = i + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

class Registry<T> {
  items: T[] = [];
  private keys = new Map<string, number>();
  constructor(private offset = 0) {}
  id(item: T): number {
    const k = JSON.stringify(item);
    let i = this.keys.get(k);
    if (i === undefined) { i = this.items.length; this.items.push(item); this.keys.set(k, i); }
    return i + this.offset;
  }
}

export async function buildXlsx(rep: Report): Promise<Uint8Array> {
  const fonts = new Registry<{ n: string; sz: number; b: boolean; i: boolean }>();
  const fills = new Registry<string>(2);          // 0 = asnjë, 1 = gray125 (rezervuar nga Excel)
  const numFmts = new Registry<string>(164);
  const xfs = new Registry<{ f: number; fi: number; b: number; nf: number; h: string; v: string; w: boolean }>();
  fonts.id({ n: "Calibri", sz: 11, b: false, i: false });
  xfs.id({ f: 0, fi: 0, b: 0, nf: 0, h: "", v: "", w: false });

  const styleOf = (c: Cell): number => {
    const f = fonts.id({ n: c.font === "times" ? "Times New Roman" : "Calibri", sz: c.size ?? 11, b: !!c.bold, i: !!c.italic });
    const fi = c.fill ? fills.id(c.fill) : 0;
    const nf = c.fmt ? numFmts.id(c.fmt) : 0;
    return xfs.id({ f, fi, b: c.border ? 1 : 0, nf, h: { l: "left", c: "center", r: "right" }[c.align ?? "l"], v: c.valign === "t" ? "top" : "center", w: !!c.wrap });
  };

  let sheetRows = "";
  rep.rows.forEach((row, r) => {
    let cells = "";
    row.cells.forEach((c, i) => {
      const ref = colName(i) + (r + 1), s = styleOf(c);
      if (c.v === null || c.v === "") cells += `<c r="${ref}" s="${s}"/>`;
      else if (typeof c.v === "number") cells += `<c r="${ref}" s="${s}"><v>${c.v}</v></c>`;
      else cells += `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    });
    const ht = row.height ? ` ht="${row.height}" customHeight="1"` : "";
    sheetRows += `<row r="${r + 1}"${ht}>${cells}</row>`;
  });

  const cols = rep.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const merges = rep.merges.length
    ? `<mergeCells count="${rep.merges.length}">${rep.merges.map(([r1, c1, r2, c2]) => `<mergeCell ref="${colName(c1)}${r1 + 1}:${colName(c2)}${r2 + 1}"/>`).join("")}</mergeCells>`
    : "";
  const lastRef = colName(Math.max(0, rep.widths.length - 1)) + rep.rows.length;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${sheetRows}</sheetData>${merges}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${rep.orientation}" fitToWidth="1" fitToHeight="0"/></worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${
    numFmts.items.length ? `<numFmts count="${numFmts.items.length}">${numFmts.items.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>` : ""
  }<fonts count="${fonts.items.length}">${fonts.items.map((f) => `<font>${f.b ? "<b/>" : ""}${f.i ? "<i/>" : ""}<sz val="${f.sz}"/><name val="${f.n}"/></font>`).join("")}</fonts><fills count="${fills.items.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${
    fills.items.map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`).join("")
  }</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.items.length}">${
    xfs.items.map((x) => `<xf numFmtId="${x.nf}" fontId="${x.f}" fillId="${x.fi}" borderId="${x.b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${x.h || "general"}" vertical="${x.v || "bottom"}"${x.w ? ' wrapText="1"' : ""}/></xf>`).join("")
  }</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(rep.sheet.slice(0, 31).replace(/[\\/?*[\]:]/g, " "))}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("xl/styles.xml", styles);
  zip.file("xl/worksheets/sheet1.xml", sheet);
  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
