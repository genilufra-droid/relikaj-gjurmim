// Përkufizimet e importimit: cilat fusha, si njihen titujt e kolonave, si pastrohen vlerat.
import { normHeader } from "./parse";

export const norm = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[ç]/g, "c").replace(/[ë]/g, "e")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const digits = (v) => String(v ?? "").replace(/\D+/g, "");

/** Numra «shqip»: 1.250,50 → 1250.5 ; 2,5 → 2.5 ; 2.5 → 2.5 */
export function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let t = String(v).trim().replace(/\s|ha|Ha|HA|%/g, "");
  if (!t) return null;
  const hasDot = t.includes("."), hasComma = t.includes(",");
  if (hasDot && hasComma) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (hasComma) {
    const after = t.split(",").pop();
    t = after.length === 3 && t.split(",").length === 2 ? t.replace(/,/g, "") : t.replace(",", ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function toBool(v) {
  const t = norm(v);
  if (!t) return null;
  if (["po", "1", "true", "yes", "y", "x", "egar", "egra", "djerre", "wild"].includes(t)) return true;
  if (["jo", "0", "false", "no", "n", "-", "asnje"].includes(t)) return false;
  return null;
}

const growingMap = { are: "field", ar: "field", field: "field", open: "field", toke: "field", sere: "greenhouse", greenhouse: "greenhouse", serre: "greenhouse", tunel: "greenhouse" };
const irrigationMap = {
  pik: "drip", pike: "drip", pikes: "drip", drip: "drip", "pikesim": "drip", "ujitje me pike": "drip",
  sprinkler: "sprinkler", shpritsues: "sprinkler", shi: "sprinkler", "ujitje me shi": "sprinkler",
  furrow: "furrow", hulli: "furrow", "vaditje siperfaqesore": "furrow", siperfaqesore: "furrow",
  none: "none", jo: "none", asnje: "none", "pa ujitje": "none", thate: "none",
};

const ownershipMap = {
  owned: "owned", prona: "owned", prone: "owned", pronesi: "owned", ime: "owned", yne: "owned", "e zoteruar": "owned", vetjake: "owned",
  leased: "leased", qira: "leased", "me qira": "leased", arenduar: "leased", arendim: "leased",
  wild: "wild", djerr: "wild", pyll: "wild", "e eger": "wild", eger: "wild", "pa pronar": "wild", "tok e eger": "wild",
};
const statusMap = {
  active: "active", aktiv: "active", aktive: "active", "ne prodhim": "active", "ne perdorim": "active", kultivuar: "active",
  fallow: "fallow", djerr: "fallow", djerre: "fallow", "e papunuar": "fallow", papunuar: "fallow",
  resting: "resting", pushim: "resting", "ne pushim": "resting", prehje: "resting",
};
const ENUM_MAPS = { growing: growingMap, irrigation: irrigationMap, ownership: ownershipMap, status: statusMap };

const enumPick = (map, v, fallback) => {
  const t = norm(v).replace(/\s+/g, " ");
  if (!t) return { value: fallback, warn: "" };
  if (map[t]) return { value: map[t], warn: "" };
  const hit = Object.keys(map).find((k) => t.includes(k));
  return hit ? { value: map[hit], warn: "" } : { value: fallback, warn: `«${v}» nuk njihet — u vendos «${fallback}»` };
};

// ------------------------------------------------------------------ entitetet
export const ENTITIES = {
  zones: {
    key: "zones",
    label: "Zonat",
    one: "zonë",
    icon: "people-outline",
    table: "zones",
    blurb: "Zonat e grumbullimit: kodi dhe emri i fshatit ose krahinës.",
    dbCols: "id,code,name",
    identity: (r) => norm(r.code) || norm(r.name),
    fields: [
      { key: "code", label: "Kodi i zonës", req: true, hint: "p.sh. W01", aliases: ["kodi", "kod", "kodi i zones", "kod zona", "zone", "zona", "code", "id", "nr"] },
      { key: "name", label: "Emri i zonës", aliases: ["emri", "emri i zones", "zona emri", "zona", "name", "fshati", "fshat", "village", "lokacion"] },
      { key: "fair_wild", label: "Djerr / pyll (po/jo)", kind: "bool", aliases: ["djerr", "djerre", "pyll", "fair wild", "fairwild", "wild", "e egër"] },
      { key: "region", label: "Qarku / rrethi", aliases: ["qarku", "rrethi", "region", "prefektura", "district", "komuna"] },
      { key: "collection_point", label: "Pika e grumbullimit", aliases: ["pika e grumbullimit", "pika e mbledhjes", "pika", "grumbullim", "depoja", "collection point", "vendgrumbullimi"] },
      { key: "collector_name", label: "Grumbulluesi (emri)", aliases: ["grumbulluesi", "grumbullues", "collector", "pergjegjesi", "personi", "kontakti"] },
      { key: "note", label: "Shënim", kind: "text", aliases: ["shenim", "shenime", "note", "koment", "comment", "observim"] },
    ],
  },

  farmers: {
    key: "farmers",
    label: "Fermerët",
    one: "fermer",
    icon: "person-outline",
    table: "farmers",
    blurb: "Grumbulluesit tuaj: emri, telefoni, numri i kartës dhe zona.",
    dbCols: "id,first_name,last_name,id_number,phone,zone_code",
    identity: (r) => (digits(r.id_number) ? `id:${digits(r.id_number)}` : `em:${norm(r.first_name)} ${norm(r.last_name)}`),
    fields: [
      { key: "full_name", label: "Emri i plotë (një kolonë)", kind: "text", virtual: true, aliases: ["emri i plote", "emri plote", "emri dhe mbiemri", "fermeri", "fermer", "emri", "name", "full name", "grower"] },
      { key: "first_name", label: "Emri", aliases: ["emri", "first name", "firstname", "name"] },
      { key: "last_name", label: "Mbiemri", aliases: ["mbiemri", "last name", "lastname", "surname", "family"] },
      { key: "phone", label: "Telefoni", aliases: ["telefoni", "tel", "phone", "mobile", "celular", "kontakt"] },
      { key: "id_number", label: "Nr. i kartës / ID", aliases: ["id", "nr id", "numri id", "karta", "nr karte", "id number", "nid", "personal id", "kod fermeri"] },
      { key: "zone_code", label: "Kodi i zonës", aliases: ["zona", "kodi i zones", "kod zona", "zone", "zone code", "fshati"] },
      { key: "address", label: "Adresa", aliases: ["adresa", "address", "fshati", "vendndodhja"] },
      { key: "family_size", label: "Anëtarë familje", kind: "num", int: true, aliases: ["familja", "anetare familje", "family size", "familje", "numri i anetareve"] },
      { key: "group_name", label: "Grupi", aliases: ["grupi", "group", "grumbulluesi", "collector"] },
      { key: "note", label: "Shënim", aliases: ["shenim", "shenime", "note", "koment", "comment"] },
    ],
  },

  plots: {
    key: "plots",
    label: "Parcelat",
    one: "parcelë",
    icon: "map-outline",
    table: "plots",
    blurb: "Parcelat me sipërfaqe, zonë dhe fermerin pronar.",
    dbCols: "id,code,name",
    identity: (r) => norm(r.code) || norm(r.name),
    fields: [
      { key: "name", label: "Emri i parcelës", req: true, aliases: ["emri", "emri i parceles", "parcela", "parcel", "plot", "plot name", "name", "kultura"] },
      { key: "code", label: "Kodi i parcelës", aliases: ["kodi", "kod", "kodi i parceles", "code", "id", "nr"] },
      { key: "area_ha", label: "Sipërfaqja (ha)", kind: "num", aliases: ["siperfaqja", "siperfaqe", "ha", "area", "area ha", "hektare", "sip", "siperfaqja ha", "size"] },
      { key: "zone_code", label: "Kodi i zonës", aliases: ["zona", "kodi i zones", "zone", "zone code", "fshati"] },
      { key: "farmer_ref", label: "Fermeri (emër ose ID)", aliases: ["fermeri", "fermer", "farmer", "pronari", "owner", "grower", "emri i fermerit", "id fermeri"] },
      { key: "lat", label: "Gjerësi (lat)", kind: "num", aliases: ["lat", "gjr", "gjeresi", "latitude", "y"] },
      { key: "lng", label: "Gjatësi (lng)", kind: "num", aliases: ["lng", "lon", "long", "gjatesi", "longitude", "x"] },
      { key: "ownership", label: "Prona (ime / qira / djerr)", kind: "enum", options: "ownership", enumDefault: "owned", aliases: ["prona", "pronesia", "pronësia", "pronar", "ownership", "statusi i prones", "me qira", "qira"] },
      { key: "status", label: "Gjendja (në prodhim / djerr)", kind: "enum", options: "status", enumDefault: "active", aliases: ["gjendja", "status", "statusi", "ne prodhim", "perdorimi"] },
      { key: "soil_type", label: "Toka", aliases: ["toka", "soil", "soil type", "tipi i tokes", "struktura"] },
      { key: "altitude", label: "Lartësia (m)", kind: "num", aliases: ["lartesia", "altitude", "mbi det", "lartesi"] },
      { key: "organic", label: "Organike (po/jo)", kind: "bool", aliases: ["organike", "organic", "bio", "certifikuar bio"] },
      { key: "growing", label: "Arë / serë", kind: "enum", options: "growing", enumDefault: "field", aliases: ["are", "sere", "growing", "kultiimi", "tipi", "type", "open field"] },
      { key: "irrigation", label: "Ujitja", kind: "enum", options: "irrigation", aliases: ["ujitja", "ujitje", "irrigation", "sistemi i ujitjes"] },
      { key: "note", label: "Shënim", aliases: ["shenim", "shenime", "note", "koment", "comment"] },
    ],
  },

  products: {
    key: "products",
    label: "Produktet",
    one: "produkt",
    icon: "leaf-outline",
    table: "products",
    blurb: "Bimët që grumbulloni: kodi, emri dhe emri latin.",
    dbCols: "id,code,name",
    identity: (r) => norm(r.code) || norm(r.name),
    fields: [
      { key: "name", label: "Emri i produktit", req: true, aliases: ["emri", "produkti", "product", "name", "bima", "culture", "kultura"] },
      { key: "code", label: "Kodi", aliases: ["kodi", "kod", "code", "id", "nr", "kodi i produktit"] },
      { key: "latin", label: "Emri latin", aliases: ["latin", "latin name", "emri latin", "species", "specie"] },
      { key: "part", label: "Pjesa e grumbulluar", aliases: ["pjesa", "part", "part used", "organi", "fruti", "gjethe"] },
    ],
  },
};

export const ENTITY_ORDER = ["zones", "farmers", "plots", "products"];
export const getEntity = (k) => ENTITIES[k] || null;
export const fieldsOf = (k) => (ENTITIES[k] ? ENTITIES[k].fields : []);

// ------------------------------------------------------------------ njohja e kolonave
/**
 * Kthen { fieldKey: headerIndex } duke krahasuar titujt me aliaset.
 * Titull i njëjtë me aliasin → 100 pikë; fillimi → 80; përmbajtja → 60.
 */
export function guessMapping(headers, entityKey) {
  const fields = fieldsOf(entityKey);
  const hs = (headers || []).map((h) => ({ raw: h, n: normHeader(h) }));
  const scored = [];
  for (const f of fields) {
    const aliases = [f.label, ...(f.aliases || [])].map((a) => normHeader(a)).filter(Boolean);
    hs.forEach((h, i) => {
      if (!h.n) return;
      let best = 0;
      for (const a of aliases) {
        if (h.n === a) best = Math.max(best, 100);
        else if (h.n.startsWith(a) || a.startsWith(h.n)) best = Math.max(best, 80);
        else if (h.n.includes(a) || a.includes(h.n)) best = Math.max(best, 60);
      }
      if (best) scored.push({ f: f.key, i, score: best });
    });
  }
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const mapping = {};
  const usedCols = new Set();
  for (const s of scored) {
    if (mapping[s.f] !== undefined || usedCols.has(s.i)) continue;
    mapping[s.f] = s.i;
    usedCols.add(s.i);
  }
  // «Emri i plotë» vetëm nëse s'ka emër/mbiemër të ndarë
  if (entityKey === "farmers" && mapping.first_name !== undefined && mapping.full_name !== undefined) {
    delete mapping.full_name;
  }
  return mapping;
}

// ------------------------------------------------------------------ përgatitja e rreshtave
const cell = (row, idx) => (idx === undefined || idx === null ? "" : row[idx] ?? "");

export function buildContext({ zones = [], farmers = [], plots = [], products = [] }) {
  const byNorm = (rows, fn) => {
    const m = new Map();
    for (const r of rows) {
      const k = fn(r);
      if (k && !m.has(k)) m.set(k, r);
    }
    return m;
  };
  return {
    zones, farmers, plots, products,
    zoneByKey: byNorm(zones, (z) => norm(z.code) || norm(z.name)),
    farmerById: byNorm(farmers, (f) => (digits(f.id_number) ? `id:${digits(f.id_number)}` : "")),
    farmerByName: byNorm(farmers, (f) => `${norm(f.first_name)} ${norm(f.last_name)}`),
    farmerByPhone: byNorm(farmers, (f) => digits(f.phone)),
    productByKey: byNorm(products, (p) => norm(p.code) || norm(p.name)),
    plotByKey: byNorm(plots, (p) => norm(p.code) || norm(p.name)),
  };
}

const resolveZone = (ctx, v) => {
  const k = norm(v);
  if (!k) return null;
  return ctx.zoneByKey.get(k) || null;
};

const resolveFarmer = (ctx, v) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const d = digits(raw);
  if (d && ctx.farmerById.get(`id:${d}`)) return ctx.farmerById.get(`id:${d}`);
  if (d && ctx.farmerByPhone.get(d)) return ctx.farmerByPhone.get(d);
  return ctx.farmerByName.get(norm(raw)) || null;
};

const splitName = (v) => {
  const parts = String(v ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
};

/**
 * Kthen rreshtat e gatshëm për insert/update dhe gabimet.
 * mode: "skip" (ekzistuesit anashkalohen) | "update" (përditësohen)
 */
export function prepareRows(entityKey, mapping, rows, ctx, opts = {}) {
  const entity = getEntity(entityKey);
  if (!entity) return { ready: [], errors: [{ line: 0, message: "Entiteti nuk njihet" }], counts: { total: 0, create: 0, update: 0, skip: 0, error: 0 } };
  const mode = opts.mode === "update" ? "update" : "skip";
  const lineOffset = opts.lineOffset ?? 0;
  const ready = [];
  const errors = [];
  const seen = new Map();

  const existingFor = (values) => {
    if (entityKey === "plots") return ctx.plotByKey.get(norm(values.code) || norm(values.name)) || null;
    if (entityKey === "products") return ctx.productByKey.get(norm(values.code) || norm(values.name)) || null;
    if (entityKey === "zones") return ctx.zoneByKey.get(norm(values.code) || norm(values.name)) || null;
    if (entityKey === "farmers") {
      if (digits(values.id_number) && ctx.farmerById.get(`id:${digits(values.id_number)}`)) return ctx.farmerById.get(`id:${digits(values.id_number)}`);
      return ctx.farmerByName.get(`${norm(values.first_name)} ${norm(values.last_name)}`) || null;
    }
    return null;
  };

  const identityOf = (values) => {
    if (entityKey === "farmers") return digits(values.id_number) ? `id:${digits(values.id_number)}` : `em:${norm(values.first_name)} ${norm(values.last_name)}`;
    return norm(values.code) || norm(values.name);
  };

  rows.forEach((row, i) => {
    const line = lineOffset + i + 1;
    const values = {};
    const warnings = [];

    for (const f of entity.fields) {
      const idx = mapping[f.key];
      const raw = cell(row, idx);
      if (f.kind === "num") {
        const n = toNum(raw);
        values[f.key] = n === null ? null : f.int ? Math.round(n) : n;
      }
      else if (f.kind === "bool") values[f.key] = toBool(raw) ?? false;
      else if (f.kind === "enum") {
        const pick = enumPick(ENUM_MAPS[f.options] || growingMap, raw, f.enumDefault || "none");
        values[f.key] = pick.value;
        if (pick.warn) warnings.push(pick.warn);
      } else values[f.key] = String(raw ?? "").replace(/\s+/g, " ").trim();
    }

    // fusha virtuale: emri i plotë → emër + mbiemër
    if (entityKey === "farmers" && values.full_name && !values.first_name) {
      const sp = splitName(values.full_name);
      values.first_name = sp.first_name;
      values.last_name = values.last_name || sp.last_name;
    }
    delete values.full_name;

    // fusha të detyrueshme
    const missing = entity.fields.filter((f) => f.req && !String(values[f.key] ?? "").trim());
    if (missing.length) {
      errors.push({ line, message: `Mungon: ${missing.map((f) => f.label).join(", ")}` });
      return;
    }

    // lidhjet
    if (entityKey === "farmers") {
      const z = resolveZone(ctx, values.zone_code);
      if (values.zone_code && !z) warnings.push(`Zona «${values.zone_code}» nuk u gjet — fermeri u ruajt pa zonë`);
      values.zone_code = z ? z.code : "";
    }
    if (entityKey === "plots") {
      const z = resolveZone(ctx, values.zone_code);
      if (values.zone_code && !z) warnings.push(`Zona «${values.zone_code}» nuk u gjet`);
      values.zone_id = z ? z.id : null;
      delete values.zone_code;
      const f = resolveFarmer(ctx, values.farmer_ref);
      if (values.farmer_ref && !f) warnings.push(`Fermeri «${values.farmer_ref}» nuk u gjet — parcela u ruajt pa fermer`);
      values.farmer_id = f ? f.id : null;
      delete values.farmer_ref;
      if (values.lat !== null && (values.lat < -90 || values.lat > 90)) { warnings.push("Gjerësia jashtë intervalit — u hoq"); values.lat = null; }
      if (values.lng !== null && (values.lng < -180 || values.lng > 180)) { warnings.push("Gjatësia jashtë intervalit — u hoq"); values.lng = null; }
    }
    for (const k of Object.keys(values)) {
      if (values[k] !== null) continue;
      // në parcela zone_id/farmer_id mbeten null (që përditësimi t'i pastrojë)
      if (entityKey === "plots" && (k === "zone_id" || k === "farmer_id")) continue;
      delete values[k];
    }

    const idKey = identityOf(values);
    if (!idKey) { errors.push({ line, message: "Rreshti s'ka kod as emër" }); return; }
    if (seen.has(idKey)) {
      errors.push({ line, message: `Përsëritet me rreshtin ${seen.get(idKey)} të skedarit` });
      return;
    }
    seen.set(idKey, line);

    const existing = existingFor(values);
    if (existing && mode === "skip") {
      ready.push({ line, values, id: existing.id, action: "skip", warnings });
      return;
    }
    ready.push({ line, values, id: existing ? existing.id : null, action: existing ? "update" : "create", warnings });
  });

  const counts = { total: rows.length, create: 0, update: 0, skip: 0, error: errors.length };
  for (const r of ready) counts[r.action]++;
  return { ready, errors, counts };
}

// ------------------------------------------------------------------ shabllonet
