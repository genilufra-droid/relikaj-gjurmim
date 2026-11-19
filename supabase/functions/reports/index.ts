import { createClient } from "@supabase/supabase-js";
import { generate, ReportError } from "./handler.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Metoda nuk lejohet" }), { status: 405, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    // Klienti përdor çelësin e përdoruesit: RLS vendos çfarë mund të shohë ky përdorues
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const body = await req.json();
    const { bytes, filename, mime } = await generate(sb, body);
    return new Response(bytes, { headers: { ...CORS, "Content-Type": mime, "Content-Disposition": `attachment; filename="${filename}"` } });
  } catch (e) {
    const status = e instanceof ReportError ? e.status : 500;
    return new Response(JSON.stringify({ error: e instanceof ReportError ? e.message : "Gabim i brendshëm" }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
