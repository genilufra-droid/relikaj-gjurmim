// Kuptimi i komandave në shqip: nga një fjali e folur te një regjistrim i gatshëm.
// Deterministik dhe pa internet — i njëjti tekst jep gjithmonë të njëjtin rezultat.

const norm = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[ç]/g, "c").replace(/[ë]/g, "e")
    .replace(/[^a-z0-9,.:/\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const key = (v) => norm(v);

// ---------------------------------------------------------------- numrat
const W = {
  zero: 0, nje: 1, nje1: 1, dy: 2, tre: 3, tri: 3, kater: 4, pese: 5, gjashte: 6, shtate: 7, tete: 8, nente: 9,
  dhjete: 10, njembedhjete: 11, dymbedhjete: 12, trembedhjete: 13, katermbedhjete: 14, pesembedhjete: 15,
  gjashtembedhjete: 16, shtatembedhjete: 17, tetembedhjete: 18, nentembedhjete: 19,
  njezet: 20, tridhjete: 30, dyzet: 40, pesedhjete: 50, gjashtedhjete: 60, shtatedhjete: 70, tetedhjete: 80, nentedhjete: 90,
  njeqind: 100, dyqind: 200, treqind: 300, katerqind: 400, peseqind: 500, gjashteqind: 600, shtateqind: 700,
  teteqind: 800, nenteqind: 900, qind: 100,
  mije: 1000, mbrenda: 0,
};
const CONNECTOR = new Set(["e", "edhe"]);
const UNIT_WORDS = {
  kg: "kg", kgr: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg", kilogramë: "kg",
  kuintal: "kuintal", kuintale: "kuintal", kvintal: "kuintal", kvintale: "kuintal",
  ton: "ton", tone: "ton", tonë: "ton", tona: "ton",
  litra: "L", liter: "L", litre: "L", l: "L", litrash: "L",
  cope: "copë", copa: "copë", njesi: "copë", njesi1: "copë",
  gram: "g", gramë: "g", gr: "g",
};
const MONEY = new Set(["lek", "leke", "leku", "lekesh", "all", "alls", "euro", "eur"]);
const MASS_FACTOR = { kg: 1, kuintal: 100, ton: 1000 };

const tokensWithPos = (n) => {
  const out = [];
  const re = /[a-z0-9]+(?:[.,][0-9]+)?/g;
  let m;
  while ((m = re.exec(n))) out.push({ t: m[0], i: m.index, end: m.index + m[0].length });
  return out;
};

const asNumber = (t) => {
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return undefined;
};

/** Nxjerr numrat me pozicion, qoftë «120», «1.5» ose «njëqind e njëzet». */
export function findNumbers(n) {
  const toks = tokensWithPos(n);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    const direct = asNumber(tk.t);
    if (direct !== undefined) {
      // «2.5» ose «2,5» njësoj; «069» telefon nuk merret si sasi (3+ shifra me zero kryesore)
      out.push({ value: direct, start: tk.i, end: tk.end, kind: "digit" });
      continue;
    }
    if (W[tk.t] === undefined) continue;
    let value = 0, cur = 0, j = i, last = tk;
    while (j < toks.length) {
      const t = toks[j].t;
      if (CONNECTOR.has(t) && j + 1 < toks.length && W[toks[j + 1].t] !== undefined) { j++; continue; }
      const v = W[t];
      if (v === undefined) break;
      if (v === 0) { j++; continue; }
      if (v === 100 || (v >= 100 && v < 1000)) cur = (cur || 1) * (v === 100 ? 100 : v);
      else if (v >= 1000) { value += (cur || 1) * v; cur = 0; }
      else cur += v;
      last = { end: toks[j].end };
      j++;
    }
    if (value + cur > 0) out.push({ value: value + cur, start: tk.i, end: last.end, kind: "word" });
    i = Math.max(i, j - 1);
  }
  return out;
}

// ---------------------------------------------------------------- datat
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const shift = (base, days) => {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};

export function findDate(n, today) {
  if (/\bpasneser\b/.test(n)) return shift(today, 2);
  if (/\bneser\b/.test(n)) return shift(today, 1);
  if (/\bsot\b|\btani\b|\bkesaj dite\b/.test(n)) return today;
  if (/\bpardje\b/.test(n)) return shift(today, -2);
  if (/\bdje\b/.test(n)) return shift(today, -1);
  const m = n.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(today.slice(0, 4));
    const mo = Number(m[2]), d = Number(m[1]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

// ---------------------------------------------------------------- hyrjet
const CUES = {
  purchase: ["bleu", "bleva", "bleu", "blerje", "solla", "mora", "dorezova", "korrje", "korra", "pruri", "solli", "shiten", "kg", "kilo", "kuintal", "ton", "cmim"],
  task: ["detyre", "detyr", "kujto", "kujtues", "planifiko", "duhet", "neser", "pasneser", "mbjell", "ujit", "krasit", "plehro", "kontrollo", "prite", "vjel"],
  observation: ["vezhgim", "vezhgo", "demtues", "demtuesit", "semundje", "morri", "plesht", "krimb", "myk", "stres", "demtim", "insekt", "gjethe", "skalle", "shkalle"],
  input: ["shpenzim", "shpenzova", "input", "pleh", "plehra", "fare", "fara", "karburant", "nafte", "pesticid", "herbicid", "trajtim", "bleva", "paguaj", "pagoi", "fatur"],
};

const TASK_TYPES = [
  [["ujit", "ujis", "vadit"], "irrigate"],
  [["krasit", "prerje"], "prune"],
  [["plehro", "pleherim", "plehra"], "fertilize"],
  [["mbjell", "mbjellje", "mbjellim"], "sow"],
  [["vjel", "vjelje", "korr"], "harvest"],
  [["mbrojt", "spërk", "sperk", "pesticid"], "protect"],
  [["kontrollo", "vezhgo", "inspekto"], "scout"],
  [["kujdes", "pastro", "kosit"], "care"],
];
const OBS_KINDS = [
  [["demtues", "insekt", "plesht", "morri", "krimb", "mushkonj", "merimang"], "pest"],
  [["semundje", "myk", "kripe", "viral", "bakter", "kerpudh"], "disease"],
  [["bare", "baresh", "egjer", "jonxh"], "weed"],
  [["stres", "thate", "nxilte", "ujitje"], "stress"],
  [["demtim", "breshr", "era", "ngrice"], "damage"],
];
const INPUT_CATS = [
  [["pleh", "plehra", "ure", "nitrat", "ammonit"], "fert"],
  [["fare", "fara", "fidane"], "seed"],
  [["pesticid", "herbicid", "fungicid", "trajtim", "sperk"], "pest"],
  [["karburant", "nafte", "diesel", "benzine"], "fuel"],
  [["ujitje", "energji", "rryme", "ujesjell"], "water"],
  [["pune", "punes", "puntor", "dite pune"], "labor"],
  [["makineri", "traktor", "kombajne", "pjes"], "machinery"],
];

const pickBy = (list, n, fallback) => {
  for (const [words, value] of list) if (words.some((w) => n.includes(w))) return value;
  return fallback;
};

function scoreIntent(n) {
  const s = { purchase: 0, task: 0, observation: 0, input: 0 };
  for (const [k, words] of Object.entries(CUES)) {
    for (const w of words) {
      const re = new RegExp(`(^|\\s)${w}`);
      if (re.test(n)) s[k] += 1;
    }
  }
  // sasi me njësi mase + produkt → blerje
  if (/\b(kg|kilo|kuintal|ton|tona)\b/.test(n)) s.purchase += 2;
  if (/\b(lek|leke)\b/.test(n)) s.purchase += 1;
  return s;
}

// ---------------------------------------------------------------- njohja e entiteteve
function matchPlot(n, plots) {
  let best = null;
  for (const p of plots) {
    const code = key(p.code);
    if (code && new RegExp(`(^|\\s)${code}(?![a-z0-9])`).test(n)) return p;
    const name = key(p.name);
    if (name && name.length > 2 && n.includes(name)) best = best || p;
  }
  return best;
}

function matchProduct(n, products, usedValues = []) {
  let best = null;
  for (const p of products) {
    const name = key(p.name);
    if (name && name.length > 2 && n.includes(name)) {
      if (!best || name.length > key(best.name).length) best = p;
    }
  }
  if (best) return best;
  for (const p of products) {
    const code = key(p.code);
    if (!code) continue;
    if (!new RegExp(`(^|\\s)${code}(?![a-z0-9])`).test(n)) continue;
    if (usedValues.includes(Number(code))) continue;   // numri u përdor si sasi
    best = best || p;
  }
  return best;
}

function matchFarmer(n, farmers) {
  let best = null;
  for (const f of farmers) {
    const full = key(`${f.first_name} ${f.last_name}`);
    if (full && n.includes(full)) return f;
  }
  for (const f of farmers) {
    const last = key(f.last_name);
    if (last && last.length > 3 && new RegExp(`(^|\\s)${last}(?![a-z0-9])`).test(n)) {
      if (best && best.id !== f.id) return null;   // dy fermerë me të njëjtin mbiemër
      best = f;
    }
  }
  return best;
}

// ---------------------------------------------------------------- kryefjala
/**
 * parseCommand(text, ctx)
 * ctx: { products, plots, farmers, zones, today: "YYYY-MM-DD" }
 */
export function parseCommand(text, ctx = {}) {
  const raw = String(text || "").trim();
  const n = norm(raw);
  const today = ctx.today || new Date().toISOString().slice(0, 10);
  const products = ctx.products || [];
  const plots = ctx.plots || [];
  const farmers = ctx.farmers || [];
  const zones = ctx.zones || [];

  const scores = scoreIntent(n);
  const intent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] : null;

  const numbers = findNumbers(n);
  const toks = tokensWithPos(n);

  // njësitë pranë numrave
  const withUnit = numbers.map((num) => {
    let unit = null, money = false;
    for (const tk of toks) {
      if (tk.i >= num.end && tk.i <= num.end + 22) {
        if (UNIT_WORDS[tk.t]) unit = UNIT_WORDS[tk.t];
        if (MONEY.has(tk.t)) money = true;
      }
      if (tk.end <= num.start && tk.end >= num.start - 10 && UNIT_WORDS[tk.t]) unit = UNIT_WORDS[tk.t];
    }
    return { ...num, unit, money };
  });

  const priceEntry = withUnit.find((x) => x.money);
  const qtyEntry = withUnit.find((x) => x.unit && !x.money) || withUnit.find((x) => !x.money && x !== priceEntry);
  const price = priceEntry ? priceEntry.value : null;
  let qty = qtyEntry ? qtyEntry.value : null;
  let unit = qtyEntry?.unit || (qtyEntry ? "kg" : null);
  if (qtyEntry?.unit && MASS_FACTOR[qtyEntry.unit]) qty = qtyEntry.value * MASS_FACTOR[qtyEntry.unit];

  const plot = matchPlot(n, plots);
  const usedValues = [qty, price].filter((v) => v !== null);
  const product = matchProduct(n, products, usedValues);
  const farmer = matchFarmer(n, farmers);
  const date = findDate(n, today) || today;

  const missing = [];
  const unknown = [];
  const draft = { date };
  let summary = "";
  let confidence = 0.45;

  if (intent === "purchase") {
    if (product) { draft.product_id = product.id; confidence += 0.15; }
    else missing.push("product_id");
    if (farmer) { draft.farmer_id = farmer.id; confidence += 0.15; }
    else missing.push("farmer_id");
    if (qty !== null) { draft.qty_fresh = qty; draft.qty_dry = qty; confidence += 0.15; }
    else missing.push("qty_fresh");
    if (price !== null) { draft.price = price; confidence += 0.1; }
    if (plot) {
      draft.plot_id = plot.id;
      if (plot.zone_id) draft.zone_id = plot.zone_id;
    } else if (farmer) {
      const z = zones.find((x) => key(x.code) === key(farmer.zone_code));
      if (z) draft.zone_id = z.id;
    }
    if (draft.zone_id) confidence += 0.05;
    else missing.push("zone_id");
    draft.cut = "I";
    summary = [
      product ? product.name : "produkt i panjohur",
      qty !== null ? `${qty} ${unit === "L" ? "L" : "kg"}` : "sasi e panjohur",
      farmer ? `nga ${farmer.first_name} ${farmer.last_name}` : "pa fermer",
      plot ? `· ${plot.code || plot.name}` : "",
      price !== null ? `· ${price} lek/kg` : "",
    ].filter(Boolean).join(" ");
  } else if (intent === "task") {
    draft.type = pickBy(TASK_TYPES, n, "other");
    draft.title = raw.replace(/\s+/g, " ").slice(0, 90);
    draft.due_date = date;
    draft.priority = /urgjent|menjehere|shpejt/.test(n) ? "high" : "normal";
    if (plot) { draft.plot_id = plot.id; confidence += 0.2; }
    if (farmer) { draft.farmer_id = farmer.id; confidence += 0.1; }
    confidence += 0.15;
    summary = `Detyrë «${draft.title}»${plot ? ` · ${plot.code || plot.name}` : ""} · ${draft.due_date}`;
  } else if (intent === "observation") {
    draft.kind = pickBy(OBS_KINDS, n, "other");
    draft.severity = /shkalle 3|shkalle e trete|i rende|larte|ashper/.test(n) ? 3 : /shkalle 2|mesatar/.test(n) ? 2 : 1;
    draft.description = raw.replace(/\s+/g, " ").slice(0, 140);
    draft.date = date;
    draft.resolved = false;
    if (plot) { draft.plot_id = plot.id; confidence += 0.25; }
    else missing.push("plot_id");
    confidence += 0.15;
    summary = `Vëzhgim ${draft.kind === "pest" ? "dëmtuesish" : draft.kind === "disease" ? "sëmundjeje" : draft.kind === "weed" ? "barërajsh" : draft.kind === "stress" ? "stresi" : draft.kind === "damage" ? "dëmtimi" : ""}${plot ? ` në ${plot.code || plot.name}` : ""} · shkallë ${draft.severity}/3`;
  } else if (intent === "input") {
    draft.category = pickBy(INPUT_CATS, n, "other");
    draft.description = raw.replace(/\s+/g, " ").slice(0, 140);
    draft.date = date;
    if (qty !== null) { draft.qty = qty; draft.unit = unit || ""; confidence += 0.15; }
    if (price !== null) { draft.amount = price; confidence += 0.15; }
    if (plot) { draft.plot_id = plot.id; confidence += 0.15; }
    summary = `Shpenzim ${draft.description.slice(0, 40)}${qty !== null ? ` · ${qty} ${draft.unit || ""}` : ""}${price !== null ? ` · ${price} lek` : ""}${plot ? ` · ${plot.code || plot.name}` : ""}`;
  } else {
    summary = "Nuk e njoha veprimin. Provoni: «blerje 120 kilo mjedër nga Ilir Koçi» ose «detyrë nesër ujitje D08».";
  }

  return {
    text: raw,
    intent,
    confidence: Math.min(0.97, confidence),
    draft,
    missing,
    unknown,
    summary,
    scores,
    entities: {
      product: product ? { id: product.id, name: product.name } : null,
      plot: plot ? { id: plot.id, name: plot.name, code: plot.code } : null,
      farmer: farmer ? { id: farmer.id, name: `${farmer.first_name} ${farmer.last_name}` } : null,
      qty, unit, price, date,
    },
  };
}

export const EXAMPLES = [
  "blerje 120 kilo ferre e zeze nga Ilir Koçi parcela D01 me cmim 80 lek",
  "regjistro 45 kg mjedër nga Arben Memi",
  "detyrë nesër ujitje në parcelën D08",
  "vëzhgim dëmtues në D03 shkallë 2",
  "shpenzim 3 litra pleh në parcelën D02, 2500 lek",
];
