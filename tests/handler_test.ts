import { generate } from "../supabase/functions/reports/handler.ts";
import { mkdirSync, writeFileSync } from "node:fs";
const T: Record<string, any[]> = {
  companies: [{ id: 1, name: "BioBes" }],
  products: [{ id: 1, latin: "Rubus idaeus" }],
  lot_summary: [{ company_id: 1, year: 2026, product_id: 1, product: "Mjedër", lot_code: "W010F/1a-I-115-26", d_from: "2026-06-06", d_to: "2026-07-20", fresh: 100, dry: 30, stock: 0, delivered: 30, delivered_date: "2026-07-21", exported: 30, export_date: "2026-07-31", export_to: "Warland", biobes_stock: 0 }],
  purchases: [
    { company_id: 1, farmer_id: 1, plot_id: 1, product_id: 1, zone_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", date: "2026-06-06", qty_fresh: 60, qty_dry: 20, price: 100, amount: 2000, farmers: { first_name: "Mersin", last_name: "Sinani" }, zones: { code: "W010F/1a", collector_name: "Ilir Koçi" }, plots: { name: "Parcela 1", code: "K01" }, products: { name: "Mjedër" } },
    { company_id: 1, farmer_id: 1, plot_id: 1, product_id: 1, zone_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", date: "2026-06-09", qty_fresh: 40, qty_dry: 10, price: 100, amount: 1000, farmers: { first_name: "Mersin", last_name: "Sinani" }, zones: { code: "W010F/1a", collector_name: "Ilir Koçi" }, plots: { name: "Parcela 1", code: "K01" }, products: { name: "Mjedër" } }],
  stock_moves: [{ company_id: 1, lot_code: "W010F/1a-I-115-26", date: "2026-07-21", kind: "dorezim", qty_in: 0, qty_out: 30, counterparty: "BioBes", document_no: "DF-12", customers: null }],
  farmers: [{ id: 1, company_id: 1, active: true, first_name: "Mersin", last_name: "Sinani", group_name: "GRUPI I", zone_code: "W01/1a", address: "Koprencke", family_size: 4, id_number: "" }],
  samples: [{ company_id: 1, code: "W010F/1a-I-115-26", date: "2026-07-02", point: "center", lab: "AlbInspekt", moisture: 10.8, purity: 99.2, passed: true, result: "Pastërtia 99.2%", customers: { name: "Warland" }, shipments: { tracking_no: "DHL-123456" } }],
  batch_summary: [{ company_id: 1, code: "B-26-01", date: "2026-06-21", method: "drying", input_qty: 30, output_qty: 28, yield_pct: 93.3, source_lot: "W010F/1a-I-115-26", product: "Mjedër" }],
  zone_summary: [{ company_id: 1, zone_id: 1, code: "W010F/1a", name: "Tepelenë", collector_name: "Ilir Koçi", collection_point: "Pika Tepelenë", region: "Tepelenë", plots: 42, farmers: 31, area_ha: 78.5, fresh_year: 52340, dry_year: 17420, amount_year: 13936000 }],
  inputs: [{ company_id: 1, lot_code: "W010F/1a-I-115-26", date: "2026-03-02", category: "fert", description: "Pleh organik", amount: 25000 }],
  payments: [
    { company_id: 1, date: "2026-06-20", amount: 2000, method: "kesh", paid_by: "collector", receipt_no: "K-01", note: "", farmer_id: 1, purchase_id: 1, lease_id: null, farmers: { first_name: "Mersin", last_name: "Sinani" }, purchases: { lot_code: "W010F/1a-I-115-26" } },
    { company_id: 1, date: "2026-10-01", amount: 120000, method: "bankë", paid_by: "company", receipt_no: "Q-09", note: "Qira 2026", farmer_id: null, purchase_id: null, lease_id: 1, farmers: null, purchases: null }],
  purchase_payments: [
    { company_id: 1, purchase_id: 1, date: "2026-06-06", lot_code: "W010F/1a-I-115-26", farmer: "Mersin Sinani", plot: "Parcela 1", qty_dry: 20, amount: 2000, paid_now: 0, remaining: 2000 },
    { company_id: 1, purchase_id: 2, date: "2026-06-09", lot_code: "W010F/1a-I-115-26", farmer: "Mersin Sinani", plot: "Parcela 1", qty_dry: 10, amount: 1000, paid_now: 1000, remaining: 0 }],
  land_operations: [{ company_id: 1, plot_id: 1, date: "2026-02-10", kind: "plow", contractor: "Traktor Ilir", machine: "90 kf", hours: 4, cost: 24000, note: "", plots: { name: "Parcela 1", code: "K01" } }],
  applications: [{ company_id: 1, plot_id: 1, date: "2026-03-05", kind: "fert", product_name: "Pleh organik", dose: 500, unit: "kg", area_ha: 2.5, phi_days: 0, cost: 25000, organic_ok: true, note: "", plots: { name: "Parcela 1", code: "K01" } }],
  tasks: [{ company_id: 1, title: "Ujitja e parcelës 1", plot: "Parcela 1", type: "irrigate", assignee: "Mersin Sinani", due_date: "2026-06-05", status: "open", priority: "normal", completed_at: null, plots: { name: "Parcela 1" } }],
  leases: [{ company_id: 1, plot_id: 1, owner_name: "Pronari X", start_date: "2026-01-01", end_date: "2026-12-15", status: "active", rent_amount: 120000, plots: { name: "Parcela 1", code: "K01" } }],
  documents: [{ id: 1, company_id: 1, plot_id: 1 }],
  plots: [{ id: 1, company_id: 1, name: "Parcela 1", code: "K01", area_ha: 2.5, ownership: "leased", status: "active", altitude: 450, organic: true, lat: 41.3, lng: 19.4, farmers: { first_name: "Mersin", last_name: "Sinani" }, zones: { code: "W010F/1a", collector_name: "Ilir Koçi", collection_point: "Pika Tepelenë" } }],
};
const fake = { from(t: string) {
  let rows = [...(T[t] ?? [])];
  const c: any = { select: () => c, eq: (k: string, v: any) => { rows = rows.filter((r) => r[k] === v); return c; }, order: (k: string) => { rows.sort((a, b) => String(a[k]).localeCompare(String(b[k]))); return c; },
    then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej) };
  return c;
} };
mkdirSync("/var/tmp/rep2", { recursive: true });
for (const type of ["summary", "lot", "farmer", "growers", "trace", "plots", "inputs", "tasks", "zones", "purchases", "payments", "samples", "operations", "reminders", "plot"] as const) for (const format of ["xlsx", "pdf"] as const) {
  const r = await generate(fake, { type, format, company_id: 1, year: 2026, lot_code: "W010F/1a-I-115-26", farmer_id: 1, plot_id: 1, from: "2026-01-01", to: "2026-12-31" });
  writeFileSync(`/var/tmp/rep2/${r.filename}`, r.bytes);
  console.log(type, format, r.filename, r.bytes.length);
}
try { await generate(fake, { type: "lot", format: "pdf", company_id: 1, lot_code: "NUK-EKZISTON" }); } catch (e: any) { console.log("gabim i pritur:", e.message, e.status); }
