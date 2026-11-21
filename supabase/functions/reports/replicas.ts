// Kopje 1:1 të formateve Excel të BioBes (shkronja, ngjyra, korniza, gjerësi, rreshta të bashkuar, format numrash, letra A3).
// Vetëm shtesë: nuk ndryshon asnjë raport ekzistues.
import type { Cell, Report, Row } from "./types.ts";

const ACC = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';
const blank = (sides?: string): Cell => ({ v: null, ...(sides ? { sides } : {}) });

export interface KultivimeBlock {
  year: number;
  /** [parcela, produkti, sasi e miratuar, fillimi, mbarimi, njomë, thatë, eksportuar, stoku, komente, statusi] */
  rows: (string | number | null)[][];
  inspectedAt?: string;   // «FUNDIT DATA:…» (vetëm blloku kryesor)
}

/** «KULTIVIME BIOBES {viti}» — fleta PERMBLEDHJE, njësoj si KULTIVIMET_2026.xlsx. */
export function kultivimeReplica(blocks: KultivimeBlock[]): Report {
  const rows: Row[] = [];
  const merges: Report["merges"] = [];
  const widths = [2.71, 12.57, 32.43, 12.14, 25.14, 24.0, 22.57, 15.86, 12.71, 12.0, 31.86, 23.14];
  const heads = ["PARCELA ", "PRODUKTI", "SASI E MIRATUAR", "DT E FILLIMIT TE VJELJES ", "DT E MBARIMIT TE VJELJES ", "SASIA E MBLEDHUR NJ", "SASIA E MBLEDHUR THATE", "SASI EXPORTUAR", "STOKU", "KOMENTE", "STATUSI"];
  const cam = (o: Partial<Cell> = {}): Cell => ({ v: null, fontName: "Cambria", size: 11, sides: "lrtb", ...o });
  const ver = (o: Partial<Cell> = {}): Cell => ({ v: null, fontName: "Verdana", size: 12, sides: "lrtb", valign: "m", ...o });

  blocks.forEach((b, bi) => {
    if (bi > 0) for (let k = 0; k < 3; k++) rows.push({ height: 15, cells: widths.map(() => blank()) });
    const r0 = rows.length;
    // titulli: B:J × 2 rreshta
    const t = (i: number, top: boolean, bottom: boolean): Cell[] => widths.map((_, c) => {
      if (c < 1 || c > 9) return blank();
      const sides = (c === 1 ? "l" : "") + (c === 9 ? "r" : "") + (top ? "t" : "") + (bottom ? "b" : "");
      return c === 1 && top
        ? { v: `KULTIVIME BIOBES ${b.year}`, fontName: "Calibri", size: 18, bold: true, fill: "E2EFDA", align: "c", valign: "m", sides }
        : blank(sides);
    });
    rows.push({ height: 15, cells: t(0, true, false) }, { height: 15, cells: t(1, false, true) });
    merges.push([r0, 1, r0 + 1, 9]);
    // koka
    rows.push({ height: 42, header: bi === 0, cells: [
      cam({ fill: "B4C7E7", color: "44546A" }),
      ...heads.map((h) => cam({ v: h, fill: "B4C7E7", align: "c", valign: "m", wrap: true })),
    ] });
    for (const d of b.rows) {
      const [parc, prod, appr, from, to, fresh, dry, exp, stock, com, st] = d;
      rows.push({ height: 15, cells: [
        cam(),
        ver({ v: parc }),
        ver({ v: prod }),
        ver({ v: appr, align: "c", wrap: true, fmt: typeof appr === "number" ? ACC : undefined }),
        cam({ v: from }), cam({ v: to }),
        cam({ v: fresh, fmt: typeof fresh === "number" ? ACC : undefined }),
        cam({ v: dry, size: 12, bold: true, fmt: typeof dry === "number" ? ACC : undefined }),
        cam({ v: exp, fmt: typeof exp === "number" ? ACC : undefined }),
        cam({ v: stock, fmt: typeof stock === "number" ? ACC : undefined }),
        cam({ v: com }), cam({ v: st }),
      ] });
    }
    if (b.inspectedAt) {
      rows.push({ height: 15, cells: widths.map(() => blank()) });
      rows.push({ height: 15, cells: widths.map((_, c) => c === 1 ? { v: "INSPEKTIMI", size: 12, bold: true } : c === 2 ? { v: `FUNDIT DATA:${b.inspectedAt}`, size: 12, bold: true } : blank()) });
    }
  });
  return { name: `KULTIVIME_BIOBES_${blocks[0]?.year ?? ""}`, sheet: `PERMBLEDHJE ${blocks[0]?.year ?? ""}`, orientation: "landscape", paper: "A3", scalePct: 90, widths, rows, merges };
}

export interface DhlRow { tracking: string | number | null; shipDate: string; recipient: string; country: string; invoiceDate: string; amount: number | null; payDate: string; paid: number | null; note: string }

/** «DHL FATURAT» — njësoj si fleta «DHL FATURAT 2025+2026» e protokollit të mostrave. */
export function dhlReplica(title: string, list: DhlRow[]): Report {
  const widths = [13.0, 6.57, 15.14, 16.0, 47.86, 13.86, 16.43, 15.29, 13.86, 17.86, 37.57];
  const EUR = '_([$€-2]\\ * #,##0.00_);_([$€-2]\\ * \\(#,##0.00\\);_([$€-2]\\ * "-"??_);_(@_)';
  const heads = ["NR", "Kodi Gjurmueshmerise", "Data e dergeses", "Marresi mostres", "Shteti", "Data fatures dhl", "Shuma ne eur", "DATA PAGESES", "SHUMA E PAGUAR NE EUR"];
  const hSides = ["lrt", "rt", "rt", "rt", "rt", "rt", "t", "lrt", "lrt"];
  const rows: Row[] = [{ height: 15, cells: widths.map(() => blank()) }, { height: 15, cells: widths.map(() => blank()) }];
  rows.push({ height: 33, header: true, cells: [blank(), ...heads.map((h, i) => ({ v: h, fontName: "Arial", size: i === 6 ? 10 : 9, bold: true, fill: "FFC000", sides: hSides[i], align: "c" as const, valign: "m" as const, wrap: true })), blank()] });
  const a = (o: Partial<Cell>): Cell => ({ v: null, fontName: "Calibri", size: 12, sides: "lrtb", ...o });
  list.forEach((d, i) => rows.push({ height: 17.25, cells: [blank(),
    { v: String(i + 1), fontName: "Arial", size: 9, sides: "lrtb", align: "c" },
    { v: d.tracking, fontName: "Arial", size: 11, sides: "lrtb", align: "r" },
    a({ v: d.shipDate, align: "c" }), a({ v: d.recipient }), a({ v: d.country, size: 11 }), a({ v: d.invoiceDate, wrap: true }),
    a({ v: d.amount, bold: true, wrap: true, fmt: EUR }), a({ v: d.payDate, size: 11, bold: true, wrap: true }), a({ v: d.paid, size: 11, bold: true, wrap: true, fmt: EUR }), a({ v: d.note, size: 11 }), ] }));
  void title;
  return { name: "DHL_FATURAT", sheet: "DHL FATURAT", orientation: "landscape", widths, rows, merges: [] };
}

export interface ProtocolRow { date: string; client: string; country: string; product: string; code: string; tracking: string; comment: string; result: string }

/** «PROTOKOLLI MOSTRAVE» — njësoj si fleta e parë e 2026_PROTOKOLL_I_MOSTRAVE. */
export function protocolReplica(list: ProtocolRow[]): Report {
  const widths = [20.14, 48.43, 20.43, 46.29, 35.71, 33.43, 77.86, 243.29, 49.86];
  const k = (o: Partial<Cell>): Cell => ({ v: null, fontName: "Calibri", size: 16, valign: "m", ...o });
  const hd = (v: string, o: Partial<Cell>): Cell => k({ v, bold: true, color: "388195", align: "c", wrap: true, sides: "lr", ...o });
  const rows: Row[] = [{ height: 62.25, header: true, cells: [
    hd("DATA E MARRJES MOSTRES", { align: undefined }), hd("Klienti ", {}), hd("SHTETI", {}), hd("PRODUKTI", { color: undefined, align: undefined }), hd("KODI", { wrap: false }),
    hd("Tracking number", { fontName: "Arial", bold: false, color: "4F81BD" }), hd("KOMENT", { fill: "FCE4D6", sides: "l" }),
    hd("REZULTATE ANALIZAVE ", { color: "002060", fill: "D9E1F2", sides: "lrtb" }), hd("STATUSI", { sides: "r" }),
  ] }];
  for (const d of list) rows.push({ height: 29.25, cells: [
    k({ v: d.date, fill: "FFFF00", sides: "lrtb" }), k({ v: d.client, sides: "lrt" }), k({ v: d.country, sides: "lrt" }), k({ v: d.product, sides: "lrt", wrap: true }),
    k({ v: d.code, bold: true, align: "c", sides: "lrt" }), k({ v: d.tracking, size: 18, bold: true, color: "4F81BD", align: "c" }),
    k({ v: d.comment, bold: true, fill: "FCE4D6", sides: "lrtb", align: "c", wrap: true }), k({ v: d.result, bold: true, color: "002060", fill: "D9E1F2" }), blank(),
  ] });
  return { name: "PROTOKOLLI_MOSTRAVE", sheet: "PROTOKOLLI MOSTRAVE", orientation: "landscape", widths, rows, merges: [] };
}

export interface RotationPlot { code: string; title: string; totalM2: number; subs: { label: string; byYear: string[] }[] }

/** «PLAN QARKULLIMI» — kartela për çdo parcelë: titulli, vitet (çifte kolonash), nënparcelat me kulturat. */
export function rotationReplica(years: number[], plots: RotationPlot[]): Report {
  const widths = [14.43, ...years.flatMap(() => [14.0, 27.0])];
  const nC = widths.length, last = nC - 1;
  const rows: Row[] = [], merges: Report["merges"] = [];
  const empty = (): Cell[] => widths.map(() => blank());
  const t1 = empty(); t1[0] = { v: `PLAN QARKULLIMI ${years[0]}- ${years[years.length - 1]}`, fontName: "Calibri", size: 26, bold: true, fill: "FCD5B5", sides: "lrtb", align: "c", valign: "m" };
  rows.push({ height: 21, cells: t1 }, { height: 21, cells: empty() }); merges.push([0, 0, 1, 6]);
  rows.push({ height: 8, cells: empty() });
  for (const p of plots) {
    const r0 = rows.length;
    const title = empty();
    title[0] = { v: p.title, bold: true, color: "4F6128", sides: "lrtb", valign: "m", wrap: true };
    for (let c = 1; c <= last; c++) title[c] = blank(c === last ? "rtb" : "tb");
    rows.push({ height: 22, cells: title }); merges.push([r0, 0, r0, last]);
    const head = empty();
    head[0] = { v: p.totalM2 ? `SIP TOTALE ${p.totalM2}m2` : "", fill: "E5DFEC", sides: "lrtb", align: "c", valign: "m", wrap: true };
    years.forEach((y, i) => { head[1 + 2 * i] = { v: y, size: 14, bold: true, fill: "D9EAD3", sides: "lrtb", align: "c", valign: "m" }; head[2 + 2 * i] = blank("rtb"); });
    rows.push({ height: 18.75, header: false, cells: head });
    merges.push(...years.map((_, i) => [r0 + 1, 1 + 2 * i, r0 + 1, 2 + 2 * i] as [number, number, number, number]));
    p.subs.forEach((s) => {
      const row = empty(); row[0] = blank("lr");
      years.forEach((_, i) => {
        row[1 + 2 * i] = { v: s.label, sides: "lrtb", align: "c", valign: "m", wrap: true };
        row[2 + 2 * i] = { v: s.byYear[i] ?? "", sides: "lrtb", align: "c", valign: "m", wrap: true };
      });
      rows.push({ height: 32, cells: row });
    });
    rows.push({ height: 15, cells: empty() });
  }
  return { name: "PLAN_QARKULLIMI", sheet: "Plan Qarkullim Biobes", orientation: "landscape", paper: "A3", scalePct: 50, widths, rows, merges };
}

export interface FedexRow { date: string; ref: string; client: string; lek: number | null; currency: string; eur: number | null; note: string }

/** «FATURA FEDEX» — njësoj si fleta e protokollit të mostrave. */
export function fedexReplica(list: FedexRow[]): Report {
  const widths = [13, 30, 28, 22, 10, 22, 80];
  const heads = ["DATA", "NR FATURES/ NR REFERENCES", "KLIENTI", "SHUMA FATURES NE LEK", "VALUTA", "SHUMA E FATURES NE EUR", ""];
  const rows: Row[] = [{ height: 30, header: true, cells: heads.map((h) => ({ v: h || null, bold: true, sides: "lrtb", align: "c" as const, valign: "m" as const, wrap: true })) }];
  for (const d of list) rows.push({ height: 30, cells: [
    { v: d.date, sides: "lrtb", valign: "m" }, { v: d.ref, sides: "lrtb", valign: "m" }, { v: d.client, sides: "lrtb", valign: "m" },
    { v: d.lek, sides: "lrtb", valign: "m" }, { v: d.currency, sides: "lrtb", valign: "m" }, { v: d.eur, sides: "lrtb", valign: "m" },
    { v: d.note, sides: "lrtb", valign: "m", wrap: true },
  ] });
  return { name: "FATURA_FEDEX", sheet: "FATURA FEDEX", orientation: "landscape", widths, rows, merges: [] };
}

export interface LabEntry { date: string; ref: string; description: string; debit: number | null; credit: number | null }

/** «Kartela e Llogarisë GBA» — Dt. Regj., Nr ref., Përshkrimi, Debi, Kredi, totali dhe gjendja. */
export function labLedgerReplica(account: string, list: LabEntry[], note?: string): Report {
  const EUR = '_([$€-2]\\ * #,##0.00_);_([$€-2]\\ * \\(#,##0.00\\);_([$€-2]\\ * "-"??_);_(@_)';
  const widths = [13.43, 19.29, 75.71, 17.0, 15.57];
  const G = "008000", F = "F0FFF0";
  const rows: Row[] = [], merges: Report["merges"] = [[0, 0, 0, 4], [1, 0, 2, 0], [1, 1, 2, 1], [1, 2, 2, 2], [1, 3, 1, 4]];
  const hd = (v: string | null, sides: string, o: Partial<Cell> = {}): Cell => ({ v, bold: true, size: 12, color: G, fill: F, sides, wrap: true, ...o });
  rows.push({ height: 28.5, cells: [{ v: `Kartela e Llogarise ${account}`, size: 22, bold: true, color: G, wrap: true }, blank(), blank(), blank(), blank()] });
  rows.push({ height: 15.6, header: true, cells: [hd("Dt. Regj.", "lrtb"), hd("Nr ref.", "lrtb"), hd("Përshkrimi", "lrtb"), hd("Gjendja ne monedhe baze", "rtb"), blank("rtb")] });
  rows.push({ height: 16.5, header: true, cells: [blank("lrb"), blank("lrb"), blank("lrb"), hd("Debi", "rb", { fmt: EUR }), hd("Kredi", "rb", { fmt: EUR })] });
  const b = (o: Partial<Cell>): Cell => ({ v: null, size: 12, sides: "rb", ...o });
  for (const e of list) rows.push({ height: 18.75, cells: [b({ v: e.date, sides: "lrb" }), b({ v: e.ref }), b({ v: e.description }),
    b({ v: e.debit || null, bold: true, wrap: true, fmt: EUR }), b({ v: e.credit || null, bold: true, wrap: true, fmt: EUR })] });
  const D = list.reduce((a, e) => a + (e.debit ?? 0), 0), K = list.reduce((a, e) => a + (e.credit ?? 0), 0);
  rows.push({ height: 18.75, cells: [b({ sides: "lrb" }), b({}), b({ v: "TOTALI", bold: true }), b({ v: D, bold: true, fmt: EUR }), b({ v: K, bold: true, fmt: EUR })] });
  rows.push({ height: 18.75, cells: [blank(), blank(), { v: "GJENDJE", bold: true, size: 12 }, { v: K - D, bold: true, size: 12, fmt: EUR }, blank()] });
  if (note) { rows.push({ height: 15, cells: widths.map(() => blank()) }, { height: 15, cells: [{ v: note, italic: true }, blank(), blank(), blank(), blank()] }); }
  return { name: `Kartela_${account.replace(/\W+/g, "_")}`, sheet: `ANALIZAT ${account}`.slice(0, 31), orientation: "portrait", widths, rows, merges };
}
