// Ruajtja, printimi dhe ndarja e dokumenteve PDF nga telefoni.
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toBase64(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return out;
}

/** Shkruan PDF-në në cache dhe kthen shtegun e skedarit. */
export async function savePdf(bytes, filename) {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

/** Hap dialogun e printimit të sistemit (Android: «Printo» / «Ruaj si PDF»). */
export async function printPdf(bytes, filename) {
  const path = await savePdf(bytes, filename);
  await Print.printAsync({ uri: path });
  return path;
}

/** Hap menunë e ndarjes (email, Drive, WhatsApp, printer me aplikacion). */
export async function sharePdf(bytes, filename) {
  const path = await savePdf(bytes, filename);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: "application/pdf", dialogTitle: filename });
  }
  return path;
}
