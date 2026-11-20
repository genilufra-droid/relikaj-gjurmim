// Zëri: motori i telefonit (Android SpeechRecognizer / iOS SFSpeechRecognizer).
// I mbrojtur — nëse moduli mungon, aplikacioni vazhdon të punojë me shkrim.
let SR = null;
try { SR = require("expo-speech-recognition"); } catch (_e) { SR = null; }

const ERRORS = {
  "language-not-supported": "Telefoni nuk e mbështet shqipen për të folur. Shkruajeni komandën ose aktivizoni transkriptimin në server.",
  "not-allowed": "Leja për mikrofon u refuzua. Lejojeni te Cilësimet → Aplikacione → BioBes Farm.",
  "service-not-allowed": "Shërbimi i të folurit nuk është i disponueshëm në këtë pajisje.",
  "no-speech": "Nuk u dëgjua asgjë. Provoni përsëri, më afër mikrofonit.",
  network: "Për të folur duhet internet. Shkruajeni komandën ndërkohë.",
  "audio-capture": "Mikrofoni nuk u hap. Kontrolloni që s'është i zënë nga një aplikacion tjetër.",
  aborted: "",
};

export const mapError = (code) => ERRORS[code] ?? (code ? `Gabim i të folurit: ${code}` : "Gabim i të folurit");

export const hasDeviceSpeech = () => {
  try {
    return !!(SR && SR.isRecognitionAvailable && SR.isRecognitionAvailable());
  } catch (_e) { return false; }
};

export async function askMicPermission() {
  if (!SR) return false;
  try {
    const r = await SR.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return !!r?.granted;
  } catch (_e) { return false; }
}

let subs = [];
const clear = () => {
  subs.forEach((s) => { try { s?.remove?.(); } catch (_e) { /* ignore */ } });
  subs = [];
};

export function stopListening() {
  try { SR?.ExpoSpeechRecognitionModule.abort(); } catch (_e) { /* ignore */ }
  clear();
}

/**
 * Nis dëgjimin. Kthen true nëse motori u nis.
 * lang: "sq-AL" (nëse pajisja s'e mban, thirret onError me kod).
 */
export function startListening({ onPartial, onFinal, onError, onEnd, lang = "sq-AL", hints = [] } = {}) {
  if (!SR) {
    onError?.("Telefoni nuk ka motor të të folurit. Shkruajeni komandën.");
    return false;
  }
  stopListening();
  try {
    subs = [
      SR.addSpeechRecognitionListener("result", (e) => {
        const t = e?.results?.[0]?.transcript || "";
        if (e?.isFinal) onFinal?.(t); else onPartial?.(t);
      }),
      SR.addSpeechRecognitionListener("error", (e) => onError?.(mapError(e?.error), e?.error)),
      SR.addSpeechRecognitionListener("end", () => onEnd?.()),
    ];
    SR.ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      contextualStrings: hints.slice(0, 100),
    });
    return true;
  } catch (e) {
    onError?.(e?.message || "Dëgjimi nuk u nis");
    clear();
    return false;
  }
}
