// Shkrues i thjeshtë XLSX (OOXML) me JSZip — pa module vendas, punon në telefon.
// Përkrah: fletë të shumta, stile baze, gjerësi kolonash, rresht i ngrirë,
// autofilter, bashkim qelizash, lista (dropdown) dhe validim numrash.
import JSZip from "jszip";

const esc = (t) =>
  String(t ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "&#10;");

const colName = (i) => {
  let n = i + 1, s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export const STYLE = { NORMAL: 0, HEADER: 1, TEXT: 2, NUM2: 3, NUM6: 4, TITLE: 5, WRAP: 6, NOTE: 7, SECTION: 8, EX_TEXT: 9, EX_NUM2: 10, EX_NUM6: 11 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.000000"/></numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF1B2A21"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF55655B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FF14532D"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF14532D"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF14532D"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDF2E8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDF3DC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFDCE3D7"/></left><right style="thin"><color rgb="FFDCE3D7"/></right><top style="thin"><color rgb="FFDCE3D7"/></top><bottom style="thin"><color rgb="FFDCE3D7"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="2" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
<xf numFmtId="164" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="right"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellXml(ref, value, style = STYLE.TEXT) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function sheetXml(spec) {
  const rows = spec.rows || [];
  const width = (spec.cols || []).length || Math.max(...rows.map((r) => r.length), 1);
  const ref = `A1:${colName(width - 1)}${Math.max(rows.length, 1)}`;

  const cols = (spec.cols || []).length
    ? `<cols>${spec.cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 14}" customWidth="1"/>`).join("")}</cols>`
    : "";

  const data = rows
    .map((row, ri) => {
      const cells = row.map((c, ci) => {
        if (c === null || c === undefined) return "";
        if (typeof c === "object") return cellXml(`${colName(ci)}${ri + 1}`, c.v, c.s ?? STYLE.TEXT);
        return cellXml(`${colName(ci)}${ri + 1}`, c, STYLE.TEXT);
      }).join("");
      const h = row.height ? ` ht="${row.height}" customHeight="1"` : "";
      return `<row r="${ri + 1}"${h}>${cells}</row>`;
    })
    .join("");

  const view = spec.freeze
    ? `<sheetView tabSelected="${spec.selected ? 1 : 0}" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>`
    : `<sheetView tabSelected="${spec.selected ? 1 : 0}" workbookViewId="0"/>`;

  const merges = (spec.merges || []).length
    ? `<mergeCells count="${spec.merges.length}">${spec.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";

  const dv = (spec.validations || []).length
    ? `<dataValidations count="${spec.validations.length}">${spec.validations.map((v) => {
        const attr = [
          `type="${v.type}"`,
          v.operator ? `operator="${v.operator}"` : "",
          v.allowBlank === false ? "" : 'allowBlank="1"',
          v.showInputMessage === false ? "" : 'showInputMessage="1"',
          'showErrorMessage="1"',
          v.promptTitle ? `promptTitle="${esc(v.promptTitle)}"` : "",
          v.prompt ? `prompt="${esc(v.prompt)}"` : "",
          `errorTitle="${esc(v.errorTitle || "Vlerë e pavlefshme")}"`,
          `error="${esc(v.error || "Zgjidhni një vlerë nga lista.")}"`,
          `sqref="${v.sqref}"`,
        ].filter(Boolean).join(" ");
        const f2 = v.formula2 !== undefined ? `<formula2>${esc(v.formula2)}</formula2>` : "";
        return `<dataValidation ${attr}><formula1>${esc(v.formula1)}</formula1>${f2}</dataValidation>`;
      }).join("")}</dataValidations>`
    : "";

  const filter = spec.autoFilter ? `<autoFilter ref="${spec.autoFilter}"/>` : "";
  const tab = spec.tabColor ? `<sheetPr><tabColor rgb="${spec.tabColor}"/></sheetPr>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${tab}<dimension ref="${ref}"/>
<sheetViews>${view}</sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols}
<sheetData>${data}</sheetData>
${filter}${merges}${dv}
<pageMargins left="0.6" right="0.6" top="0.7" bottom="0.7" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" paperSize="9"/>
</worksheet>`;
}

/** sheets: [{ name, cols:[{width}], rows:[[...]], freeze, merges, validations, autoFilter, hidden, tabColor, selected }] */
export async function buildXlsx(sheets, meta = {}) {
  const zip = new JSZip();
  const visible = sheets.filter((s) => !s.hidden);

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(meta.title || "BioBes Farm")}</dc:title>
<dc:creator>${esc(meta.creator || "BioBes Farm")}</dc:creator>
<cp:lastModifiedBy>${esc(meta.creator || "BioBes Farm")}</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`);

  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>BioBes Farm</Application></Properties>`);

  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<workbookPr/>
<bookViews><workbookView activeTab="${Math.max(sheets.indexOf(visible[0]), 0)}"/></bookViews>
<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ""} r:id="rId${i + 1}"/>`).join("")}</sheets>
<calcPr calcId="191029"/>
</workbook>`);

  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file("xl/styles.xml", STYLES);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));

  const bytes = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return bytes;
}
