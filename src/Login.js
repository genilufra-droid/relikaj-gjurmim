import React, { useState } from "react";
import { Text, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb, toEmail } from "./supabase";
import { s, C, Field, Btn, ErrorBox, InfoBox } from "./ui";
import { parseAuthUrl, isRecovery, RESET_REDIRECT } from "./auth/links";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onRecovery }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("login");          // login | forgot | sent | phone_code
  const [id, setId] = useState("");                   // email ose emër përdoruesi
  const [link, setLink] = useState("");               // lidhja e ngjitur me dorë
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");

  const go = async () => {
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(u), password: p });
    setBusy(false);
    if (error) setErr("Emri i përdoruesit ose fjalëkalimi është gabim. Provoni përsëri.");
  };

  const sendReset = async () => {
    setErr(""); setMsg("");
    const value = id.trim();
    if (!value) { setErr("Shkruani emailin e llogarisë."); return; }
    if (!EMAIL_RE.test(value)) {
      setErr("Kjo llogari hyn me emër përdoruesi, pa email. Për rivendosje, administratori i kompanisë vendos një fjalëkalim të përkohshëm te «Përdoruesit».");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.resetPasswordForEmail(value.toLowerCase(), { redirectTo: RESET_REDIRECT });
    setBusy(false);
    if (error) {
      setErr(
        /rate limit|too many/i.test(error.message)
          ? "U dërguan shumë email-e për një orë. Provoni më vonë ose kërkoni fjalëkalim të përkohshëm nga administratori."
          : error.message
      );
      return;
    }
    setMsg(`Nëse ${value} është i regjistruar, lidhja e rivendosjes u dërgua. Kontrolloni edhe dosjen «Spam».`);
    setMode("sent");
  };

  const openPastedLink = async () => {
    setErr("");
    const parsed = parseAuthUrl(link);
    if (!parsed) { setErr("Lidhja nuk u njoh. Kopjoni lidhjen e plotë nga emaili."); return; }
    if (parsed.error) { setErr(parsed.error_description || "Lidhja skadoi ose u përdor më parë."); return; }
    setBusy(true);
    let error = null;
    if (parsed.access_token && parsed.refresh_token) {
      ({ error } = await sb.auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token }));
    } else if (parsed.token_hash) {
      ({ error } = await sb.auth.verifyOtp({ token_hash: parsed.token_hash, type: parsed.type || "recovery" }));
    } else if (parsed.code) {
      ({ error } = await sb.auth.exchangeCodeForSession(parsed.code));
    }
    setBusy(false);
    if (error) { setErr("Lidhja skadoi ose u përdor më parë. Kërkoni një lidhje të re."); return; }
    if (isRecovery(parsed) && onRecovery) onRecovery(parsed.email || id.trim() || "");
    else setErr("Lidhja nuk është për rivendosje fjalëkalimi.");
  };

  const sendPhoneCode = async () => {
    setErr("");
    const value = phone.trim();
    if (!/^\+?\d{8,15}$/.test(value.replace(/\s/g, ""))) { setErr("Shkruani numrin me prefiks shtetëror, p.sh. +355691234567."); return; }
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({ phone: value.replace(/\s/g, "") });
    setBusy(false);
    if (error) {
      setErr(
        /phone.*(disabled|not enabled)/i.test(error.message)
          ? "Hyrja me telefon nuk është e aktivizuar në këtë projekt. Administratori duhet të lidhë shërbimin SMS (Twilio/Vonage) te Supabase → Authentication → Providers → Phone."
          : error.message
      );
      return;
    }
    setMsg("Kodi u dërgua me SMS.");
    setMode("phone_code");
  };

  const verifyPhone = async () => {
    setErr(""); setBusy(true);
    const { error } = await sb.auth.verifyOtp({ phone: phone.replace(/\s/g, ""), token: token.trim(), type: "sms" });
    setBusy(false);
    if (error) { setErr("Kodi nuk është i saktë ose ka skaduar."); return; }
    if (onRecovery) onRecovery(`telefoni ${phone}`);
  };

  const back = () => { setMode("login"); setErr(""); setMsg(""); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.brand }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 28, paddingTop: 84, paddingBottom: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Ionicons name="leaf" size={28} color="#fff" />
          </View>
          <Text style={{ color: "#B9D8A8", fontSize: 11, letterSpacing: 3.4, fontWeight: "700" }}>BIOBES FARM</Text>
          <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 }}>Menaxho fermën,{`\n`}nga fusha te klienti</Text>
          <Text style={{ color: "#CBE2C0", marginTop: 14, fontSize: 14.5, lineHeight: 21 }}>
            Parcela me GPS, kultivime, detyra, vëzhgime me foto, inpute, magazinë dhe gjurmueshmëri e plotë.
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 28, paddingBottom: 40, flex: 1 }}>
          {mode === "login" && (
            <>
              <Text style={[s.h1, { marginBottom: 2 }]}>Mirë se erdhe</Text>
              <Text style={s.sub}>Hyr me llogarinë e kompanisë tuaj.</Text>

              <Field label="Emri i përdoruesit ose email" value={u} onChangeText={setU} autoCapitalize="none" autoCorrect={false} placeholder="emri@biobes.al" keyboardType="email-address" />

              <Text style={s.label}>Fjalëkalimi</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14 }}>
                <Field
                  label="" value={p} onChangeText={setP} secureTextEntry={!show}
                  style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0 }}
                  placeholder="••••••••"
                />
                <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10}>
                  <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color={C.mute} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => { setMode("forgot"); setErr(""); setId(u); }} hitSlop={8} style={{ alignSelf: "flex-end", marginTop: 12 }}>
                <Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Harruat fjalëkalimin?</Text>
              </TouchableOpacity>

              {!!err && <ErrorBox message={err} />}
              <Btn title="Hyr" icon="log-in-outline" onPress={go} busy={busy} disabled={!u || !p} />
              <Text style={[s.mute, { textAlign: "center", marginTop: 22, fontSize: 11.5 }]}>BioBes · Bimë aromatike e mjekësore · Shqipëri</Text>
            </>
          )}

          {mode === "forgot" && (
            <>
              <TouchableOpacity onPress={back} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={C.brand} />
                <Text style={{ color: C.brand, fontWeight: "700" }}>Hyrja</Text>
              </TouchableOpacity>
              <Text style={s.h1}>Rivendosja e fjalëkalimit</Text>
              <Text style={[s.sub, { marginTop: 4 }]}>Dërgojmë një lidhje në emailin e llogarisë. Lidhja hap aplikacionin dhe ju lë të vendosni fjalëkalimin e ri.</Text>

              <Field label="Emaili i llogarisë" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="emri@biobes.al" />
              {!!err && <ErrorBox message={err} />}
              <Btn title="Dërgo lidhjen" icon="mail-outline" onPress={sendReset} busy={busy} disabled={!id.trim()} />

              <View style={[s.divider, { marginVertical: 20 }]} />

              <Text style={s.label}>Ose me telefon (SMS)</Text>
              <Text style={[s.mute, { marginBottom: 8 }]}>
                Punon vetëm nëse projekti ka të lidhur shërbim SMS. Kodi vjen me SMS dhe hyni direkt.
              </Text>
              {mode === "phone_code" ? (
                <>
                  <Field label="Kodi 6-shifror" value={token} onChangeText={setToken} keyboardType="number-pad" />
                  <Btn title="Verifiko kodin" onPress={verifyPhone} busy={busy} disabled={token.trim().length < 4} />
                  <Btn title="Dërgo kod tjetër" alt onPress={sendPhoneCode} />
                </>
              ) : (
                <>
                  <Field label="Numri i telefonit" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+355 69 123 4567" />
                  <Btn title="Dërgo kodin me SMS" alt icon="phone-portrait-outline" onPress={sendPhoneCode} busy={busy} disabled={!phone.trim()} />
                </>
              )}
              <InfoBox icon="information-circle" tone="warn">
                Llogaritë me emër përdoruesi, pa email të vërtetë, rivendosen nga administratori i kompanisë te «Përdoruesit» (fjalëkalim i përkohshëm).
              </InfoBox>
            </>
          )}

          {mode === "sent" && (
            <>
              <TouchableOpacity onPress={back} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={C.brand} />
                <Text style={{ color: C.brand, fontWeight: "700" }}>Hyrja</Text>
              </TouchableOpacity>
              <Text style={s.h1}>Kontrolloni emailin</Text>
              <Text style={[s.sub, { marginTop: 4 }]}>{msg}</Text>

              <InfoBox icon="mail-unread-outline">
                Hapni emailin dhe shtypni «Reset password». Lidhja hap vetë aplikacionin dhe ju kërkon fjalëkalimin e ri. Lidhja vlen një orë dhe punon vetëm një herë.
              </InfoBox>

              <Text style={s.label}>Nuk u hap aplikacioni?</Text>
              <Text style={[s.mute, { marginBottom: 8 }]}>Kopjoni lidhjen nga emaili dhe ngjitni këtu.</Text>
              <Field label="" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="biobesfarm://reset#access_token=…" multiline />
              {!!err && <ErrorBox message={err} />}
              <Btn title="Vazhdo me lidhjen" onPress={openPastedLink} busy={busy} disabled={!link.trim()} />
              <Btn title="Dërgo përsëri" alt onPress={sendReset} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
