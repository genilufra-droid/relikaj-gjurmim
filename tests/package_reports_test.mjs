// Verifikon paketën e prodhuar dhe HTTP handler-in me klient të simuluar.
// Kjo nuk zëvendëson testin e një përdoruesi real ose të RLS në Supabase.
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "reports-package-test-"));
const compiled = resolve(root, "tests/.reports_bundle_test.mjs");
const oldDeno = globalThis.Deno;
const oldFetch = globalThis.fetch;
let handler;
try {
  const target = join(temp, "index.ts");
  execFileSync(process.execPath, ["scripts/package-reports.mjs", target], { cwd: root });
  const wrapper = await readFile(target, "utf8");
  const sha = wrapper.match(/bundled reports SHA-256: ([0-9a-f]{64})/)?.[1];
  const payload = wrapper.match(/const payload = "([A-Za-z0-9+/=]+)";/)?.[1];
  assert.ok(sha && payload, "paketa ka hash dhe përmbajtje");
  const code = brotliDecompressSync(Buffer.from(payload, "base64"));
  assert.equal(createHash("sha256").update(code).digest("hex"), sha, "përmbajtja ka integritet");
  assert.ok(!/raw\.githubusercontent\.com|github\.com|\bfetch\s*\(/i.test(wrapper), "nisja nuk shkarkon kod nga rrjeti");
  assert.ok(!/raw\.githubusercontent\.com|github\.com/i.test(code.toString()), "logjika e paketuar nuk varet nga GitHub");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY/.test(code.toString()), "funksioni nuk përdor service role");
  const imports = JSON.parse(await readFile(resolve(root, "supabase/functions/reports/deno.json"), "utf8")).imports;
  let nodeCode = code.toString();
  for (const [name, spec] of Object.entries(imports)) {
    assert.ok(wrapper.includes(`import "${spec}"`), `${name} deklarohet statikisht në paketë`);
    assert.ok(nodeCode.includes(`"${spec}"`), `${name} përdoret nga paketa`);
    nodeCode = nodeCode.replaceAll(`"${spec}"`, `"${name}"`);
  }
  await build({
    absWorkingDir: root,
    stdin: { contents: nodeCode, resolveDir: root, sourcefile: "reports-bundle.js", loader: "js" },
    alias: { "@supabase/supabase-js": resolve(root, "tests/smoke/stub-report-supabase.mjs") },
    bundle: true, platform: "node", format: "esm", outfile: compiled, logLevel: "silent",
  });
  globalThis.__reportClientCalls = [];
  globalThis.Deno = {
    env: { get: (name) => ({ SUPABASE_URL: "https://supabase.test", SUPABASE_ANON_KEY: "anon-test-key" })[name] },
    serve: (fn) => { handler = fn; },
  };
  globalThis.fetch = async () => { throw new Error("rrjeti nuk duhet përdorur në testin e simuluar"); };
  await import(pathToFileURL(compiled).href);
  assert.equal(typeof handler, "function", "paketa regjistron handler-in");
  const invoke = (method, body, auth = "Bearer test-user") => handler(new Request("https://example.test/reports", {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const preflight = await invoke("OPTIONS");
  assert.equal(preflight.status, 200);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.equal((await invoke("GET")).status, 405);
  for (const format of ["pdf", "xlsx"]) {
    const response = await invoke("POST", { type: "summary", format, company_id: 1, year: 2026 });
    assert.equal(response.status, 200, `summary ${format}`);
    assert.match(response.headers.get("content-disposition"), new RegExp(`\\.${format}`));
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, format === "pdf" ? 4 : 2).toString(), format === "pdf" ? "%PDF" : "PK");
  }
  assert.deepEqual(globalThis.__reportClientCalls[0], { url: "https://supabase.test", key: "anon-test-key", auth: "Bearer test-user" }, "JWT i përdoruesit përcillet te klienti");
  assert.equal((await invoke("POST", { type: "summary", format: "pdf", company_id: 2 })).status, 404, "kompania jashtë të dhënave të simuluara");
  assert.equal((await invoke("POST", { type: "summary", format: "pdf", company_id: 1 }, "")).status, 400, "klienti i simuluar refuzon përdoruesin anonim");
  assert.equal((await invoke("POST", { type: "summary", format: "bad", company_id: 1 })).status, 400);
  console.log("Paketa e raporteve, përcjellja e JWT dhe rrjedhat HTTP kaluan (të dhëna të simuluara)");
} finally {
  globalThis.Deno = oldDeno;
  globalThis.fetch = oldFetch;
  delete globalThis.__reportClientCalls;
  await rm(compiled, { force: true });
  await rm(temp, { recursive: true, force: true });
}
