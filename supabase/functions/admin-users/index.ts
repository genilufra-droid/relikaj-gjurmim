// Krijon dhe menaxhon përdoruesit e një kompanie. Vetëm admini i kompanisë ose administratori i platformës.
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ROLES = ["admin", "staf", "grumbullues", "fermer"];
const DOMAIN = "login.relikaj.al";                 // emrat e përdoruesit pa email bëhen emri@login.relikaj.al

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metoda nuk lejohet" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Duhet të hyni në llogari" }, 401);

    const b = await req.json();
    const cid = Number(b.company_id);
    if (!cid) return json({ error: "Zgjidhni kompaninë" }, 422);
    const { data: isPlatform } = await caller.rpc("is_platform_admin");
    const { data: role } = await caller.rpc("member_role", { cid });
    if (!isPlatform && role !== "admin") return json({ error: "Nuk keni leje për këtë veprim" }, 403);

    // Të gjitha veprimet kufizohen te anëtarët e kësaj kompanie
    if (b.action === "create") {
      const password = String(b.password ?? "");
      if (password.length < 8) return json({ error: "Fjalëkalimi duhet të ketë të paktën 8 shkronja" }, 422);
      if (!ROLES.includes(b.role)) return json({ error: "Roli nuk njihet" }, 422);
      const username = String(b.username ?? "").trim().toLowerCase();
      const email = String(b.email ?? "").trim().toLowerCase() || (username ? `${username}@${DOMAIN}` : "");
      if (!email || (!b.email && !/^[a-z0-9._-]{3,}$/.test(username))) return json({ error: "Shkruani email ose emër përdoruesi (të paktën 3 shkronja a-z, 0-9)" }, 422);
      let farmerId: number | null = null;
      if (b.role === "fermer") {
        farmerId = Number(b.farmer_id) || null;
        const { data: f } = farmerId ? await admin.from("farmers").select("id").eq("id", farmerId).eq("company_id", cid).maybeSingle() : { data: null };
        if (!f) return json({ error: "Roli «fermer» kërkon një fermer nga lista" }, 422);
      }
      const { data: created, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: b.name ?? "" } });
      if (e1 || !created.user) return json({ error: e1?.message?.includes("already") ? "Ky përdorues ekziston" : "Krijimi dështoi" }, 409);
      const { error: e2 } = await admin.from("members").insert({ user_id: created.user.id, company_id: cid, role: b.role, name: String(b.name ?? "").trim(), farmer_id: farmerId });
      if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: "Krijimi dështoi" }, 500); }
      return json({ ok: true, user_id: created.user.id, login: email }, 201);
    }

    const uid = String(b.user_id ?? "");
    const { data: m } = await admin.from("members").select("user_id").eq("user_id", uid).eq("company_id", cid).maybeSingle();
    if (!m) return json({ error: "Anëtari nuk u gjet" }, 404);
    if (b.action === "set_active") {
      if (uid === user.id) return json({ error: "Nuk mund ta çaktivizoni veten" }, 422);
      await admin.from("members").update({ active: !!b.active }).eq("user_id", uid).eq("company_id", cid);
      return json({ ok: true });
    }
    if (b.action === "reset_password") {
      const password = String(b.password ?? "");
      if (password.length < 8) return json({ error: "Fjalëkalimi duhet të ketë të paktën 8 shkronja" }, 422);
      const { error } = await admin.auth.admin.updateUserById(uid, { password });
      return error ? json({ error: "Ndryshimi dështoi" }, 500) : json({ ok: true });
    }
    if (b.action === "set_email") {
      const email = String(b.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Email-i nuk është i saktë" }, 422);
      if (/@login\.relikaj\.al$/i.test(email)) return json({ error: "Ky është email i brendshëm; shkruani emailin e vërtetë të punonjësit" }, 422);
      const { error } = await admin.auth.admin.updateUserById(uid, { email, email_confirm: true });
      if (error) {
        const msg = String(error.message || "");
        return json({ error: /already|exists|duplicate/i.test(msg) ? "Ky email përdoret nga një llogari tjetër" : "Ndryshimi i email-it dështoi" }, 409);
      }
      return json({ ok: true, login: email });
    }
    return json({ error: "Veprimi nuk njihet" }, 400);
  } catch (_e) {
    return json({ error: "Gabim i brendshëm" }, 500);
  }
});
