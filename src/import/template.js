// Shablloni zyrtar i importimit: një skedar .xlsx me udhëzime, fletë për çdo regjistër,
// lista zgjedhjeje dhe validim. Gjenerohet në telefon, shkarkohet dhe plotësohet jashtë.
import { buildXlsx, STYLE } from "./xlsxWrite";
import { ENTITIES, ENTITY_ORDER, fieldsOf } from "./spec";
import { FIELD_META, ENUM_LISTS, LIST_COL, listFor, SHEET_NAME } from "./meta";

const colName = (i) => {
  let n = i + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const KIND_LABEL = { text: "Tekst", num: "Numër", bool: "PO / JO", enum: "Listë" };
const labelOf = (f) => (f.req ? `${f.label} *` : f.label);

// ---------------------------------------------------------------- fletët e të dhënave
function dataSheet(key, selected) {
  const fields = fieldsOf(key);
  const meta = FIELD_META[key] || {};
  const cols = fields.map((f) => ({ width: meta[f.key]?.w || 18 }));
  const rows = [fields.map((f) => ({ v: labelOf(f), s: STYLE.HEADER }))];

  const validations = [];
  fields.forEach((f, i) => {
    const col = colName(i);
    const sqref = `${col}2:${col}1000`;
    const list = listFor(f);
    const note = meta[f.key]?.note || "";
    if (list) {
      validations.push({
        type: "list",
        sqref,
        formula1: `Listat!$${LIST_COL[list]}$2:$${LIST_COL[list]}$${ENUM_LISTS[list].length + 1}`,
        promptTitle: f.label,
        prompt: note,
        errorTitle: "Vlerë e pavlefshme",
        error: `Zgjidhni një vlerë nga lista: ${ENUM_LISTS[list].join(", ")}.`,
      });
    } else if (f.kind === "num") {
      const min = meta[f.key]?.min ?? 0;
      const max = meta[f.key]?.max;
      validations.push({
        type: "decimal",
        operator: max !== undefined ? "between" : "greaterThanOrEqual",
        sqref,
        formula1: String(min),
        formula2: max !== undefined ? String(max) : undefined,
        promptTitle: f.label,
        prompt: note,
        errorTitle: "Numër i pavlefshëm",
        error: max !== undefined ? `Pranon vlera nga ${min} deri ${max}.` : "Shkruani numër pozitiv (p.sh. 2,5).",
      });
    }
  });

  return {
    name: SHEET_NAME[key],
    cols,
    rows,
    freeze: true,
    autoFilter: `A1:${colName(fields.length - 1)}1`,
    validations,
    selected,
    tabColor: "FF14532D",
  };
}

// ---------------------------------------------------------------- fleta e shembujve
function examplesSheet() {
  const rows = [];
  const merges = [];
  const full = (text, style = STYLE.WRAP) => {
    merges.push(`A${rows.length + 1}:E${rows.length + 1}`);
    rows.push([{ v: text, s: style }, null, null, null, null]);
  };
  full("Shembuj plotësimi", STYLE.TITLE);
  full("Këta rreshta janë vetëm për orientim — nuk importohen. Kopjoni strukturën te fletët e të dhënave.", STYLE.NOTE);
  rows.push([]);
  ENTITY_ORDER.forEach((k) => {
    const meta = FIELD_META[k] || {};
    const fields = fieldsOf(k);
    full(`Fleta «${SHEET_NAME[k]}»`, STYLE.SECTION);
    rows.push(fields.map((f) => ({ v: labelOf(f), s: STYLE.HEADER })));
    [1, 2].forEach((n) => {
      rows.push(fields.map((f) => {
        const m = meta[f.key] || {};
        const base = String(m.ex ?? "");
        const v = n === 1 ? base : base.replace(/1$/, "2");
        if (f.kind === "num" && v !== "") {
          const num = Number(v.replace(",", "."));
          return { v: Number.isFinite(num) ? (n === 1 ? num : num + 0.7) : v, s: f.key === "lat" || f.key === "lng" ? STYLE.EX_NUM6 : STYLE.EX_NUM2 };
        }
        return { v, s: STYLE.EX_TEXT };
      }));
    });
    rows.push([]);
  });
  return { name: "Shembuj", cols: [{ width: 26 }, { width: 16 }, { width: 14 }, { width: 26 }, { width: 62 }], rows, merges, tabColor: "FF9A6400" };
}

// ---------------------------------------------------------------- lista e zgjedhjeve (e fshehur)
function listsSheet() {
  const keys = Object.keys(ENUM_LISTS);
  const rows = [keys.map((k) => ({ v: k, s: STYLE.HEADER }))];
  const max = Math.max(...keys.map((k) => ENUM_LISTS[k].length));
  for (let i = 0; i < max; i++) {
    rows.push(keys.map((k) => (ENUM_LISTS[k][i] ? { v: ENUM_LISTS[k][i], s: STYLE.TEXT } : null)));
  }
  return { name: "Listat", hidden: true, cols: keys.map(() => ({ width: 18 })), rows };
}

// ---------------------------------------------------------------- fleta e udhëzimeve
function guideSheet() {
  const M = (v, s = STYLE.WRAP) => ({ v, s });
  const rows = [];
  const merges = [];
  const push = (cells, height) => { rows.push(Object.assign(cells, height ? { height } : {})); };
  const full = (text, style = STYLE.WRAP, height) => {
    const r = [M(text, style), null, null, null, null];
    merges.push(`A${rows.length + 1}:E${rows.length + 1}`);
    push(r, height);
  };

  full("BioBes Farm — Shabllon importimi", STYLE.TITLE, 26);
  full("Versioni 1.0 · Plotësohet jashtë aplikacionit dhe importohet: Modulet → Importo Excel", STYLE.NOTE, 18);
  push([null]);
  full("FLETËT E SHABLLONIT", STYLE.SECTION, 20);
  push(["Fleta", "Përmbajtja", "Kërkohet", "Kolonat", "Radha e importimit"].map((t) => ({ v: t, s: STYLE.HEADER })), 22);
  ENTITY_ORDER.forEach((k, i) => {
    push([
      { v: SHEET_NAME[k], s: STYLE.TEXT },
      { v: ENTITIES[k].blurb, s: STYLE.WRAP },
      { v: i < 2 ? "Po" : "Jo", s: STYLE.TEXT },
      { v: String(fieldsOf(k).length), s: STYLE.TEXT },
      { v: `${i + 1}.`, s: STYLE.TEXT },
    ], 30);
  });
  push([null]);
  full("SI IMPORTOHET", STYLE.SECTION, 20);
  [
    "1. Plotësoni fletët me të dhënat tuaja dhe ruajeni skedarin si .xlsx (Excel Workbook).",
    "2. Në aplikacion: Modulet → Importo Excel → «Shablloni i plotë (4 fleta)».",
    "3. Zgjidhni skedarin, kontrolloni parapamjen dhe shtypni «Importo».",
    "4. Rreshtat që ekzistojnë mund t'i anashkaloni ose t'i përditësoni — pa dublime.",
  ].forEach((t) => full(t, STYLE.WRAP, 18));
  push([null]);
  full("RREGULLAT E PLOTËSIMIT", STYLE.SECTION, 20);
  [
    "• Mos i ndryshoni titujt e kolonave dhe mos i zhvendosni kolonat: aplikacioni i lexon sipas titujve.",
    "• Një rresht = një regjistër. Rreshtat bosh nuk importohen.",
    "• Shembujt gjenden te fleta «Shembuj» dhe nuk importohen: të dhënat shkruhen vetëm te fletët «Zonat», «Fermerët», «Parcelat», «Produktet».",
    "• Fusha me yll (*) është e detyrueshme. Pa të, rreshti raportohet si gabim dhe nuk ruhet.",
    "• Kodet duhet të jenë unike brenda kompanisë: W01 për zonat, D01 për parcelat, 115 për produktet.",
    "• Lidhjet: «Kodi i zonës» duhet të ekzistojë te fleta «Zonat»; «Fermeri» lidhet me emrin e plotë ose numrin e kartës.",
    "• Numrat pranohen me presje ose pikë (2,5 ose 2.5). Sipërfaqja shkruhet në hektarë.",
    "• Kolonat me listë (prona, gjendja, ujitja, arë/serë, PO/JO) kanë zgjedhje nga lista; vlerë tjetër refuzohet.",
    "• Skedarët .xls të vjetër nuk lexohen: hapeni në Excel dhe «Ruaj si» → Excel Workbook (.xlsx).",
  ].forEach((t) => full(t, STYLE.WRAP, 18));
  push([null]);
  full("KOLONAT E FLETËVE", STYLE.SECTION, 20);

  ENTITY_ORDER.forEach((k) => {
    const meta = FIELD_META[k] || {};
    full(`Fleta «${SHEET_NAME[k]}»`, STYLE.SECTION, 18);
    push(["Kolona", "Kërkohet", "Lloji", "Shembull", "Shënim"].map((t) => ({ v: t, s: STYLE.HEADER })), 20);
    fieldsOf(k).forEach((f) => {
      const m = meta[f.key] || {};
      push([
        { v: labelOf(f), s: STYLE.TEXT },
        { v: f.req ? "Po" : "Jo", s: STYLE.TEXT },
        { v: KIND_LABEL[f.kind || "text"] || "Tekst", s: STYLE.TEXT },
        { v: m.ex === undefined || m.ex === null ? "" : String(m.ex).replace(".", ","), s: STYLE.TEXT },
        { v: m.note || "", s: STYLE.WRAP },
      ], 18);
    });
    push([null]);
  });

  full("Të dhënat demo (kompania BioBes) fshihen me skriptin supabase/demo/demo_fshi.sql.", STYLE.NOTE, 18);

  return {
    name: "Udhëzime",
    cols: [{ width: 26 }, { width: 16 }, { width: 12 }, { width: 26 }, { width: 62 }],
    rows,
    merges,
    selected: true,
    tabColor: "FF1E6B3A",
  };
}

/** Kthen skedarin e shabllonit si base64 (për t'u shkarkuar/ndarë nga telefoni). */
export async function buildTemplateWorkbook() {
  const sheets = [guideSheet(), ...ENTITY_ORDER.map((k) => dataSheet(k, false)), examplesSheet(), listsSheet()];
  return buildXlsx(sheets, { title: "BioBes Farm — Shabllon importimi", creator: "BioBes Farm" });
}

/** Fleta e shabllonit që i përket një regjistri (për zgjedhje automatike). */
export function templateSheetName(entityKey) {
  return SHEET_NAME[entityKey] || "";
}
