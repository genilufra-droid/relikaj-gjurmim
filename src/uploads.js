// Ngarkimi i skedarëve (foto, PDF) në Supabase Storage.
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { sb } from "./supabase";

const clean = (name) => String(name || "skedar").replace(/[^\w.\-]+/g, "_").slice(-60);

export async function uploadToBucket(bucket, uri, mime, name) {
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${Date.now()}-${clean(name)}`;
  const form = new FormData();
  form.append("file", { uri, name: clean(name), type: mime || "application/octet-stream" });
  const { error } = await sb.storage.from(bucket).upload(path, form, { contentType: mime || "application/octet-stream", upsert: false });
  if (error) throw new Error(error.message || "Ngarkimi dështoi");
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// Kamera → foto
export async function pickPhotoFromCamera() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("Leja për kamerë u refuzua. Lejojeni te Cilësimet → Aplikacione.");
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType || "image/jpeg", name: `foto-${Date.now()}.jpg`, size: a.fileSize || 0 };
}

// Galeria → foto
export async function pickPhotoFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Leja për galeri u refuzua.");
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType || "image/jpeg", name: a.fileName || `foto-${Date.now()}.jpg`, size: a.fileSize || 0 };
}

// Skedar (PDF, Word, Excel, foto)
export async function pickDocument() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType || "application/octet-stream", name: a.name || `skedar-${Date.now()}`, size: a.size || 0 };
}

export const kindOf = (mime, name = "") => {
  const m = String(mime || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/.test(n)) return "photo";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  return "doc";
};

export const humanSize = (b) => {
  const n = Number(b) || 0;
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

// Skedar tabele (Excel / CSV) për importim
export async function pickSpreadsheet() {
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "text/comma-separated-values",
      "text/plain",
      "application/octet-stream",
      "*/*",
    ],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType || "application/octet-stream", name: a.name || "tabela.xlsx", size: a.size || 0 };
}
