// Gjeneron raportin nga të dhënat e Supabase (me lejet e përdoruesit, pra RLS vlen) dhe e kthen si Excel ose PDF.
import { buildXlsx } from "./xlsx.ts";
import { buildPdf } from "./pdf.ts";
import { farmerReport, growersReport, inputsReport, lotSheetReport, plotReport, plotsReport, summaryReport, tableReport, tasksReport, traceReport, zonesReport } from "./defs.ts";
import { dhlReplica, fedexReplica, kultivimeReplica, labLedgerReplica, protocolReplica, rotationReplica } from "./replicas.ts";
import type { Report } from "./types.ts";

// Pjesa e klientit Supabase që përdorim (lehtëson testimin)
export interface Sb { from(table: string): any }

export interface Req {
  type: "summary" | "lot" | "farmer" | "growers" | "trace" | "plots" | "inputs" | "tasks" | "zones"
    | "purchases" | "payments" | "samples" | "operations" | "reminders" | "plot" | "cultivation" | "rotation" | "shipments" | "protocol" | "lab_ledger";
  format: "xlsx" | "pdf"; company_id: number; year?: number; lot_code?: string; farmer_id?: number;
  from?: string; to?: string; product_id?: number; zone_id?: number; plot_id?: number; status?: string; carrier?: string; account?: string;
}
export class ReportError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf" };

async function q<T = any>(p: any): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new ReportError(error.message, 400);
  return data ?? [];
}

const inRange = (d: unknown, from?: string, to?: string) => {
  const s = String(d ?? "");
  return (!from || s >= from) && (!to || s <= to);
};
const periodLabel = (r: Req) => (r.from || r.to)
  ? `${r.from ? dShort(r.from) : "fillimi"} – ${r.to ? dShort(r.to) : "sot"}`
  : `Viti ${Number(r.year) || new Date().getFullYear()}`;
const dDots2 = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const dDots = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}.${iso.slice(0, 4)}`;
const dShort = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const POINT_L: Record<string, string> = { plot: "Në parcelë", center: "Në qendër", warehouse: "Në magazinë" };
const METHOD_L: Record<string, string> = { drying: "Tharje", cleaning: "Pastrim", cutting: "Prerje", grading: "Klasifikim", oil: "Nxjerrje vaji", packing: "Paketim", other: "Tjetër" };
const OP_L: Record<string, string> = { plow: "Plugim", till: "Frezim", harrow: "Lesë (disk)", subsoil: "Mihje", level: "Nivelim", mow: "Kositje", haul: "Transport", other: "Tjetër" };
const APP_L: Record<string, string> = { fert: "Pleh", pesticide: "Pesticid", foliar: "Foliar", irrigation: "Ujitje", biological: "Biologjik", other: "Tjetër" };
const fname = (f: any) => `${f?.first_name ?? ""} ${f?.last_name ?? ""}`.trim();

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
    const purchases = await q(sb.from("purchases").select("date,qty_fresh,qty_dry,amount,farmers(first_name,last_name),zones(code,collector_name),plots(name,code)")
      .eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const moves = await q(sb.from("stock_moves").select("date,kind,qty_in,qty_out,counterparty,document_no,customers(name)")
      .eq("company_id", cid).eq("lot_code", r.lot_code).order("date").order("id"));
    const samples = await q(sb.from("samples").select("date,point,lab,moisture,purity,passed,result,customers(name)")
      .eq("company_id", cid).eq("code", r.lot_code).order("date"));
    const batches = await q(sb.from("batch_summary").select("code,date,method,input_qty,output_qty,yield_pct,source_lot")
      .eq("company_id", cid).eq("source_lot", r.lot_code).order("date"));
    const inputs = await q(sb.from("inputs").select("date,category,description,amount").eq("company_id", cid).eq("lot_code", r.lot_code).order("date"));
    const y = 2000 + Number(r.lot_code.slice(-2));
    const POINT = POINT_L, METHOD = METHOD_L;
    return traceReport({
      company: co.name, product: s.product, lot: r.lot_code, year: y,
      purchases: purchases.map((p: any) => ({
        date: p.date, farmer_name: `${p.farmers?.first_name ?? ""} ${p.farmers?.last_name ?? ""}`.trim(),
        zone_code: p.zones?.code ?? "", plot: p.plots?.code || p.plots?.name || "",
        collector: p.zones?.collector_name ?? "", qty_fresh: p.qty_fresh, qty_dry: p.qty_dry, amount: p.amount,
      })),
      moves: moves.map((m: any) => ({ ...m, customer: m.customers?.name ?? "", document: m.document_no ?? "" })),
      samples: samples.map((x: any) => ({
        date: x.date, point: POINT[x.point] ?? x.point ?? "", customer: x.customers?.name ?? "", lab: x.lab ?? "",
        moisture: x.moisture, purity: x.purity, passed: x.passed, result: x.result ?? "",
      })),
      batches: batches.map((b: any) => ({ ...b, method: METHOD[b.method] ?? b.method })),
      inputs,
    });
  }
  if (r.type === "purchases") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const all = await q(sb.from("purchases")
      .select("date,lot_code,qty_fresh,qty_dry,price,amount,paid,farmer_id,product_id,zone_id,plot_id,farmers(first_name,last_name),products(name),plots(name,code),zones(code,collector_name)")
      .eq("company_id", cid).order("date"));
    const rows = all.filter((x: any) =>
      inRange(x.date, r.from, r.to) && (!r.product_id || x.product_id === r.product_id) &&
      (!r.zone_id || x.zone_id === r.zone_id) && (!r.farmer_id || x.farmer_id === r.farmer_id) &&
      (!r.plot_id || x.plot_id === r.plot_id));
    const total = (k: string) => rows.reduce((a: number, x: any) => a + Number(x[k] ?? 0), 0);
    return tableReport({
      name: `Blerjet_${r.from || r.year || "te_gjitha"}`, sheet: "BLERJET", title: `${co.name} — blerjet nga fermerët`,
      subtitle: `${periodLabel(r)} · ${rows.length} blerje · ${total("qty_dry").toFixed(0)} kg thatë`,
      cols: [{ label: "Data", width: 12 }, { label: "Loti", width: 21 }, { label: "Produkti", width: 18 }, { label: "Fermeri", width: 18 },
        { label: "Parcela", width: 14 }, { label: "Grumbulluesi", width: 16 }, { label: "Njomë (kg)", width: 12, align: "r" },
        { label: "Thatë (kg)", width: 12, align: "r" }, { label: "Çmimi", width: 9, align: "r" }, { label: "Shuma (lekë)", width: 14, align: "r" },
        { label: "Paguar", width: 14, align: "r" }, { label: "Mbetje", width: 13, align: "r" }],
      rows: rows.map((x: any) => [dShort(x.date), x.lot_code, x.products?.name ?? "", fname(x.farmers), x.plots?.code || x.plots?.name || "", x.zones?.collector_name ?? "",
        Number(x.qty_fresh ?? 0), Number(x.qty_dry ?? 0), Number(x.price ?? 0), Number(x.amount ?? 0), Number(x.paid ?? 0), Math.max(0, Number(x.amount ?? 0) - Number(x.paid ?? 0))]),
      totals: ["", "__label__", "", "", "", "", total("qty_fresh"), total("qty_dry"), "", total("amount"), total("paid"), total("amount") - total("paid")],
      totalsLabel: "GJITHSEJ",
    });
  }
  if (r.type === "payments") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const all = await q(sb.from("payments")
      .select("date,amount,method,paid_by,receipt_no,note,farmer_id,purchase_id,lease_id,farmers(first_name,last_name),purchases(lot_code)")
      .eq("company_id", cid).order("date"));
    const rows = all.filter((x: any) => inRange(x.date, r.from, r.to) && (!r.farmer_id || x.farmer_id === r.farmer_id));
    const total = rows.reduce((a: number, x: any) => a + Number(x.amount ?? 0), 0);
    return tableReport({
      name: `Pagesat_${r.from || r.year || "te_gjitha"}`, sheet: "PAGESAT", title: `${co.name} — pagesat`,
      subtitle: `${periodLabel(r)} · ${rows.length} pagesa · gjithsej ${total.toFixed(0)} lekë`,
      cols: [{ label: "Data", width: 12 }, { label: "Fermeri", width: 22 }, { label: "Për çfarë", width: 24 }, { label: "Kush paguan", width: 15 },
        { label: "Mënyra", width: 12 }, { label: "Nr. dokumentit", width: 16 }, { label: "Shuma (lekë)", width: 15, align: "r" }],
      rows: rows.map((x: any) => [dShort(x.date), fname(x.farmers),
        x.purchases?.lot_code ? `Korrje · ${x.purchases.lot_code}` : x.lease_id ? "Qira toke" : (x.note || "Tjetër"),
        x.paid_by === "collector" ? "Grumbulluesi" : "Kompania", x.method || "", x.receipt_no || "", Number(x.amount ?? 0)]),
      totals: ["__label__", "", "", "", "", "", total],
      totalsLabel: "GJITHSEJ",
    });
  }
  if (r.type === "samples") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const all = await q(sb.from("samples")
      .select("date,product_text,code,point,lab,moisture,purity,passed,result,plot_id,plots(name,code),customers(name)")
      .eq("company_id", cid).order("date"));
    const rows = all.filter((x: any) => inRange(x.date, r.from, r.to) && (!r.plot_id || x.plot_id === r.plot_id) &&
      (!r.status || (r.status === "passed" ? x.passed === true : r.status === "failed" ? x.passed === false : x.passed == null)));
    const passed = rows.filter((x: any) => x.passed === true).length, failed = rows.filter((x: any) => x.passed === false).length;
    return tableReport({
      name: `Mostrat_${r.from || r.year || "te_gjitha"}`, sheet: "MOSTRAT", title: `${co.name} — protokolli i mostrave`,
      subtitle: `${periodLabel(r)} · ${rows.length} mostra · ${passed} kaluar · ${failed} refuzuar`,
      cols: [{ label: "Data", width: 12 }, { label: "Produkti", width: 20 }, { label: "Loti", width: 21 }, { label: "Vendi", width: 13 },
        { label: "Parcela", width: 14 }, { label: "Laboratori", width: 15 }, { label: "Lagështi %", width: 10, align: "r" },
        { label: "Pastërti %", width: 10, align: "r" }, { label: "Vendimi", width: 12, align: "c" }, { label: "Rezultati", width: 26 }],
      rows: rows.map((x: any) => [dShort(x.date), x.product_text, x.code, POINT_L[x.point] ?? x.point ?? "",
        x.plots?.code || x.plots?.name || "", x.lab || "", x.moisture ?? "", x.purity ?? "",
        x.passed === true ? "Kaluar" : x.passed === false ? "Refuzuar" : "Në pritje", x.result || ""]),
    });
  }
  if (r.type === "operations") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const [ops, apps] = await Promise.all([
      q(sb.from("land_operations").select("date,kind,contractor,machine,hours,cost,note,plot_id,plots(name,code)").eq("company_id", cid).order("date")),
      q(sb.from("applications").select("date,kind,product_name,dose,unit,area_ha,phi_days,cost,organic_ok,note,plot_id,plots(name,code)").eq("company_id", cid).order("date")),
    ]);
    const rows = [
      ...ops.map((x: any) => ({ date: x.date, plotId: x.plot_id, kind: OP_L[x.kind] ?? x.kind, plot: x.plots?.code || x.plots?.name || "", detail: [x.contractor, x.machine, x.note].filter(Boolean).join(" · "), qty: Number(x.hours ?? 0) ? `${x.hours} orë` : "", cost: Number(x.cost ?? 0) })),
      ...apps.map((x: any) => ({ date: x.date, plotId: x.plot_id, kind: APP_L[x.kind] ?? x.kind, plot: x.plots?.code || x.plots?.name || "", detail: [x.product_name, x.organic_ok ? "organik" : "jo organik", x.phi_days ? `pritje ${x.phi_days} ditë` : ""].filter(Boolean).join(" · "), qty: Number(x.dose ?? 0) ? `${x.dose} ${x.unit || ""}` : "", cost: Number(x.cost ?? 0) })),
    ].filter((x) => inRange(x.date, r.from, r.to) && (!r.plot_id || x.plotId === r.plot_id)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const total = rows.reduce((a, x) => a + x.cost, 0);
    return tableReport({
      name: `Punimet_${r.from || r.year || "te_gjitha"}`, sheet: "PUNA NË TOKË", title: `${co.name} — punimet dhe trajtimet`,
      subtitle: `${periodLabel(r)} · ${rows.length} zëra · kosto ${total.toFixed(0)} lekë`,
      cols: [{ label: "Data", width: 12 }, { label: "Lloji", width: 16 }, { label: "Parcela", width: 16 }, { label: "Detaji", width: 34 },
        { label: "Orë / doza", width: 13 }, { label: "Kosto (lekë)", width: 15, align: "r" }],
      rows: rows.map((x) => [dShort(x.date), x.kind, x.plot, x.detail, x.qty, x.cost]),
      totals: ["__label__", "", "", "", "", total], totalsLabel: "GJITHSEJ",
    });
  }
  if (r.type === "reminders") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
    const [pays, samples, tasks, leases] = await Promise.all([
      q(sb.from("purchase_payments").select("purchase_id,date,lot_code,farmer,plot,remaining").eq("company_id", cid)),
      q(sb.from("samples").select("date,code,product_text,point,passed").eq("company_id", cid)),
      q(sb.from("tasks").select("title,due_date,status,plots(name)").eq("company_id", cid)),
      q(sb.from("leases").select("plot_id,end_date,status,rent_amount,owner_name,plots(name,code)").eq("company_id", cid)),
    ]);
    const dayDiff = (d: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 864e5);
    const items: { cat: string; text: string; due: string; status: string; value: number | string }[] = [];
    for (const p of pays.filter((x: any) => Number(x.remaining ?? 0) > 0))
      items.push({ cat: "Pagesë e papaguar", text: `${p.farmer || "Fermer"} · ${p.plot || ""} · loti ${p.lot_code}`, due: p.date, status: `pritur ${Math.max(0, -dayDiff(p.date))} ditë`, value: Number(p.remaining) });
    for (const s of samples.filter((x: any) => x.passed == null))
      items.push({ cat: "Mostër pa rezultat", text: `${s.product_text || s.code} · ${POINT_L[s.point] ?? s.point ?? ""}`, due: s.date, status: `pritur ${Math.max(0, -dayDiff(s.date))} ditë`, value: "" });
    for (const t of tasks.filter((x: any) => x.status === "open" && String(x.due_date) < today))
      items.push({ cat: "Detyrë e vonuar", text: `${t.title}${t.plots?.name ? ` · ${t.plots.name}` : ""}`, due: t.due_date, status: `vonuar ${Math.abs(dayDiff(t.due_date))} ditë`, value: "" });
    for (const l of leases.filter((x: any) => x.status !== "ended" && x.end_date && String(x.end_date) <= soon && String(x.end_date) >= today))
      items.push({ cat: "Qira që skadon", text: `${l.plots?.code || l.plots?.name || "Parcelë"} · ${l.owner_name || ""}`, due: l.end_date, status: `skadon pas ${dayDiff(l.end_date)} ditë`, value: Number(l.rent_amount ?? 0) });
    items.sort((a, b) => String(a.due).localeCompare(String(b.due)));
    return tableReport({
      name: `Kujtuesit_${today}`, sheet: "KUJTUESIT", title: `${co.name} — kujtuesit (nuk harroj)`,
      subtitle: `Gjendja më ${dShort(today)} · ${items.length} zëra që kërkojnë veprim`,
      cols: [{ label: "Kategoria", width: 20 }, { label: "Përshkrimi", width: 40 }, { label: "Afati", width: 12 },
        { label: "Statusi", width: 17 }, { label: "Vlera (lekë)", width: 13, align: "r" }],
      rows: items.map((i) => [i.cat, i.text, dShort(i.due), i.status, i.value]),
    });
  }
  if (r.type === "plot") {
    if (!r.plot_id) throw new ReportError("Zgjidhni parcelën");
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const [p] = await q(sb.from("plots")
      .select("name,code,area_ha,ownership,status,altitude,organic,lat,lng,farmers(first_name,last_name),zones(code,collector_name,collection_point)")
      .eq("company_id", cid).eq("id", r.plot_id));
    if (!p) throw new ReportError("Parcela nuk u gjet", 404);
    const [ops, apps, purchases, docs] = await Promise.all([
      q(sb.from("land_operations").select("date,kind,contractor,hours,cost,note").eq("company_id", cid).eq("plot_id", r.plot_id).order("date")),
      q(sb.from("applications").select("date,kind,product_name,dose,unit,phi_days,cost,note").eq("company_id", cid).eq("plot_id", r.plot_id).order("date")),
      q(sb.from("purchases").select("date,lot_code,qty_fresh,qty_dry,amount").eq("company_id", cid).eq("plot_id", r.plot_id).order("date")),
      q(sb.from("documents").select("id,plot_id").eq("company_id", cid)),
    ]);
    const activities = [
      ...ops.map((x: any) => ({ date: x.date, kind: OP_L[x.kind] ?? x.kind, detail: x.contractor || "", amount: Number(x.cost ?? 0), note: x.note })),
      ...apps.map((x: any) => ({ date: x.date, kind: APP_L[x.kind] ?? x.kind, detail: [x.product_name, x.dose ? `${x.dose} ${x.unit || ""}` : ""].filter(Boolean).join(" · "), amount: Number(x.cost ?? 0), note: x.note })),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return plotReport({
      company: co.name,
      plot: {
        name: p.name, code: p.code, area_ha: Number(p.area_ha ?? 0), ownership: p.ownership, status: p.status,
        farmer: fname(p.farmers), zone: p.zones?.code ?? "", collector: p.zones?.collector_name ?? "", point: p.zones?.collection_point ?? "",
        altitude: p.altitude, organic: p.organic, lat: p.lat, lng: p.lng,
      },
      activities,
      harvests: purchases.map((x: any) => ({ date: x.date, lot_code: x.lot_code, qty_fresh: Number(x.qty_fresh ?? 0), qty_dry: Number(x.qty_dry ?? 0), amount: Number(x.amount ?? 0) })),
      docs: docs.filter((d: any) => d.plot_id === r.plot_id).length,
    });
  }
  if (r.type === "zones") {
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const rows = await q(sb.from("zone_summary").select("*").eq("company_id", cid).order("code"));
    return zonesReport(co.name, year, rows);
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
  if (r.type === "cultivation") {
    // Si «KULTIVIME 2026 · PERMBLEDHJE»: parcela, produkti, sasia e miratuar, periudha e vjeljes, sasitë e mbledhura, eksporti, stoku
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const cults = await q(sb.from("cultivations").select("plot_id,product_id,expected_yield_kg,sowing_date,expected_harvest,plots(name,code),products(name)").eq("company_id", cid).order("plot_id"));
    const buys = (await q(sb.from("purchases").select("date,lot_code,plot_id,product_id,qty_fresh,qty_dry").eq("company_id", cid).order("date")))
      .filter((x: any) => String(x.date ?? "").startsWith(String(year)));
    const lots = (await q(sb.from("lot_summary").select("lot_code,exported,stock,export_to,export_date").eq("company_id", cid).eq("year", year)));
    const lotBy = new Map<string, any>(lots.map((l: any) => [l.lot_code, l]));
    const cy = cults.filter((c: any) => [c.sowing_date, c.expected_harvest].some((d) => String(d ?? "").startsWith(String(year))) || buys.some((b: any) => b.plot_id === c.plot_id && b.product_id === c.product_id));
    const seen = new Set<string>();
    const rows = cy.map((c: any) => {
      const mine = buys.filter((b: any) => b.plot_id === c.plot_id && b.product_id === c.product_id);
      const codes = [...new Set(mine.map((b: any) => b.lot_code))];
      seen.add(`${c.plot_id}/${c.product_id}`);
      const exp = codes.reduce((a: number, k: string) => a + Number(lotBy.get(k)?.exported ?? 0), 0);
      const stock = codes.reduce((a: number, k: string) => a + Number(lotBy.get(k)?.stock ?? 0), 0);
      const last = codes.map((k: string) => lotBy.get(k)).filter((l: any) => l?.export_to).sort((a: any, b: any) => String(b.export_date).localeCompare(String(a.export_date)))[0];
      return [c.plots?.code || c.plots?.name || "", c.products?.name ?? "", Number(c.expected_yield_kg ?? 0) || null,
        mine.length ? dShort(String(mine[0].date)) : "", mine.length ? dShort(String(mine[mine.length - 1].date)) : "",
        mine.reduce((a: number, b: any) => a + Number(b.qty_fresh ?? 0), 0), mine.reduce((a: number, b: any) => a + Number(b.qty_dry ?? 0), 0),
        exp, stock, last ? `${last.export_to} ${last.export_date ? dShort(last.export_date) : ""}`.trim() : ""];
    });
    return kultivimeReplica([{ year, rows: rows.map((x: any[]) => [x[0], x[1], x[2], x[3], x[4], x[5] || null, x[6] || null, x[7] || null, x[8] || null, x[9] || null, null]),
      inspectedAt: dShort(new Date().toISOString().slice(0, 10)) }]);
  }
  if (r.type === "rotation") {
    // Si «PLAN QARKULLIMI»: çdo parcelë dhe çfarë kultivohet në çdo vit (djerr kur nuk ka kultivim)
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const plots = await q(sb.from("plots").select("id,name,code,area_ha,ownership,status").eq("company_id", cid).order("code"));
    const cults = await q(sb.from("cultivations").select("plot_id,expected_yield_kg,sowing_date,expected_harvest,stage,products(name)").eq("company_id", cid));
    const years = Array.from({ length: 7 }, (_, i) => year - 4 + i);   // si në Excel: 7 vite
    const yearOf = (c: any) => Number(String(c.sowing_date || c.expected_harvest || "").slice(0, 4)) || null;
    const rows = plots.map((p: any) => {
      const cells = years.map((y) => {
        const mine = cults.filter((c: any) => c.plot_id === p.id && yearOf(c) === y);
        if (mine.length) return mine.map((c: any) => `${c.products?.name ?? "?"}${Number(c.expected_yield_kg) ? ` ${Number(c.expected_yield_kg)} kg` : ""}`).join("; ");
        return y <= year && p.status === "fallow" ? "djerr" : "";
      });
      return [p.code || p.name, `${Number(p.area_ha ?? 0)} ha`, ...cells];
    });
    const parent = (p: any) => String(p.code || p.name || "").split("/")[0].trim().toUpperCase();
    const groups = new Map<string, any[]>();
    for (const p of plots) { const k = parent(p); groups.set(k, [...(groups.get(k) ?? []), p]); }
    const out = [...groups.entries()].map(([k, ps]) => {
      const m2 = (p: any) => Math.round(Number(p.area_ha ?? 0) * 10000);
      return { code: k, title: `PARCELA: ${k}   ${ps.length === 1 && ps[0].name && ps[0].name !== ps[0].code ? `EMRI: ${ps[0].name}` : ""}`.trim(), totalM2: ps.reduce((a: number, p: any) => a + m2(p), 0),
        subs: ps.map((p: any) => ({ label: `${p.code || p.name}  ${m2(p)}m2`, byYear: years.map((y) => {
          const mine = cults.filter((c: any) => c.plot_id === p.id && yearOf(c) === y);
          if (mine.length) return mine.map((c: any) => `${c.products?.name ?? "?"}${Number(c.expected_yield_kg) ? ` ${Number(c.expected_yield_kg)} kg` : ""}`).join(", ");
          return y <= year && p.status === "fallow" ? "djerr" : "";
        }) })) };
    });
    return rotationReplica(years, out);
  }
  if (r.type === "shipments") {
    // Si «DHL FATURAT»: regjistri i dërgesave dhe faturave të kurierit, me pagesat
    const [co] = await q(sb.from("companies").select("name").eq("id", cid));
    if (!co) throw new ReportError("Kompania nuk u gjet", 404);
    const all = await q(sb.from("shipments").select("tracking_no,carrier,ship_date,recipient,country,invoice_date,amount_eur,paid_date,paid_eur,note,customers(name,country)").eq("company_id", cid).order("ship_date"));
    const rows = all.filter((x: any) => inRange(x.ship_date, r.from, r.to) && (!r.carrier || String(x.carrier).toLowerCase() === r.carrier.toLowerCase()));
    const sum = (k: string) => rows.reduce((a: number, x: any) => a + Number(x[k] ?? 0), 0);
    const label = r.carrier || "DHL / FedEx";
    if (String(r.carrier ?? "").toLowerCase() === "fedex") return fedexReplica(rows.map((x: any) => ({ date: x.invoice_date ? dDots(x.invoice_date) : "", ref: x.tracking_no ?? "", client: x.customers?.name || x.recipient || "",
      lek: null, currency: "EURO", eur: x.amount_eur == null ? null : Number(x.amount_eur), note: x.note || "" })));
    return dhlReplica(label, rows.map((x: any) => ({
      tracking: x.tracking_no ?? null, shipDate: x.ship_date ? dDots(x.ship_date) : "", recipient: x.customers?.name || x.recipient || "",
      country: x.customers?.country || x.country || "", invoiceDate: x.invoice_date ? dDots(x.invoice_date) : "",
      amount: x.amount_eur == null ? null : Number(x.amount_eur), payDate: x.paid_date ? dDots(x.paid_date) : "",
      paid: x.paid_eur == null ? null : Number(x.paid_eur), note: x.note || "" })));
  }
  if (r.type === "protocol") {
    // Si «PROTOKOLLI MOSTRAVE»: data, klienti, shteti, produkti, kodi, tracking, koment, rezultate analizash
    const all = await q(sb.from("samples").select("date,product_text,code,comment,result,customers(name,country),shipments(tracking_no)").eq("company_id", cid).order("date").order("id"));
    const rows = all.filter((x: any) => inRange(x.date, r.from, r.to) && (r.from || r.to || String(x.date).startsWith(String(year))));
    return protocolReplica(rows.map((x: any) => ({ date: dDots2(x.date), client: x.customers?.name ?? "", country: x.customers?.country ?? "", product: x.product_text ?? "",
      code: x.code ?? "", tracking: x.shipments?.tracking_no ?? "", comment: x.comment ?? "", result: x.result ?? "" })));
  }
  if (r.type === "lab_ledger") {
    // Si «ANALIZAT GBA»: kartela e llogarisë me laboratorin — debi (parapagime), kredi (shërbime), gjendja
    const account = (r.account || "GBA").trim();
    const all = await q(sb.from("lab_entries").select("date,ref,description,debit,credit,account").eq("company_id", cid).order("date").order("id"));
    const rows = all.filter((x: any) => String(x.account).toLowerCase() === account.toLowerCase() && inRange(x.date, r.from, r.to));
    return labLedgerReplica(account, rows.map((x: any) => ({ date: dDots2(x.date), ref: x.ref ?? "", description: x.description ?? "",
      debit: Number(x.debit) || null, credit: Number(x.credit) || null })));
  }
  throw new ReportError("Lloji i raportit nuk njihet");
}

export async function generate(sb: Sb, r: Req) {
  if (r.format !== "xlsx" && r.format !== "pdf") throw new ReportError("Formati duhet të jetë xlsx ose pdf");
  const rep = await makeReport(sb, r);
  const bytes = r.format === "xlsx" ? await buildXlsx(rep) : await buildPdf(rep);
  return { bytes, filename: `${rep.name}.${r.format}`, mime: MIME[r.format] };
}
