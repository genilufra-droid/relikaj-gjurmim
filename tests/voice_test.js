// Testet e asistentit: numra, data, synime dhe lidhja me të dhënat reale.
import { parseCommand, findNumbers, findDate } from "../src/voice/parse.js";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log(`✗ ${msg}\n  pritej: ${JSON.stringify(b)}\n  doli:   ${JSON.stringify(a)}`); }
};
const ok = (c, msg) => (c ? pass++ : (fail++, console.log(`✗ ${msg}`)));

const TODAY = "2026-11-20";
const ctx = {
  today: TODAY,
  zones: [{ id: 1, code: "W01", name: "Tepelenë" }, { id: 2, code: "W02", name: "Çorovodë" }],
  farmers: [
    { id: 10, first_name: "Ilir", last_name: "Koçi", id_number: "K1", phone: "069", zone_code: "W01" },
    { id: 11, first_name: "Arben", last_name: "Memi", id_number: "K2", phone: "068", zone_code: "W02" },
    { id: 12, first_name: "Blerim", last_name: "Koçi", id_number: "K3", phone: "067", zone_code: "W01" },
  ],
  products: [
    { id: 20, code: "115", name: "Ferrë e zezë" },
    { id: 21, code: "109", name: "Mjedër" },
    { id: 22, code: "204", name: "Sherebelë" },
  ],
  plots: [
    { id: 30, code: "D01", name: "Parcela 1", zone_id: 1 },
    { id: 31, code: "D03", name: "Parcela 3", zone_id: 1 },
    { id: 32, code: "D08", name: "Parcela 8", zone_id: 2 },
  ],
};

// ---------------------------------------------------------------- numrat
eq(findNumbers("120").map((x) => x.value), [120], "numër me shifra");
eq(findNumbers("2,5 kg").map((x) => x.value), [2.5], "numër me presje");
eq(findNumbers("njeqind e njezet").map((x) => x.value), [120], "numër me fjalë");
eq(findNumbers("dyzet e pese").map((x) => x.value), [45], "numër me fjalë 2");
eq(findNumbers("nje mije e dyqind").map((x) => x.value), [1200], "numër me fjalë 3");
eq(findNumbers("blerje 120 kilo dhe 80 lek").map((x) => x.value), [120, 80], "dy numra");

// ---------------------------------------------------------------- datat
eq(findDate("neser", TODAY), "2026-11-21", "nesër");
eq(findDate("pasneser", TODAY), "2026-11-22", "pasnesër");
eq(findDate("dje", TODAY), "2026-11-19", "dje");
eq(findDate("12.06.2026", TODAY), "2026-06-12", "datë numerike");
eq(findDate("05/12", TODAY), "2026-12-05", "datë pa vit");

// ---------------------------------------------------------------- blerja
{
  const r = parseCommand("blerje 120 kilo ferre e zeze nga Ilir Koçi parcela D01 me cmim 80 lek", ctx);
  eq(r.intent, "purchase", "blerje: synimi");
  eq(r.draft.product_id, 20, "blerje: produkti");
  eq(r.draft.farmer_id, 10, "blerje: fermeri");
  eq(r.draft.qty_fresh, 120, "blerje: sasia");
  eq(r.draft.qty_dry, 120, "blerje: sasia e thatë");
  eq(r.draft.price, 80, "blerje: çmimi");
  eq(r.draft.plot_id, 30, "blerje: parcela");
  eq(r.draft.zone_id, 1, "blerje: zona nga parcela");
  eq(r.missing, [], "blerje: asgjë nuk mungon");
  ok(r.confidence > 0.8, "blerje: besueshmëri e lartë");
}

{
  const r = parseCommand("regjistro njeqind e njezet kilo mjedër nga Arben Memi", ctx);
  eq(r.intent, "purchase", "me fjalë: synimi");
  eq(r.draft.qty_fresh, 120, "me fjalë: sasia");
  eq(r.draft.product_id, 21, "me fjalë: produkti");
  eq(r.draft.farmer_id, 11, "me fjalë: fermeri");
  eq(r.draft.zone_id, 2, "me fjalë: zona nga fermeri (W02)");
}

{
  const r = parseCommand("dy kuintal sherebele nga Blerim Koçi", ctx);
  eq(r.intent, "purchase", "kuintal: synimi");
  eq(r.draft.qty_fresh, 200, "kuintal → 200 kg");
  eq(r.draft.product_id, 22, "kuintal: produkti");
  eq(r.draft.farmer_id, 12, "kuintal: fermeri");
}

// ---------------------------------------------------------------- të metat
{
  const r = parseCommand("blerje 100 kilo", ctx);
  eq(r.intent, "purchase", "pa produkt: synimi");
  ok(r.missing.includes("product_id"), "pa produkt: mungon produkti");
  ok(r.missing.includes("farmer_id"), "pa produkt: mungon fermeri");
}

// ---------------------------------------------------------------- detyra
{
  const r = parseCommand("detyrë nesër ujitje në parcelën D08", ctx);
  eq(r.intent, "task", "detyrë: synimi");
  eq(r.draft.type, "irrigate", "detyrë: lloji ujitje");
  eq(r.draft.due_date, "2026-11-21", "detyrë: afati nesër");
  eq(r.draft.plot_id, 32, "detyrë: parcela");
}

{
  const r = parseCommand("krasitje ne D01 urgjente", ctx);
  eq(r.intent, "task", "krasitje: synimi");
  eq(r.draft.type, "prune", "krasitje: lloji");
  eq(r.draft.priority, "high", "krasitje: përparësi");
}

// ---------------------------------------------------------------- vëzhgimi
{
  const r = parseCommand("vëzhgim dëmtues në D03 shkallë 2", ctx);
  eq(r.intent, "observation", "vëzhgim: synimi");
  eq(r.draft.kind, "pest", "vëzhgim: dëmtues");
  eq(r.draft.severity, 2, "vëzhgim: shkalla");
  eq(r.draft.plot_id, 31, "vëzhgim: parcela");
}

{
  const r = parseCommand("semundje myk ne D01 shkalle 3", ctx);
  eq(r.intent, "observation", "sëmundje: synimi");
  eq(r.draft.kind, "disease", "sëmundje: lloji");
  eq(r.draft.severity, 3, "sëmundje: shkalla 3");
}

// ---------------------------------------------------------------- shpenzimi
{
  const r = parseCommand("shpenzim 3 litra pleh në parcelën D03, 2500 lek", ctx);
  eq(r.intent, "input", "shpenzim: synimi");
  eq(r.draft.category, "fert", "shpenzim: kategoria pleh");
  eq(r.draft.qty, 3, "shpenzim: sasia");
  eq(r.draft.unit, "L", "shpenzim: litra");
  eq(r.draft.amount, 2500, "shpenzim: vlera");
  eq(r.draft.plot_id, 31, "shpenzim: parcela");
}

// ---------------------------------------------------------------- të tjera
eq(parseCommand("pershendetje", ctx).intent, null, "pa kuptim → asnjë synim");
eq(parseCommand("", ctx).intent, null, "tekst bosh");
ok(parseCommand("blerje 10 kilo mjedër", ctx).summary.includes("Mjedër"), "përmbledhja përmban produktin");

console.log(`\n${pass} teste kaluan, ${fail} dështuan`);
if (fail) process.exit(1);
