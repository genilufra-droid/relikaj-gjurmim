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
