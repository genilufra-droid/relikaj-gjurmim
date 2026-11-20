// Ekzekutimi i importimit: leximi i kontekstit, ruajtja në Supabase dhe përmbledhja.
import { ENTITIES, buildContext, prepareRows } from "./spec";

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export async function loadContext(sb, cid) {
  const [z, f, p, pr] = await Promise.all([
    sb.from("zones").select("id,code,name").eq("company_id", cid),
    sb.from("farmers").select("id,first_name,last_name,id_number,phone,zone_code").eq("company_id", cid),
    sb.from("plots").select("id,code,name").eq("company_id", cid),
    sb.from("products").select("id,code,name").eq("company_id", cid),
  ]);
  const e = z.error || f.error || p.error || pr.error;
  if (e) throw new Error("Të dhënat ekzistuese nuk u lexuan: " + e.message);
  return buildContext({ zones: z.data || [], farmers: f.data || [], plots: p.data || [], products: pr.data || [] });
}

/** Ruan rreshtat e përgatitur; një provë e dështuar nuk ndal pjesën tjetër. */
export async function persist(sb, cid, entityKey, ready) {
  const entity = ENTITIES[entityKey];
  const table = entity.table;
  let created = 0, updated = 0;
  const failed = [];
  const todo = ready.filter((r) => r.action !== "skip");

  for (const part of chunk(todo.filter((r) => r.action === "create"), 40)) {
    const payload = part.map((r) => ({ company_id: cid, ...r.values }));
    const { error } = await sb.from(table).insert(payload);
    if (!error) { created += payload.length; continue; }
    for (const r of part) {
      const { error: e1 } = await sb.from(table).insert({ company_id: cid, ...r.values });
      if (e1) failed.push({ line: r.line, message: e1.message }); else created++;
    }
  }
  for (const r of todo.filter((r) => r.action === "update" && r.id)) {
    const { error } = await sb.from(table).update(r.values).eq("id", r.id).eq("company_id", cid);
    if (error) failed.push({ line: r.line, message: error.message }); else updated++;
  }
  return { created, updated, failed, skipped: ready.filter((r) => r.action === "skip").length };
}

/** Importon një regjistër nga rreshtat e një flete. */
export async function importRows(sb, cid, entityKey, rows, mapping, opts = {}) {
  const ctx = await loadContext(sb, cid);
  const prep = prepareRows(entityKey, mapping, rows, ctx, opts);
  const res = await persist(sb, cid, entityKey, prep.ready);
  return { entityKey, ...res, errors: prep.errors, counts: prep.counts, warnings: prep.ready.reduce((n, r) => n + r.warnings.length, 0) };
}
