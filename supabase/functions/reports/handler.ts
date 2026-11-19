// Gjeneron raportin nga të dhënat e Supabase (me lejet e përdoruesit, pra RLS vlen) dhe e kthen si Excel ose PDF.
import { buildXlsx } from "./xlsx.ts";
import { buildPdf } from "./pdf.ts";
import { farmerReport, growersReport, lotSheetReport, summaryReport } from "./defs.ts";
import type { Report } from "./types.ts";

// Pjesa e klientit Supabase që përdorim (lehtëson testimin)
export interface Sb { from(table: string): any }

export interface Req { type: "summary" | "lot" | "farmer" | "growers"; format: "xlsx" | "pdf"; company_id: number; year?: number; lot_code?: string; farmer_id?: number }
export class ReportError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf" };

async function q<T = any>(p: any): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new ReportError(error.message, 400);
  return data ?? [];
}

export async function makeReport(sb: Sb, r: Req): Promise<Report> {
  const cid = Number(r.company_id);
  if (!cid) throw new ReportError("Zgjidhni kompaninë");
  const year = Number(r.year) || new Date().getFullYear();
  if (r.type === "summary") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    const rows = await q(sb.from("lot_summary").select("*").eq("company_id", cid).eq("year", year).order("product").order("lot_code"));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    return summaryReport(co.name, year, rows);
  }
  if (r.type === "lot") {
    if (!r.lot_code) throw new ReportError("Mungon kodi i lotit");
    const [s] = await q(sb.from("lot_summary").select("product_id,product,lot_code").eq("company_id", cid).eq("lot_code", r.lot_code));
    if (!s) throw new ReportError("Loti nuk u gjet", 404);
    const [prod] = await q(sb.from("products").select("latin").eq("id", s.product_id));
    const purchases = await q(sb.from("purchases").select("date,qty_fresh,qty_dry,price,amount,farmers(first_name,last_name),zones(code),products(name)")
      .eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const moves = await q(sb.from("stock_moves").select("date,kind,qty_in,qty_out").eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const y = 2000 + Number(r.lot_code.slice(-2));
    return lotSheetReport({
      latin: prod?.latin ?? "", product: s.product, lot: r.lot_code, year: y,
      purchases: purchases.map((p: any) => ({ date: p.date, farmer_name: `${p.farmers?.first_name ?? ""} ${p.farmers?.last_name ?? ""}`.trim(), zone_code: p.zones?.code ?? "", qty_fresh: p.qty_fresh, qty_dry: p.qty_dry, product_name: p.products?.name ?? "", price: p.price, amount: p.amount })),
      moves,
    });
  }
  if (r.type === "farmer") {
    if (!r.farmer_id) throw new ReportError("Zgjidhni fermerin");
    const [f] = await q(sb.from("farmers").select("first_name,last_name").eq("company_id", cid).eq("id", r.farmer_id));
    if (!f) throw new ReportError("Fermeri nuk u gjet", 404);
    const rows = await q(sb.from("purchases").select("date,lot_code,qty_fresh,qty_dry,zones(code),products(name)").eq("company_id", cid).eq("farmer_id", r.farmer_id).eq("year", year).order("date"));
    const byLot = new Map<string, any>();
    for (const p of rows) {
      const k = p.lot_code, cur = byLot.get(k);
      if (!cur) byLot.set(k, { lot_code: k, zone_code: p.zones?.code ?? "", product_name: p.products?.name ?? "", d_from: p.date, d_to: p.date, qty_fresh: +p.qty_fresh, qty_dry: +p.qty_dry });
      else { cur.d_to = p.date > cur.d_to ? p.date : cur.d_to; cur.d_from = p.date < cur.d_from ? p.date : cur.d_from; cur.qty_fresh += +p.qty_fresh; cur.qty_dry += +p.qty_dry; }
    }
    return farmerReport(`${f.first_name} ${f.last_name}`.trim(), [...byLot.values()]);
  }
  if (r.type === "growers") {
    const rows = await q(sb.from("farmers").select("group_name,zone_code,first_name,last_name,address,family_size,id_number").eq("company_id", cid).eq("active", true));
    return growersReport(year, rows);
  }
  throw new ReportError("Lloji i raportit nuk njihet");
}

export async function generate(sb: Sb, r: Req) {
  if (r.format !== "xlsx" && r.format !== "pdf") throw new ReportError("Formati duhet të jetë xlsx ose pdf");
  const rep = await makeReport(sb, r);
  const bytes = r.format === "xlsx" ? await buildXlsx(rep) : await buildPdf(rep);
  return { bytes, filename: `${rep.name}.${r.format}`, mime: MIME[r.format] };
}
