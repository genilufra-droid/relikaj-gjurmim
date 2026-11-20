// Backup i plotë i një kompanie (JSON) dhe rikthimi i tij.
// Vetëm admini i kompanisë ose administratori i platformës. Rikthimi është «shtues»:
// ripërdor rreshtat ekzistues sipas kodit/emrit dhe nuk fshin asgjë.
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const FORMAT = "biobes-backup";
const VERSION = 1;

// Rendi i tabelave sipas varësisë (prindërit para fëmijëve) + lidhjet që duhen rihartëzuar.
// Formati: [tabela, [[kolona_fk, tabela_prind], ...], [kolona_kyç_natyral, ...]]
const SCHEMA: [string, [string, string][], string[]][] = [
  ["warehouses", [], ["name"]],
  ["zones", [], ["code"]],
  ["farmers", [], ["id_number"]],
  ["products", [], ["code"]],
  ["customers", [], ["name"]],
  ["plots", [["zone_id", "zones"], ["farmer_id", "farmers"]], ["code"]],
  ["leases", [["plot_id", "plots"]], []],
  ["cultivations", [["plot_id", "plots"], ["product_id", "products"]], []],
  ["purchases", [
    ["farmer_id", "farmers"], ["zone_id", "zones"], ["product_id", "products"],
    ["plot_id", "plots"], ["cultivation_id", "cultivations"], ["warehouse_id", "warehouses"],
  ], []],
  ["shipments", [["customer_id", "customers"]], []],
  ["samples", [
    ["customer_id", "customers"], ["plot_id", "plots"], ["product_id", "products"], ["shipment_id", "shipments"],
  ], []],
  ["stock_moves", [
    ["product_id", "products"], ["purchase_id", "purchases"], ["warehouse_id", "warehouses"], ["customer_id", "customers"],
  ], []],
  ["tasks", [["assignee_farmer_id", "farmers"], ["plot_id", "plots"], ["cultivation_id", "cultivations"]], []],
  ["observations", [["plot_id", "plots"], ["cultivation_id", "cultivations"]], []],
  ["inputs", [["plot_id", "plots"], ["cultivation_id", "cultivations"]], []],
  ["applications", [["plot_id", "plots"], ["cultivation_id", "cultivations"]], []],
  ["land_operations", [["plot_id", "plots"]], []],
  ["payments", [["farmer_id", "farmers"], ["lease_id", "leases"], ["purchase_id", "purchases"]], []],
  ["batches", [["product_id", "products"], ["warehouse_id", "warehouses"]], []],
  ["reminders", [], []],
  ["documents", [
    ["plot_id", "plots"], ["purchase_id", "purchases"], ["sample_id", "samples"], ["task_id", "tasks"],
    ["input_id", "inputs"], ["lease_id", "leases"], ["observation_id", "observations"], ["stock_move_id", "stock_moves"],
  ], []],
];

type Row = Record<string, any>;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metoda nuk lejohet" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Duhet të hyni në llogari" }, 401);

    const b = await req.json();
    const cid = Number(b.company_id);
    if (!cid) return json({ error: "Zgjidhni kompaninë" }, 422);
    const { data: isPlatform } = await caller.rpc("is_platform_admin");
    const { data: role } = await caller.rpc("member_role", { cid });
    if (!isPlatform && role !== "admin") return json({ error: "Vetëm administratori mund të bëjë backup" }, 403);

    // ------------------------------------------------------------------ eksport
    if (b.action === "export") {
      const tables: Record<string, Row[]> = {};
      const counts: Record<string, number> = {};
      for (const [table] of SCHEMA) {
        const { data, error } = await caller.from(table).select("*").eq("company_id", cid);
        if (error) return json({ error: `Leximi i «${table}» dështoi: ${error.message}` }, 500);
        tables[table] = data ?? [];
        counts[table] = (data ?? []).length;
      }
      const { data: company } = await caller.from("companies").select("*").eq("id", cid).maybeSingle();
      return json({
        format: FORMAT,
        version: VERSION,
        created_at: new Date().toISOString(),
        company: { id: cid, name: company?.name ?? "", kind: company?.kind ?? "" },
        counts,
        tables,
        note: "Përfshihen të dhënat e kompanisë; fjalëkalimet, përdoruesit dhe skedarët e dokumenteve nuk përfshihen.",
      });
    }

    // ------------------------------------------------------------------ import
    if (b.action === "import") {
      const payload = b.payload;
      if (!payload || payload.format !== FORMAT) return json({ error: "Ky skedar nuk është backup i BioBes Farm" }, 422);
      if (Number(payload.version) > VERSION) return json({ error: "Backupi është nga një version më i ri aplikacioni" }, 422);
      const dry = !!b.dry_run;
      const tables: Record<string, Row[]> = payload.tables ?? {};
      const created: Record<string, number> = {};
      const reused: Record<string, number> = {};
      const skipped: { table: string; reason: string }[] = [];
      const maps: Record<string, Record<string, number>> = {};

      for (const [table, fks, naturalKeys] of SCHEMA) {
        const rows = tables[table] ?? [];
        maps[table] = maps[table] ?? {};
        created[table] = 0;
        reused[table] = 0;
        for (const row of rows) {
          if (!row || typeof row !== "object") { skipped.push({ table, reason: "rresht i pavlefshëm" }); continue; }
          if (row.id === undefined || row.id === null) { skipped.push({ table, reason: "mungon id" }); continue; }

          // 1) gjej rresht ekzistues me kyç natyral (kodi / emri)
          let existingId: number | null = null;
          for (const key of naturalKeys) {
            const value = row[key];
            if (value === null || value === undefined || value === "") continue;
            const { data } = await caller.from(table).select("id").eq("company_id", cid).eq(key, value).limit(1);
            if (data && data.length) { existingId = data[0].id; break; }
          }
          if (existingId !== null) {
            maps[table][row.id] = existingId;
            reused[table]++;
            continue;
          }
          if (dry) { maps[table][row.id] = -1; created[table]++; continue; }

          // 2) përgatit rreshtin: pa id, company_id i kompanisë, lidhjet e rihartëzuara
          const clean: Row = { ...row, company_id: cid };
          delete clean.id;
          for (const [col, parent] of fks) {
            const old = row[col];
            if (old === null || old === undefined) { clean[col] = null; continue; }
            const mapped = maps[parent]?.[old];
            clean[col] = mapped && mapped > 0 ? mapped : null;
          }
          const { data: ins, error } = await caller.from(table).insert(clean).select("id").maybeSingle();
          if (error || !ins) { skipped.push({ table, reason: error?.message ?? "insert dështoi" }); continue; }
          maps[table][row.id] = ins.id;
          created[table]++;
        }
      }

      const total = (o: Record<string, number>) => Object.values(o).reduce((a, n) => a + n, 0);
      return json({
        ok: true,
        dry_run: dry,
        created, reused, skipped,
        summary: { created: total(created), reused: total(reused), skipped: skipped.length },
      });
    }

    return json({ error: "Veprimi nuk njihet" }, 400);
  } catch (e) {
    return json({ error: `Gabim i brendshëm: ${(e as Error)?.message ?? "i panjohur"}` }, 500);
  }
});
