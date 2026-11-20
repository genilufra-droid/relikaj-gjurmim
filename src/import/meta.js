// Përshkrimi i fushave për shabllonin e Excel-it: shembull, shënim dhe gjerësi kolone.
export const FIELD_META = {
  zones: {
    code: { ex: "W01", w: 14, note: "Kod unik i zonës (shkronja + numra)." },
    name: { ex: "Tepelenë", w: 24, note: "Fshati ose krahina e zonës." },
    fair_wild: { ex: "PO", w: 16, note: "PO nëse zona përfshin djerr ose pyll të egër." },
    region: { ex: "Gjirokastër", w: 18, note: "Qarku ose rrethi." },
    collection_point: { ex: "Depo Tepelenë", w: 22, note: "Ku dorëzohet produkti." },
    collector_name: { ex: "Ilir Koçi", w: 22, note: "Grumbulluesi përgjegjës i zonës." },
    note: { ex: "", w: 28, note: "Shënim i lirë." },
  },
  farmers: {
    full_name: { ex: "Ilir Koçi", w: 24, note: "Nëse nuk i ndani emrin dhe mbiemrin, plotësoni vetëm këtë kolonë." },
    first_name: { ex: "Ilir", w: 16, note: "Emri." },
    last_name: { ex: "Koçi", w: 18, note: "Mbiemri." },
    phone: { ex: "069 12 34 567", w: 18, note: "Telefoni i kontaktit." },
    id_number: { ex: "K12345678", w: 18, note: "Numri i kartës — identifikues unik i fermerit." },
    zone_code: { ex: "W01", w: 14, note: "Duhet të ekzistojë te fleta «Zonat»." },
    address: { ex: "Tepelenë", w: 20, note: "Adresa ose fshati." },
    family_size: { ex: 4, w: 16, note: "Sa anëtarë ka familja." },
    group_name: { ex: "Grupi 1", w: 16, note: "Grupi i grumbullimit." },
    note: { ex: "", w: 28, note: "Shënim i lirë." },
  },
  plots: {
    name: { ex: "Parcela 1", w: 26, note: "Emri me të cilin e njihni parcelën." },
    code: { ex: "D01", w: 14, note: "Kod unik i parcelës." },
    area_ha: { ex: 2.5, w: 16, note: "Sipërfaqja në hektarë (pranon 2,5 ose 2.5)." },
    zone_code: { ex: "W01", w: 14, note: "Kodi i zonës ku ndodhet parcela." },
    farmer_ref: { ex: "Ilir Koçi", w: 24, note: "Emri i plotë ose numri i kartës së fermerit." },
    lat: { ex: 40.296, w: 14, min: -90, max: 90, note: "Gjerësia gjeografike (opsionale), -90 … 90." },
    lng: { ex: 20.019, w: 14, min: -180, max: 180, note: "Gjatësia gjeografike (opsionale), -180 … 180." },
    ownership: { ex: "ime", w: 14, note: "ime / qira / djerr." },
    status: { ex: "në prodhim", w: 16, note: "në prodhim / djerr / pushim." },
    soil_type: { ex: "argjilore", w: 16, note: "Lloji i tokës." },
    altitude: { ex: 320, w: 14, note: "Lartësia mbi detin, në metra." },
    organic: { ex: "PO", w: 14, note: "PO nëse parcela është organike." },
    growing: { ex: "arë", w: 14, note: "arë ose serë." },
    irrigation: { ex: "pikëz", w: 16, note: "pikëz / sprinkler / hulli / pa ujitje." },
    note: { ex: "", w: 28, note: "Shënim i lirë." },
  },
  products: {
    name: { ex: "Ferrë e zezë", w: 26, note: "Emri i produktit që grumbullohet." },
    code: { ex: "115", w: 14, note: "Kod unik i produktit." },
    latin: { ex: "Rubus fruticosus", w: 26, note: "Emri shkencor (opsional)." },
    part: { ex: "frut", w: 18, note: "Pjesa e grumbulluar: frut, gjethe, lule, rrënjë." },
  },
};

export const ENUM_LISTS = {
  growing: ["arë", "serë"],
  irrigation: ["pikëz", "sprinkler", "hulli", "pa ujitje"],
  ownership: ["ime", "qira", "djerr"],
  status: ["në prodhim", "djerr", "pushim"],
  pojo: ["PO", "JO"],
};

// Kolona e listës përkatëse në fletën e fshehur «Listat» (A, B, C, ...)
export const LIST_COL = { growing: "A", irrigation: "B", ownership: "C", status: "D", pojo: "E" };

export const listFor = (field) => {
  if (field.kind === "bool") return "pojo";
  if (field.kind === "enum") return field.options;
  return null;
};

export const SHEET_NAME = { zones: "Zonat", farmers: "Fermerët", plots: "Parcelat", products: "Produktet" };
