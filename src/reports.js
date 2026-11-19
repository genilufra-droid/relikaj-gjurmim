import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { sb } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(buf) {
  const b = new Uint8Array(buf); let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}

// params: {type:'summary'|'lot'|'farmer'|'growers', format:'xlsx'|'pdf', company_id, year?, lot_code?, farmer_id?}
export async function downloadReport(params) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("Duhet të hyni në llogari");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let msg = "Raporti nuk u krijua";
    try { msg = (await res.json()).error || msg; } catch (_e) {}
    throw new Error(msg);
  }
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="?([^";]+)"?/.exec(cd);
  const name = (m ? m[1] : `raport.${params.format}`).replace(/[^\w.\-]+/g, "_");
  const path = FileSystem.cacheDirectory + name;
  await FileSystem.writeAsStringAsync(path, toBase64(await res.arrayBuffer()), { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
  return path;
}
