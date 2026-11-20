// Testet e lidhjeve të autentikimit: rivendosja e fjalëkalimit nga emaili.
import { parseAuthUrl, isRecovery, RESET_REDIRECT } from "../src/auth/links.js";

let pass = 0, fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.log(`✗ ${msg}\n  pritej: ${JSON.stringify(b)}\n  doli:   ${JSON.stringify(a)}`); }
};
const ok = (c, msg) => (c ? pass++ : (fail++, console.log(`✗ ${msg}`)));

// ------------------------------------------------------- hash (flow implicit)
{
  const p = parseAuthUrl("biobesfarm://reset#access_token=AT123&refresh_token=RT456&expires_in=3600&type=recovery&token_type=bearer");
  eq(p.access_token, "AT123", "hash: access_token");
  eq(p.refresh_token, "RT456", "hash: refresh_token");
  eq(p.type, "recovery", "hash: tipi");
  ok(isRecovery(p), "hash: është rivendosje");
  eq(p.error, null, "hash: pa gabim");
}

// ------------------------------------------------------- query (token_hash)
{
  const p = parseAuthUrl("biobesfarm://reset?token_hash=abc123&type=recovery");
  eq(p.token_hash, "abc123", "query: token_hash");
  eq(p.access_token, null, "query: pa access_token");
  ok(isRecovery(p), "query: është rivendosje");
}

// ------------------------------------------------------- PKCE code
{
  const p = parseAuthUrl("https://x.supabase.co/auth/v1/verify?code=9f8e&type=recovery");
  eq(p.code, "9f8e", "pkce: code");
  ok(isRecovery(p), "pkce: është rivendosje");
}

// ------------------------------------------------------- gabime nga serveri
{
  const p = parseAuthUrl("biobesfarm://reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  eq(p.error, "access_denied", "gabim: kodi");
  eq(p.error_description, "Email link is invalid or has expired", "gabim: përshkrimi i dekoduar");
  ok(!isRecovery(p), "gabim: nuk hap ekranin e rivendosjes");
}

// ------------------------------------------------------- konfirmim emaili
{
  const p = parseAuthUrl("biobesfarm://reset#access_token=AT&refresh_token=RT&type=signup");
  eq(p.type, "signup", "konfirmim: tipi");
  ok(!isRecovery(p), "konfirmim: nuk është rivendosje");
}

// ------------------------------------------------------- hyrje të tjera
{
  ok(parseAuthUrl("biobesfarm://reset") === null, "pa parametra → null");
  ok(parseAuthUrl("") === null, "bosh → null");
  ok(parseAuthUrl(null) === null, "null → null");
  ok(parseAuthUrl(undefined) === null, "undefined → null");
  const p = parseAuthUrl("  biobesfarm://reset#access_token=AT&refresh_token=RT  ");
  eq(p.access_token, "AT", "hapësirat hiqen");
  eq(p.type, "recovery", "pa tip → supozohet rivendosje kur ka access_token");
  ok(isRecovery(p), "pa tip: është rivendosje");
}

// ------------------------------------------------------- vlera të koduara
{
  const p = parseAuthUrl("biobesfarm://reset?token_hash=a%2Bb%3D&type=recovery&email=test%40mail.al");
  eq(p.token_hash, "a+b=", "decoding: token_hash");
  eq(p.email, "test@mail.al", "decoding: email");
}

// ------------------------------------------------------- konstantja
eq(RESET_REDIRECT, "biobesfarm://reset", "adresa e ridrejtimit");

console.log(`\n${pass} teste kaluan, ${fail} dështuan`);
if (fail) process.exit(1);
