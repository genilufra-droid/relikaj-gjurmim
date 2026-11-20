// Leximi i lidhjeve të Supabase (rivendosje fjalëkalimi, konfirmim, hyrje magjike).
// Lidhja vjen si: biobesfarm://reset#access_token=…&refresh_token=…&type=recovery
// ose si: ?token_hash=…&type=recovery  ose ?code=…

const parsePairs = (str) => {
  const out = {};
  String(str || "")
    .split("&")
    .forEach((kv) => {
      const i = kv.indexOf("=");
      if (i < 0) return;
      const k = decodeURIComponent(kv.slice(0, i));
      const v = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
      if (k) out[k] = v;
    });
  return out;
};

/** Kthen objektin e parametrave (ose null nëse lidhja s'ka të dhëna autentikimi). */
export function parseAuthUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  const hashAt = s.indexOf("#");
  const queryAt = s.indexOf("?");

  const query = queryAt >= 0 ? s.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined) : "";
  const hash = hashAt >= 0 ? s.slice(hashAt + 1) : "";

  const params = { ...parsePairs(query), ...parsePairs(hash) };
  if (!params.access_token && !params.code && !params.token_hash && !params.error) return null;

  return {
    ...params,
    type: params.type || (params.access_token ? "recovery" : null),
    access_token: params.access_token || null,
    refresh_token: params.refresh_token || null,
    token_hash: params.token_hash || null,
    code: params.code || null,
    error: params.error || null,
    error_description: params.error_description || null,
  };
}

/** A është kjo lidhje rivendosjeje fjalëkalimi? */
export const isRecovery = (p) => !!p && (p.type === "recovery" || p.type === "RESET_PASSWORD");

/** Adresa që aplikacioni pret nga emaili i rivendosjes. */
export const RESET_REDIRECT = "biobesfarm://reset";
