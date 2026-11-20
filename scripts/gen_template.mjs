// Gjeneron shabllonin e importimit në docs/shkarko/ (i njëjti skedar që shkarkohet nga aplikacioni).
// Përdorimi:  npx esbuild scripts/gen_template.mjs --bundle --platform=node --format=esm --outfile=/tmp/gen.mjs && node /tmp/gen.mjs
import fs from "fs";
import { buildTemplateWorkbook } from "../src/import/template.js";

const b64 = await buildTemplateWorkbook();
const out = "docs/shkarko/BioBes-Import-Shabllon.xlsx";
fs.writeFileSync(out, Buffer.from(b64, "base64"));
console.log(`${out} — ${Buffer.from(b64, "base64").length} bajt`);
