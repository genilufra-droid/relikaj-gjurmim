import { generate } from "../supabase/functions/reports/handler.ts";
import { mkdirSync, writeFileSync } from "node:fs";
const T: Record<string, any[]> = {
  companies: [{ id: 1, name: "BioBes" }],
  products: [{ id: 1, latin: "Rubus idaeus" }],
  lot_summary: [{ company_id: 1, year: 2026, product_id: 1, product: "Mjedër", lot_code: "W010F/1a-I-115-26", d_from: "2026-06-06", d_to: "2026-07-20", fresh: 100, dry: 30, stock: 0, delivered: 30, delivered_date: "2026-07-21", exported: 30, export_date: "2026-07-31", export_to: "Warland", biobes_stock: 0 }],
  purchases: [
    { company_id: 1, farmer_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", date: "2026-06-06", qty_fresh: 60, qty_dry: 20, price: 100, amount: 2000, farmers: { first_name: "Mersin", last_name: "Sinani" }, zones: { code: "W010F/1a" }, products: { name: "Mjedër" } },
    { company_id: 1, farmer_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", date: "2026-06-09", qty_fresh: 40, qty_dry: 10, price: 100, amount: 1000, farmers: { first_name: "Mersin", last_name: "Sinani" }, zones: { code: "W010F/1a" }, products: { name: "Mjedër" } }],
  stock_moves: [{ company_id: 1, lot_code: "W010F/1a-I-115-26", date: "2026-07-21", kind: "dorezim", qty_in: 0, qty_out: 30 }],
  farmers: [{ id: 1, company_id: 1, active: true, first_name: "Mersin", last_name: "Sinani", group_name: "GRUPI I", zone_code: "W01/1a", address: "Koprencke", family_size: 4, id_number: "" }],
  samples: [{ company_id: 1, code: "W010F/1a-I-115-26", date: "2026-07-02", result: "Pastërtia 99.2%", customers: { name: "Warland" }, shipments: { tracking_no: "DHL-123456" } }],
  inputs: [{ company_id: 1, lot_code: "W010F/1a-I-115-26", date: "2026-03-02", category: "fert", description: "Pleh organik", amount: 25000 }],
};
const fake = { from(t: string) {
  let rows = [...(T[t] ?? [])];
  const c: any = { select: () => c, eq: (k: string, v: any) => { rows = rows.filter((r) => r[k] === v); return c; }, order: (k: string) => { rows.sort((a, b) => String(a[k]).localeCompare(String(b[k]))); return c; },
    then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej) };
  return c;
} };
mkdirSync("/var/tmp/rep2", { recursive: true });
for (const type of ["summary", "lot", "farmer", "growers", "trace"] as const) for (const format of ["xlsx", "pdf"] as const) {
  const r = await generate(fake, { type, format, company_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", farmer_id: 1 });
  writeFileSync(`/var/tmp/rep2/${r.filename}`, r.bytes);
  console.log(type, format, r.filename, r.bytes.length);
}
try { await generate(fake, { type: "lot", format: "pdf", company_id: 1, lot_code: "NUK-EKZISTON" }); } catch (e: any) { console.log("gabim i pritur:", e.message, e.status); }
