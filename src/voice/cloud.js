// Transkriptim në server (Whisper) përmes funksionit «transcribe».
// Përdoret kur telefoni nuk e mbështet shqipen. Aktivizohet vetëm kur të vendoset çelësi.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { sb } from "../supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const CACHE_KEY = "transcribe_status_v1";
let recording = null;

async function authHeaders() {
  const { data: { session } } = await sb.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

/** A është i gatshëm transkriptimi në server? (pyetja mbahet mend 1 orë) */
export async function cloudReady() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const j = JSON.parse(cached);
      if (Date.now() - j.at < 3600_000) return !!j.ok;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, { method: "GET", headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    const ok = !!j.ok;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ok, at: Date.now() }));
    return ok;
  } catch (_e) {
    return false;
  }
}

export async function startRecording() {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error("Leja për mikrofon u refuzua. Lejojeni te Cilësimet → Aplikacione.");
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false });
  const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  recording = rec;
}

export async function stopRecording() {
  if (!recording) return null;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
  } catch (_e) { /* ignore */ }
  try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch (_e) { /* ignore */ }
  return rec.getURI();
}

export async function cancelRecording() {
  if (!recording) return;
  const rec = recording;
  recording = null;
  try { await rec.stopAndUnloadAsync(); } catch (_e) { /* ignore */ }
}

/** Dërgon audion te funksioni «transcribe» dhe kthen tekstin. */
export async function transcribeFile(uri) {
  if (!uri) throw new Error("Nuk u regjistrua audio");
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ audio_base64: base64, mime: "audio/m4a", language: "sq" }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Transkriptimi dështoi");
  return String(j.text || "").trim();
}

export const recordingAvailable = () => {
  try { return !!Audio?.Recording; } catch (_e) { return false; }
};
