// Përcaktimet e raporteve: formatet ndjekin tabelat e Excel-it të BioBes / W01.
import { Cell, COLORS, Report, Row } from "./types.ts";

// ---- ndihmës ----
class Grid {
  rows: Row[] = [];
  merges: Report["merges"] = [];
  constructor(private cols: number) {}
  row(height?: number, header = false): number {
    this.rows.push({ height, header, cells: Array.from({ length: this.cols }, () => ({ v: null } as Cell)) });
    return this.rows.length - 1;
  }
  set(r: number, c: number, cell: Cell) { this.rows[r].cells[c] = cell; }
  merge(r1: number, c1: number, r2: number, c2: number, cell: Cell) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.rows[r].cells[c] = { ...cell, v: r === r1 && c === c1 ? cell.v : null };
    this.merges.push([r1, c1, r2, c2]);
  }
  blank(height?: number) { return this.row(height); }
}
const pad2 = (n: number) => String(n).padStart(2, "0");
export const dShort = (iso?: string | null) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "";
export const dFull = (iso?: string | null) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
export const dDot = (iso?: string | null) => iso ? `${+iso.slice(8, 10)}.${+iso.slice(5, 7)}.${iso.slice(0, 4)}` : "";
const num = (v: unknown) => Number(v ?? 0) || 0;
const NUM = "#,##0.##";
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "raport";

// ---- 1. Përmbledhja e loteve (si «PERMBLEDHJE 2026») ----
export interface SummaryRow {
  lot_code: string; product: string; d_from?: string | null; d_to?: string | null; fresh: number; dry: number;
  stock: number; delivered: number; delivered_date?: string | null; exported: number; export_date?: string | null;
  export_to?: string | null; biobes_stock: number;
}
export function summaryReport(company: string, year: number, rows: SummaryRow[]): Report {
  const widths = [5, 23, 25, 24, 19, 19, 21, 18, 22, 14, 16];
  const g = new Grid(11);
  const t1 = g.row(31.5), t2 = g.row(31.5);
  g.merge(t1, 0, t2, 10, { v: `${company.toUpperCase()}  VITI ${year}`, bold: true, size: 24, align: "c", valign: "m", fill: COLORS.green });
  g.blank(8);
  const h = g.row(66, true);
  ["Nr.", "PRODUKTI", "KODI", "PERIUDHA E MBLEDHJES", "SASIA E MBLEDHUR E NJOME", "SASIA E MBLEDHUR E THATE", "GJENDJE E GRUMBULLUESIT",
    "DATA DOREZIMIT NE BIOBES", "DT EXPORTIT + SASIA E EXPORTUAR", "GJENDJE BIOBES", "KOMPANIA"].forEach((v, i) =>
    g.set(h, i, { v, bold: true, size: 12, align: "c", valign: "m", wrap: true, border: true, fill: COLORS.green }));
  const body = (v: string | number | null, extra: Partial<Cell> = {}): Cell => ({ v, border: true, valign: "m", wrap: true, fmt: typeof v === "number" ? NUM : undefined, ...extra });
  rows.forEach((r, i) => {
    const row = g.row(27.75);
    const period = r.d_from ? `${dShort(r.d_from)}-${dShort(r.d_to)}` : "";
    const exp = r.exported ? `${dFull(r.export_date)}  (${num(r.exported)} kg)` : "";
    [body(i + 1, { align: "c" }), body(r.product.toUpperCase()), body(r.lot_code), body(period), body(num(r.fresh)), body(num(r.dry)), body(num(r.stock)),
      body(dFull(r.delivered_date)), body(exp), body(num(r.biobes_stock)), body(r.export_to ?? "")].forEach((c, k) => g.set(row, k, c));
  });
  const tot = g.row(27.75);
  g.merge(tot, 0, tot, 3, body("GJITHSEJ", { bold: true, align: "r", fill: COLORS.grey }));
  const sums = [sum(rows, "fresh"), sum(rows, "dry"), sum(rows, "stock")];
  sums.forEach((v, k) => g.set(tot, 4 + k, body(v, { bold: true, fill: COLORS.grey })));
  g.set(tot, 7, body(null, { fill: COLORS.grey })); g.set(tot, 8, body(null, { fill: COLORS.grey }));
  g.set(tot, 9, body(sum(rows, "biobes_stock"), { bold: true, fill: COLORS.grey })); g.set(tot, 10, body(null, { fill: COLORS.grey }));
  return { name: `Permbledhje_${year}`, sheet: `PERMBLEDHJE ${year}`, orientation: "landscape", widths, rows: g.rows, merges: g.merges };
}
const sum = (rows: any[], k: string) => rows.reduce((a, r) => a + num(r[k]), 0);

// ---- 2. Fleta e një loti (si «RR.Qumeshtore_W01F.1a-26») ----
export interface PurchaseRow { date: string; farmer_name: string; zone_code: string; qty_fresh: number; qty_dry: number; product_name: string; price: number; amount: number }
export interface MoveRow { date: string; kind: string; qty_out: number; qty_in: number }
export function lotSheetReport(o: { latin?: string; product: string; lot: string; year: number; purchases: PurchaseRow[]; moves: MoveRow[] }): Report {
  const widths = [14, 13, 13, 12.6, 11, 11, 21.6, 14, 9, 11, 13];
  const times = (c: Cell): Cell => ({ font: "times", size: 12, ...c });
  const g = new Grid(11);
  const r0 = g.row(18.75);
  g.merge(r0, 0, r0, 10, { v: o.latin ?? "", bold: true, size: 14 });
  g.blank(8);
  const r2 = g.row(22);
  g.merge(r2, 0, r2, 5, { v: `${o.product} ${o.lot}`, bold: true, size: 14, font: "times", align: "c", valign: "m" });
  g.merge(r2, 6, r2, 8, { v: `Viti ${o.year}`, bold: true, size: 14, font: "times", align: "c", valign: "m" });
  g.blank(8);
  const h = g.row(61.5, true);
  g.set(h, 0, times({ v: "Data", bold: true, align: "c", valign: "m", border: true }));
  g.merge(h, 1, h, 2, times({ v: "Emër Mbiemër", bold: true, align: "c", valign: "m", border: true }));
  ["Kodi", "Sasia Njome (Kg)", "Sasia Thare (Kg)", "Produkti", "Data Dorezimit Biobes", "Sasia (Kg)", "Cmimi", "Shuma"].forEach((v, i) =>
    g.set(h, 3 + i, times({ v, bold: true, align: "c", valign: "m", wrap: true, border: true })));
  const deliveries = o.moves.filter((m) => m.kind === "dorezim");
  const n = Math.max(o.purchases.length, deliveries.length);
  for (let i = 0; i < n; i++) {
    const r = g.row(18.75), p = o.purchases[i], d = deliveries[i];
    const c = (v: string | number | null, x: Partial<Cell> = {}) => times({ v, border: true, valign: "m", fmt: typeof v === "number" ? NUM : undefined, ...x });
    g.set(r, 0, c(p ? dFull(p.date) : ""));
    g.merge(r, 1, r, 2, c(p ? p.farmer_name : ""));
    g.set(r, 3, c(p ? p.zone_code : "")); g.set(r, 4, c(p ? num(p.qty_fresh) : null)); g.set(r, 5, c(p ? num(p.qty_dry) : null));
    g.set(r, 6, c(p ? p.product_name : "")); g.set(r, 7, c(d ? dFull(d.date) : "")); g.set(r, 8, c(d ? num(d.qty_out) : null));
    g.set(r, 9, c(p ? num(p.price) : null)); g.set(r, 10, c(p ? num(p.amount) : null));
  }
  const t = g.row(20);
  const tc = (v: string | number | null) => times({ v, bold: true, border: true, valign: "m", fill: COLORS.grey, fmt: typeof v === "number" ? NUM : undefined });
  g.merge(t, 0, t, 3, tc("GJITHSEJ"));
  g.set(t, 4, tc(sum(o.purchases, "qty_fresh"))); g.set(t, 5, tc(sum(o.purchases, "qty_dry"))); g.set(t, 6, tc(null));
  g.set(t, 7, tc(null)); g.set(t, 8, tc(deliveries.reduce((a, d) => a + num(d.qty_out), 0))); g.set(t, 9, tc(null)); g.set(t, 10, tc(sum(o.purchases, "amount")));
  return { name: `Fleta_${safeName(o.lot)}`, sheet: o.lot, orientation: "portrait", widths, rows: g.rows, merges: g.merges };
}

// ---- 3. Përmbledhja e një fermeri (si «JACE TERPOLLARI») ----
export interface FarmerLot { lot_code: string; zone_code: string; product_name: string; d_from: string; d_to: string; qty_fresh: number; qty_dry: number }
export function farmerReport(farmer: string, rows: FarmerLot[]): Report {
  const widths = [36, 30.4, 17.1, 15.7, 14.6];
  const g = new Grid(5);
  const t = g.row(21);
  g.merge(t, 0, t, 4, { v: `PERMBLEDHJA  ${farmer.toUpperCase()}`, bold: true, size: 16 });
  const h = g.row(32.25, true);
  ["PERIUDHA", "PRODUKTI", "Kodi", "Sasia Njome (Kg)", "Sasia Thare (Kg)"].forEach((v, i) =>
    g.set(h, i, { v, bold: true, size: 12, align: "c", valign: "m", wrap: true, border: true }));
  const c = (v: string | number | null, x: Partial<Cell> = {}): Cell => ({ v, size: 12, border: true, valign: "m", fmt: typeof v === "number" ? NUM : undefined, ...x });
  for (const r of rows) {
    const row = g.row(16.5);
    [c(`${dDot(r.d_from)} - ${dDot(r.d_to)}`), c(r.product_name.toUpperCase()), c(r.zone_code), c(num(r.qty_fresh)), c(num(r.qty_dry))].forEach((x, i) => g.set(row, i, x));
  }
  const tr = g.row(18);
  g.merge(tr, 0, tr, 2, c("GJITHSEJ", { bold: true, fill: COLORS.grey }));
  g.set(tr, 3, c(sum(rows, "qty_fresh"), { bold: true, fill: COLORS.grey })); g.set(tr, 4, c(sum(rows, "qty_dry"), { bold: true, fill: COLORS.grey }));
  return { name: `Fermeri_${safeName(farmer)}`, sheet: farmer, orientation: "portrait", widths, rows: g.rows, merges: g.merges };
}

// ---- 5. Kartela e gjurmueshmërisë (Faza 5): nga parcela te klienti, për një lot ----
export interface TracePurchase { date: string; farmer_name: string; zone_code: string; qty_fresh: number; qty_dry: number; amount: number }
export interface TraceMove { date: string; kind: string; qty_in: number; qty_out: number; counterparty: string }
export interface TraceSample { date: string; customer: string; code: string; tracking: string; result: string }
export interface TraceInput { date: string; category: string; description: string; amount: number }
export function traceReport(o: { company: string; product: string; lot: string; year: number; purchases: TracePurchase[]; moves: TraceMove[]; samples: TraceSample[]; inputs: TraceInput[] }): Report {
  const widths = [14, 20, 18, 15, 17, 16];
  const g = new Grid(6);
  const t1 = g.row(30), t2 = g.row(30);
  g.merge(t1, 0, t2, 5, { v: "KARTELA E GJURMUESHMËRISË", bold: true, size: 19, align: "c", valign: "m", fill: COLORS.green });
  const sub = g.row(22);
  g.merge(sub, 0, sub, 5, { v: `${o.company}  ·  ${o.product}  ·  Loti ${o.lot}  ·  Viti ${o.year}`, size: 11, align: "c", valign: "m" });
  g.blank(8);

  const c = (v: string | number | null | undefined, x: Partial<Cell> = {}): Cell => {
    const vv = v ?? "";
    return { v: vv, size: 11, border: true, valign: "m", wrap: true, fmt: typeof vv === "number" ? NUM : undefined, ...x };
  };
  // Rrjetë me 6 kolona; çdo tabelë shpërndan kolonat sipas përmbajtjes (bashkime).
  const table = (title: string, heads: [string, number][], body: Cell[][]) => {
    const h = g.row(24);
    g.merge(h, 0, h, 5, { v: title, bold: true, size: 12, fill: COLORS.grey, valign: "m" });
    const cols: [number, number][] = [];
    let x = 0;
    for (const [, span] of heads) { cols.push([x, x + span - 1]); x += span; }
    const hr = g.row(28, true);
    heads.forEach(([label], i) => g.merge(hr, cols[i][0], hr, cols[i][1],
      { v: label, bold: true, size: 10, align: "c", valign: "m", wrap: true, border: true, fill: COLORS.green }));
    for (const row of body) {
      const r = g.row(20);
      row.forEach((cell, i) => {
        const [a, b] = cols[i] ?? [5, 5];
        if (b > a) g.merge(r, a, r, b, cell); else g.set(r, a, cell);
      });
    }
  };

  table("1. VJELJA — fermerët dhe zonat", [["Data", 1], ["Fermeri", 1], ["Zona", 1], ["Njome (kg)", 1], ["Thatë (kg)", 1], ["Shuma (lekë)", 1]], [
    ...o.purchases.map((p) => [c(dFull(p.date)), c(p.farmer_name), c(p.zone_code), c(num(p.qty_fresh)), c(num(p.qty_dry)), c(num(p.amount))]),
    [c("Gjithsej", { bold: true, fill: COLORS.grey }), c("", { fill: COLORS.grey }), c("", { fill: COLORS.grey }),
      c(sum(o.purchases, "qty_fresh"), { bold: true, fill: COLORS.grey }), c(sum(o.purchases, "qty_dry"), { bold: true, fill: COLORS.grey }),
      c(sum(o.purchases, "amount"), { bold: true, fill: COLORS.grey })],
  ]);

  table("2. MAGAZINA — dorëzime dhe eksport", [["Data", 1], ["Lloji", 1], ["Hyrje (kg)", 1], ["Dalje (kg)", 1], ["Palë / ku shkoi", 2]],
    o.moves.length
      ? o.moves.map((m) => [c(dFull(m.date)), c(m.kind), c(num(m.qty_in)), c(num(m.qty_out)), c(m.counterparty)])
      : [[c("Asnjë lëvizje magazinë për këtë lot"), c(""), c(""), c(""), c("")]]);

  table("3. MOSTRAT — protokolli i analizave", [["Data", 1], ["Klienti", 1], ["Kodi i mostrës", 1], ["Tracking", 1], ["Rezultati", 2]],
    o.samples.length
      ? o.samples.map((s) => [c(dFull(s.date)), c(s.customer), c(s.code, { size: 9 }), c(s.tracking), c(s.result)])
      : [[c("Asnjë mostër e regjistruar", { valign: "m" }), c(""), c(""), c(""), c("")]]);

  if (o.inputs.length) {
    table("4. INPUTET — shpenzime parcele dhe trajtime", [["Data", 1], ["Lloji", 1], ["Përshkrimi", 2], ["Shuma (lekë)", 2]],
      o.inputs.map((i) => [c(dFull(i.date)), c(i.category), c(i.description), c(num(i.amount))]));
  }
  const tot = g.row(24);
  g.merge(tot, 0, tot, 5, { v: `Gjurmueshmëri e plotë: ${o.purchases.length} vjelje · ${o.moves.length} lëvizje magazine · ${o.samples.length} mostra · ${o.inputs.length} inpute`, size: 10, align: "c", valign: "m" });
  return { name: `Kartela_${safeName(o.lot)}`, sheet: o.lot, orientation: "portrait", widths, rows: g.rows, merges: g.merges };
}

// ---- 4. Lista e vjelësve (si «LISTA E VJELESVE FAIR WILD») ----
export interface FarmerRow { group_name: string; zone_code: string; first_name: string; last_name: string; address: string; family_size: number | null; id_number: string }
export function growersReport(year: number, farmers: FarmerRow[]): Report {
  const widths = [13, 11.3, 6.4, 16.1, 15.6, 17.7, 13, 18.9];
  const g = new Grid(8);
  const t = g.row(46.5);
  g.merge(t, 0, t, 7, { v: `LISTA E VJELESVE  ${year}`, bold: true, size: 28, valign: "m" });
  const h = g.row(28.5, true);
  ["GRUPET", "ZONAT", "Nr.", "EMRI", "MBIEMRI", "ADRESA", "NR PERSONAVE NE FAMILJE", "ID."].forEach((v, i) =>
    g.set(h, i, { v, bold: true, align: "c", valign: "m", wrap: true, border: true, fill: COLORS.yellow }));
  const sorted = [...farmers].sort((a, b) => (a.group_name + a.zone_code + a.last_name).localeCompare(b.group_name + b.zone_code + b.last_name));
  const first = g.rows.length;
  sorted.forEach((f, i) => {
    const r = g.row(18.75);
    const c = (v: string | number | null, x: Partial<Cell> = {}): Cell => ({ v, size: 12, border: true, valign: "m", ...x });
    g.set(r, 0, c("", { fill: COLORS.grey, align: "c", bold: true })); g.set(r, 1, c(f.zone_code, { bold: true, size: 14, align: "c", fill: COLORS.grey }));
    g.set(r, 2, c(i + 1, { align: "c" })); g.set(r, 3, c(f.first_name)); g.set(r, 4, c(f.last_name)); g.set(r, 5, c(f.address));
    g.set(r, 6, c(f.family_size, { align: "c" })); g.set(r, 7, c(f.id_number));
  });
  // grupi bashkohet vertikalisht mbi rreshtat e njëpasnjëshëm me të njëjtin grup
  let s = 0;
  while (s < sorted.length) {
    let e = s;
    while (e + 1 < sorted.length && sorted[e + 1].group_name === sorted[s].group_name) e++;
    const cell: Cell = { v: sorted[s].group_name, bold: true, align: "c", valign: "m", border: true, fill: COLORS.grey, wrap: true };
    if (e > s) g.merge(first + s, 0, first + e, 0, cell); else g.set(first + s, 0, cell);
    s = e + 1;
  }
  return { name: `Lista_vjelesve_${year}`, sheet: `VJELESIT ${year}`, orientation: "landscape", widths, rows: g.rows, merges: g.merges };
}
