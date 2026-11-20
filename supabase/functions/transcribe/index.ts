// Transkriptimi i komandave me zë (shqip) për asistentin.
// Aktivizohet kur të vendoset sekreti OPENAI_API_KEY (Supabase → Edge Functions → Secrets).
// GET  → { ok, provider }  (aplikacioni e pyet një herë në orë)
// POST { audio_base64, mime, language } → { text }
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MAX_BYTES = 8 * 1024 * 1024;   // 8 MB — mjafton për një komandë të shkurtër

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const key = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (req.method === "GET") return json({ ok: !!key, provider: key ? "openai" : null });
  if (req.method !== "POST") return json({ error: "Metoda nuk lejohet" }, 405);
  if (!key) {
    return json({
      error: "Transkriptimi me zë nuk është aktivizuar. Vendosni sekretin OPENAI_API_KEY te Supabase → Edge Functions → Secrets.",
    }, 503);
  }

  try {
    // vetëm përdorues të futur në llogari
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Duhet të hyni në llogari" }, 401);

    const body = await req.json().catch(() => ({}));
    const b64 = String(body.audio_base64 ?? "").replace(/^data:[^,]+,/, "");
    if (!b64) return json({ error: "Mungon audio" }, 422);
    if (b64.length * 0.75 > MAX_BYTES) return json({ error: "Audio është shumë e gjatë (maksimumi 8 MB)" }, 413);

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const mime = String(body.mime || "audio/m4a");
    const ext = mime.includes("wav") ? "wav" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("ogg") ? "ogg" : "m4a";

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), `komanda.${ext}`);
    form.append("model", Deno.env.get("OPENAI_TRANSCRIBE_MODEL") ?? "whisper-1");
    form.append("response_format", "json");
    form.append("language", String(body.language || "sq"));
    form.append("prompt", "komandë bujqësore në shqip: blerje, kilo, parcelë, fermer, detyrë, vëzhgim");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: "Transkriptimi dështoi", detail: data?.error?.message ?? null }, 502);
    }
    return json({ text: String((data as { text?: string }).text ?? "").trim() });
  } catch (e) {
    return json({ error: "Gabim i brendshëm", detail: e instanceof Error ? e.message : null }, 500);
  }
});
