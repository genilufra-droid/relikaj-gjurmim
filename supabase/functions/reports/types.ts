// Modeli i përbashkët i një raporti: një rrjetë qelizash që Excel dhe PDF e vizatojnë njësoj.
export interface Cell {
  v: string | number | null;
  bold?: boolean;
  italic?: boolean;
  size?: number;            // madhësia e shkronjave në pikë
  align?: "l" | "c" | "r";
  valign?: "t" | "m";
  fill?: string;            // ngjyra hex pa #, p.sh. "C6E0B4"
  border?: boolean;         // kornizë e hollë rreth qelizës
  wrap?: boolean;
  fmt?: string;             // format numri në Excel, p.sh. "#,##0.00" ose "dd/mm/yyyy"
  font?: "calibri" | "times";
  fontName?: string;        // emri i plotë i shkronjës (p.sh. Cambria, Verdana) — për kopje 1:1 të Excel-it
  color?: string;           // ngjyra e tekstit hex pa #
  sides?: string;           // korniza sipas anëve: kombinim i l, r, t, b (mbizotëron «border»)
}
export interface Row { height?: number; cells: Cell[]; header?: boolean }   // header: përsëritet në çdo faqe PDF
export interface Report {
  name: string;                       // emri i skedarit
  sheet: string;                      // emri i fletës në Excel
  orientation: "portrait" | "landscape";
  widths: number[];                   // gjerësitë e kolonave në njësi Excel (karaktere)
  rows: Row[];
  paper?: "A3" | "A4";                // parazgjedhja A4
  scalePct?: number;                  // shkallë fikse në vend të «përshtat në gjerësi»
  merges: [number, number, number, number][];   // [rreshti1, kolona1, rreshti2, kolona2], me bazë 0
}
export const COLORS = { green: "C6E0B4", yellow: "FFFF00", grey: "F2F2F2" };
