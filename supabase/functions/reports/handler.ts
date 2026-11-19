// Gjeneron raportin nga të dhënat e Supabase (me lejet e përdoruesit, pra RLS vlen) dhe e kthen si Excel ose PDF.
import { buildXlsx } from "./xlsx.ts";
import { buildPdf } from "./pdf.ts";
import { farmerReport, growersReport, inputsReport, lotSheetReport, plotsReport, summaryReport, tasksReport, traceReport } from "./defs.ts";
import type { Report } from "./types.ts";

// Pjesa e klientit Supabase që përdorim (lehtëson testimin)
export interface Sb { from(table: string): any }

export interface Req { type: "summary" | "lot" | "farmer" | "growers" | "trace" | "plots" | "inputs" | "tasks"; format: "xlsx" | "pdf"; company_id: number; year?: number; lot_code?: string; farmer_id?: number }
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
  if (r.type === "trace") {
    if (!r.lot_code) throw new ReportError("Mungon kodi i lotit");
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const [s] = await q(sb.from("lot_summary").select("product_id,product,lot_code").eq("company_id", cid).eq("lot_code", r.lot_code));
    if (!s) throw new ReportError("Loti nuk u gjet", 404);
    const purchases = await q(sb.from("purchases").select("date,qty_fresh,qty_dry,amount,farmers(first_name,last_name),zones(code)")
      .eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const moves = await q(sb.from("stock_moves").select("date,kind,qty_in,qty_out,counterparty").eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const samples = await q(sb.from("samples").select("date,code,result,customers(name),shipments(tracking_no)").eq("company_id", cid).eq("code", r.lot_code).order("date"));
    const inputs = await q(sb.from("inputs").select("date,category,description,amount").eq("company_id", cid).eq("lot_code", r.lot_code).order("date"));
    const y = 2000 + Number(r.lot_code.slice(-2));
    return traceReport({
      company: co.name, product: s.product, lot: r.lot_code, year: y,
      purchases: purchases.map((p: any) => ({ date: p.date, farmer_name: `${p.farmers?.first_name ?? ""} ${p.farmers?.last_name ?? ""}`.trim(), zone_code: p.zones?.code ?? "", qty_fresh: p.qty_fresh, qty_dry: p.qty_dry, amount: p.amount })),
      moves, samples: samples.map((x: any) => ({ date: x.date, customer: x.customers?.name ?? "", code: x.code, tracking: x.shipments?.tracking_no ?? "", result: x.result ?? "" })),
      inputs,
    });
  }
  if (r.type === "plots") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const rows = await q(sb.from("plot_summary").select("name,code,area_ha,farmer,cultivations,tasks_open,observations_open,inputs_cost").eq("company_id", cid).order("name"));
    return plotsReport(co.name, year, rows);
  }
  if (r.type === "inputs") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const all = await q(sb.from("inputs").select("date,category,description,qty,unit,amount,supplier,plots(name)").eq("company_id", cid).order("date").order("id"));
    const rows = all.filter((x: any) => String(x.date ?? "").startsWith(String(year)));
    return inputsReport(co.name, year, rows.map((x: any) => ({ ...x, plot: x.plots?.name ?? "" })));
  }
  if (r.type === "tasks") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const rows = await q(sb.from("tasks").select("title,type,due_date,status,priority,completed_at,plots(name),farmers!tasks_assignee_farmer_id_fkey(first_name,last_name)").eq("company_id", cid).order("due_date"));
    return tasksReport(co.name, rows.map((x: any) => ({
      title: x.title, plot: x.plots?.name ?? "", type: x.type, due_date: x.due_date, status: x.status, priority: x.priority,
      completed_at: x.completed_at ?? null,
      assignee: x.farmers ? `${x.farmers.first_name} ${x.farmers.last_name}`.trim() : "",
    })));
  }
  throw new ReportError("Lloji i raportit nuk njihet");
}

export async function generate(sb: Sb, r: Req) {
  if (r.format !== "xlsx" && r.format !== "pdf") throw new ReportError("Formati duhet të jetë xlsx ose pdf");
  const rep = await makeReport(sb, r);
  const bytes = r.format === "xlsx" ? await buildXlsx(rep) : await buildPdf(rep);
  return { bytes, filename: `${rep.name}.${r.format}`, mime: MIME[r.format] };
}
