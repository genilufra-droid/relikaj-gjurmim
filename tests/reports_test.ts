import { buildXlsx } from "../supabase/functions/reports/xlsx.ts";
import { buildPdf } from "../supabase/functions/reports/pdf.ts";
import { summaryReport, lotSheetReport, farmerReport, growersReport, traceReport } from "../supabase/functions/reports/defs.ts";
const out = process.argv[2] || "/var/tmp/rep";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(out, { recursive: true });
const reps = [
  summaryReport("BioBes Mersin Sinani", 2026, [
    { lot_code: "W010F/1a-I-115-26", product: "Mjedër", d_from: "2026-06-06", d_to: "2026-07-20", fresh: 10925, dry: 3570, stock: 0, delivered: 3570, delivered_date: "2026-07-21", exported: 3570, export_date: "2026-07-31", export_to: "Warland", biobes_stock: 0 },
    { lot_code: "W010/2-118-26", product: "Mengjerishte", d_from: "2026-02-12", d_to: "2026-05-21", fresh: 17160, dry: 5720, stock: 5720, delivered: 0, delivered_date: null, exported: 0, export_date: null, export_to: null, biobes_stock: 0 },
  ]),
  lotSheetReport({ latin: "Taraxacum officinalis", product: "Rrenje qumeshtore", lot: "W01F/1a-I-40-26", year: 2026,
    purchases: Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i % 28 + 1).padStart(2, "0")}`, farmer_name: i % 2 ? "Agron Kaci" : "Mersin Sina", zone_code: "W01F/1a", qty_fresh: 232 + i, qty_dry: 52 + i, product_name: "Rrenje qumeshtore", price: 800, amount: (52 + i) * 800 })),
    moves: [{ date: "2026-11-08", kind: "dorezim", qty_out: 3176, qty_in: 0 }] }),
  farmerReport("Jace Terpollari", [{ lot_code: "x", zone_code: "W01F/2a", product_name: "Mjeder", d_from: "2025-06-07", d_to: "2025-09-22", qty_fresh: 10127, qty_dry: 3383 }]),
  growersReport(2026, [
    { group_name: "GRUPI I", zone_code: "W01/1a", first_name: "MERSIN", last_name: "SINANI", address: "Koprencke", family_size: 4, id_number: "G50307002C" },
    { group_name: "GRUPI I", zone_code: "W01/1a", first_name: "AGRON", last_name: "KACI", address: "Koprencke", family_size: 5, id_number: "G80317002J" },
    { group_name: "GRUPI II", zone_code: "W01/1b", first_name: "JAKE", last_name: "MEMA", address: "Çorovodë", family_size: 5, id_number: "H11005103T" }]),
  traceReport({
    company: "BioBes Mersin Sinani", product: "Mjedër", lot: "W010F/1a-I-115-26", year: 2026,
    purchases: [
      { date: "2026-06-06", farmer_name: "Mersin Sinani", zone_code: "W010F/1a", qty_fresh: 500, qty_dry: 163, amount: 130400 },
      { date: "2026-06-14", farmer_name: "Agron Kaci", zone_code: "W010F/1a", qty_fresh: 300, qty_dry: 98, amount: 78400 },
    ],
    moves: [
      { date: "2026-06-20", kind: "dorezim", qty_in: 0, qty_out: 261, counterparty: "BioBes" },
      { date: "2026-07-31", kind: "eksport", qty_in: 0, qty_out: 261, counterparty: "Warland" },
    ],
    samples: [{ date: "2026-07-02", customer: "Warland", code: "W010F/1a-I-115-26", tracking: "DHL-123456", result: "Pastërtia 99.2%" }],
    inputs: [{ date: "2026-03-02", category: "fert", description: "Pleh organik", amount: 25000 }],
  }),
];
for (const r of reps) {
  writeFileSync(`${out}/${r.name}.xlsx`, await buildXlsx(r));
  writeFileSync(`${out}/${r.name}.pdf`, await buildPdf(r));
  console.log("ok", r.name);
}
