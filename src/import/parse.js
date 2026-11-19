// Lexues skedarësh: CSV, XLSX (Excel i ri) dhe tabela HTML të ruajtura si «.xls».
// Punon në telefon (Hermes) pa asnjë modul vendas — vetëm JSZip.
import JSZip from "jszip";

// ---------------------------------------------------------------- ndihmës
const decodeXml = (t) =>
  String(t)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const textOf = (xml) => {
  if (!xml) return "";
  const parts = [];
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) parts.push(decodeXml(m[1]));
  return parts.join("");
};

const colIndex = (ref) => {
  const letters = String(ref || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return Math.max(0, n - 1);
};

export const isEmptyRow = (row) => !row || row.every((c) => c === null || c === undefined || String(c).trim() === "");

// ---------------------------------------------------------------- CSV
export function detectDelimiter(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.trim() !== "") || "";
  const counts = [[",", 0], [";", 0], ["\t", 0], ["|", 0]];
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ) {
      const hit = counts.find(([d]) => d === ch);
      if (hit) hit[1]++;
    }
  }
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(text, delim) {
  let src = String(text || "");
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const d = delim || detectDelimiter(src);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === d) { row.push(cell); cell = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r, i) => i < rows.length && !(r.length === 1 && r[0] === ""));
}

// ---------------------------------------------------------------- HTML («.xls» e eksportuar nga sisteme)
export function parseHtmlTable(html) {
  const src = String(html || "");
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(src))) {
    const cells = [];
    const cellRe = /<t([dh])\b([^>]*)>([\s\S]*?)<\/t\1>/gi;
    let cm;
    while ((cm = cellRe.exec(rm[1]))) {
      const attrs = cm[2] || "";
      const span = Number((attrs.match(/colspan\s*=\s*"?(\d+)/i) || [])[1] || 1);
      const raw = cm[3]
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(decodeXml(raw));
      for (let k = 1; k < span; k++) cells.push("");
    }
    rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------- XLSX
const fileText = async (zip, path) => {
  const f = zip.file(path);
  return f ? f.async("string") : null;
};

async function sharedStrings(zip) {
  const xml = await fileText(zip, "xl/sharedStrings.xml");
  if (!xml) return [];
  const out = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) out.push(textOf(m[1]));
  return out;
}

// «worksheets/sheet1.xml» në rels është relative me «xl/» — pra rruga e vërtetë është xl/worksheets/...
const resolvePart = (t) => {
  const p = String(t).replace(/^\/+/, "");
  if (p.startsWith("xl/")) return p;
  if (p.startsWith("/xl/")) return p.slice(1);
  return `xl/${p.replace(/^(\.\.\/)+/, "")}`;
};

async function sheetList(zip) {
  const wb = await fileText(zip, "xl/workbook.xml");
  const rels = await fileText(zip, "xl/_rels/workbook.xml.rels");
  const map = new Map();
  if (rels) {
    const re = /<Relationship\b([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(rels))) {
      const id = (m[1].match(/Id="([^"]+)"/) || [])[1];
      const target = (m[1].match(/Target="([^"]+)"/) || [])[1];
      if (id && target) map.set(id, resolvePart(target));
    }
  }
  const sheets = [];
  if (wb) {
    const re = /<sheet\b([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(wb))) {
      const name = decodeXml((m[1].match(/name="([^"]*)"/) || [])[1] || "");
      const rid = (m[1].match(/r:id="([^"]+)"/) || [])[1];
      const path = rid && map.get(rid);
      if (path && zip.file(path)) sheets.push({ name: name || path, path });
    }
  }
  if (!sheets.length) {
    Object.keys(zip.files)
      .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")))
      .forEach((p, i) => sheets.push({ name: `Fleta ${i + 1}`, path: p }));
  }
  return sheets;
}

function parseSheetXml(xml, shared) {
  const rows = [];
  const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const body = rm[2] || "";
    const cells = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(body))) {
      const attrs = cm[1] || "";
      const inner = cm[2] || "";
      const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1];
      const type = (attrs.match(/t="([^"]+)"/) || [])[1] || "";
      const v = (inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
      let val = "";
      if (type === "s") val = shared[Number(v)] ?? "";
      else if (type === "inlineStr") val = textOf(inner);
      else if (type === "str") val = decodeXml(v ?? "");
      else if (type === "b") val = v === "1" ? "PO" : v === "0" ? "JO" : "";
      else if (type === "e") val = "";
      else if (type === "d") val = decodeXml(v ?? "");
      else if (v !== undefined) {
        const n = Number(v);
        val = Number.isFinite(n) ? n : decodeXml(v);
      }
      const idx = ref ? colIndex(ref) : cells.length;
      while (cells.length < idx) cells.push("");
      cells[idx] = val;
    }
    rows.push(cells);
  }
  return rows;
}

export async function parseXlsx(input) {
  const zip = await JSZip.loadAsync(input, { base64: typeof input === "string" });
  const shared = await sharedStrings(zip);
  const sheets = await sheetList(zip);
  const out = [];
  for (const sh of sheets) {
    const xml = await fileText(zip, sh.path);
    if (!xml) continue;
    out.push({ name: sh.name, rows: parseSheetXml(xml, shared).filter((r) => !isEmptyRow(r)) });
  }
  return out;
}

// ---------------------------------------------------------------- hyrja kryesore
/**
 * Lexon skedarin dhe kthen [{ name, rows }].
 * input: { base64, name }
 */
export async function readWorkbook({ base64, name = "" }) {
  const lower = String(name).toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv")) {
    const text = base64ToText(base64);
    const rows = parseCsv(text);
    return { kind: "csv", sheets: [{ name: "CSV", rows: rows.filter((r) => !isEmptyRow(r)) }] };
  }
  const head = base64.slice(0, 240);
  const asBytes = atobSafe(base64.slice(0, 8));
  if (asBytes.startsWith("PK")) {
    const sheets = await parseXlsx(base64);
    return { kind: "xlsx", sheets: sheets.filter((s) => s.rows.length) };
  }
  if (asBytes.startsWith("\xd0\xcf\x11\xe0")) {
    throw new Error("Ky është skedar Excel i vjetër (.xls). Hapeni në Excel dhe «Ruaj si» → «Excel Workbook (.xlsx)» ose CSV.");
  }
  const text = base64ToText(base64);
  if (/<table/i.test(text) || /<html/i.test(text)) {
    return { kind: "html", sheets: [{ name: "Tabela", rows: parseHtmlTable(text).filter((r) => !isEmptyRow(r)) }] };
  }
  if (head.includes(",") || head.includes(";")) {
    return { kind: "csv", sheets: [{ name: "CSV", rows: parseCsv(text).filter((r) => !isEmptyRow(r)) }] };
  }
  throw new Error("Formati nuk njihet. Përdorni .xlsx ose .csv.");
}

// ---------------------------------------------------------------- base64 → tekst (UTF-8, pa TextDecoder)
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ToBytes(b64) {
  const clean = String(b64).replace(/[^A-Za-z0-9+/=]/g, "");
  const out = [];
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "=") break;
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return out;
}

const atobSafe = (b64) => {
  try { return String.fromCharCode.apply(null, base64ToBytes(b64)); } catch (_e) { return ""; }
};

export function bytesToText(bytes) {
  // UTF-8 manual: Hermes nuk ka TextDecoder
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) { out += String.fromCharCode(b); continue; }
    if (b < 0xe0 && i < bytes.length) { out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f)); continue; }
    if (b < 0xf0 && i + 1 < bytes.length) {
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i] & 0x3f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
      continue;
    }
    if (i + 2 < bytes.length) {
      const cp = ((b & 0x07) << 18) | ((bytes[i] & 0x3f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      out += String.fromCodePoint(cp);
      i += 3;
      continue;
    }
    out += "\ufffd";
  }
  return out;
}

export function base64ToText(b64) {
  const bytes = base64ToBytes(b64);
  return bytesToText(bytes);
}

// ---------------------------------------------------------------- titujt dhe rreshtat
/** Gjen rreshtin e titujve: i pari me të paktën 2 qeliza jo numerike. */
export function guessHeaderRow(rows, limit = 8) {
  for (let i = 0; i < Math.min(rows.length, limit); i++) {
    const r = rows[i] || [];
    const filled = r.filter((c) => String(c ?? "").trim() !== "");
    if (filled.length < 2) continue;
    const textual = filled.filter((c) => !/^-?\d+([.,]\d+)?$/.test(String(c).trim()));
    if (textual.length >= Math.ceil(filled.length * 0.6)) return i;
  }
  return 0;
}

/** Titujt unikë nga një rresht (kolonat pa titull hidhen). */
export function headerOf(row) {
  const seen = new Map();
  return (row || []).map((c, i) => {
    const base = String(c ?? "").replace(/\s+/g, " ").trim();
    if (!base) return "";
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

export const normHeader = (t) =>
  String(t ?? "")
    .toLowerCase()
    .replace(/[ç]/g, "c").replace(/[ë]/g, "e")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
