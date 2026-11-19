// Raportet krijohen brenda telefonit (Excel/PDF), me të njëjtin kod si funksioni në server.
// Kështu punojnë edhe pa internet pasi të dhënat janë ngarkuar.
import "./polyfills";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { sb } from "./supabase";
import { generate } from "../supabase/functions/reports/handler.ts";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}

// params: { type: 'summary'|'lot'|'farmer'|'growers'|'trace'|'plots'|'inputs'|'tasks', format: 'xlsx'|'pdf', company_id, year?, lot_code?, farmer_id? }
export async function downloadReport(params) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("Duhet të hyni në llogari");

  const { bytes, filename } = await generate(sb, params);
  const path = `${FileSystem.cacheDirectory}${String(filename).replace(/[^\w.\-]+/g, "_")}`;
  await FileSystem.writeAsStringAsync(path, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: params.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: filename,
      UTI: params.format === "pdf" ? "com.adobe.pdf" : "org.openxmlformats.spreadsheetml.sheet",
    });
  }
  return path;
}
