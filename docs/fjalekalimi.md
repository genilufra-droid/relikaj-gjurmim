# Fjalëkalimi: hyrje, rivendosje dhe llogari

Versioni 0.7.0 shton rrjedhën e plotë të fjalëkalimit. Ky dokument thotë **çfarë punon sot**, **çfarë varet nga serveri i emailit** dhe **si e rivendos administratori** kur email-i nuk arrin.

## 1. Ndryshimi i fjalëkalimit (punon pa asnjë konfigurim)

Çdo përdorues: prekni **roolin tuaj lart djathtas → Profili**.
- Shkruani fjalëkalimin aktual (verifikohet me serverin), pastaj të riun dy herë.
- Kërkesa: të paktën 8 shkronja, i ndryshëm nga ai i vjetri. Nëse llogaria nuk ka email të vërtetë, ekrani e thotë qartë.

## 2. «Harruat fjalëkalimin?» në ekranin e hyrjes

**Email.** Shkruani emailin → «Dërgo lidhjen». Serveri dërgon një lidhje njëpërdorimshe (60 minuta) që hap drejtpërdrejt ekranin **Fjalëkalim i ri** brenda aplikacionit (`biobesfarm://reset`). Nëse emaili nuk hapet nga telefoni, lidhja mund të ngjitet me dorë te «E hapa lidhjen në kompjuter» — aplikacioni e pranon edhe si tekst.

**Telefon (SMS).** Ekrani ofron kod me SMS. **SMS nuk është aktiv në projekt**: `external_phone_enabled = false` dhe asnjë ofrues (Twilio/Vonage) nuk është lidhur. Aplikacioni e shpjegon këtë në vend që të dështojë në heshtje.

**Llogari me emër përdoruesi.** Llogaritë e vjetra hyjnë me emër përdoruesi dhe email-i i tyre i brendshëm është `emri@login.relikaj.al`, që nuk ekziston. Për këto llogari rivendosja bëhet nga administratori (pika 3), ose llogaria rikrijohet me email të vërtetë.

## 3. Administratori: «Përdoruesit»

Lista tregon **emailin, telefonin dhe hyrjen e fundit** të çdo anëtari (funksioni `member_contacts`, vetëm admini i kompanisë ose administratori i platformës). Prekni një anëtar:

- **Dërgo lidhje në email** — dërgon të njëjtën lidhje rivendosjeje si te pika 2.
- **Vendos fjalëkalim të përkohshëm** — krijon një fjalëkalim të rastësishëm 10-shkronjash, e shfaq në ekran për t'ia dhënë punonjësit; ai e ndryshon vetë te «Profili». Kjo rrugë **punon menjëherë**, pa email.

Krijimi i përdoruesit tani pranon **email** (rekomandohet) ose emër përdoruesi.

## 4. Çfarë duhet bërë në Supabase për email të vërtetë

Gjendja e projektit `xckyafmpzruklibdhxzx`:

| Cilësimi | Vlera sot | Kuptimi |
|---|---|---|
| `external_email_enabled` | `true` | Hyrja me email punon. |
| `disable_signup` | `true` | Vetëregjistrimi i hapur është mbyllur; përdoruesit krijohen nga admini. |
| `uri_allow_list` | `biobesfarm://reset, biobesfarm://**, http://localhost:3000` | Lidhja e emailit lejohet të kthehet në aplikacion. |
| `smtp_host` | `null` | **Pa server emaili të vetin.** |
| `rate_limit_email_sent` | `2` në orë | Kufi i shërbimit të provës së Supabase. |
| `password_min_length` | `6` | Serveri lejon 6; aplikacioni kërkon 8. |
| `sms_provider` / `external_phone_enabled` | `twilio` pa çelësa / `false` | SMS i pandërpiluar. |

Me `smtp_host` bosh, Supabase përdor postën e vet të provës: dërgon **vetëm në adresa të anëtarëve të ekipit të projektit** dhe me shumë pak email në orë. Pra **rivendosja me email punon vetëm për ju si pronar i projektit**, derisa të vendoset një server i vërtetë:

Faqja e panelit: **Authentication → Emails → SMTP Settings** (ndizni «Enable Custom SMTP»).
Kredencialet i jep vetëm pronari i llogarisë së emailit — nuk shkruhen në kod, në bisedë, as në këtë dokument.

### Opsioni A — Gmail / Google Workspace (2 minuta, pa DNS)

I shpejti, i mjaftueshëm për një ekip të vogël (deri ~500 email në ditë).

| Fusha në panel | Vlera |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | adresa e plotë, p.sh. `exhylali@gmail.com` |
| Password | **Fjalëkalim aplikacioni 16 shkronja** (jo fjalëkalimi i llogarisë) |
| Sender email | e njëjta adresë |
| Sender name | `BioBes Farm` |

Fjalëkalimi i aplikacionit: llogaria Google → **Siguria** → «Verifikimi në dy hapa» (duhet ndezur) → **Fjalëkalimet e aplikacioneve** → krijo «BioBes Farm» → kopjo 16 shkronjat (me hapësira, siç i jep Google).

### Opsioni B — Resend ose Brevo (profesional, dërgues `noreply@relikaj.al`)

1. Llogari te [resend.com](https://resend.com) ose [brevo.com](https://brevo.com) (plan falas).
2. Shtoni domenin `relikaj.al` dhe vendosni te DNS-ja e domenit rekordet që jep shërbimi (SPF, DKIM; zakonisht 3–4 rekorde TXT/CNAME). Pritni «Verified».
3. Në shërbim krijoni një **API key** me leje vetëm-dërgim.

| Fusha në panel | Resend | Brevo |
|---|---|---|
| Host | `smtp.resend.com` | `smtp-relay.brevo.com` |
| Port | `587` | `587` |
| Username | `resend` | emaili i llogarisë Brevo |
| Password | API key (`re_…`) | SMTP key nga Brevo |
| Sender email | `noreply@relikaj.al` | `noreply@relikaj.al` |
| Sender name | `BioBes Farm` | `BioBes Farm` |

### Pas ruajtjes (të dyja opsionet)

1. **Rate limit for sending emails** → `30` në orë (në vend të 2-shit të provës).
2. Përkthejini subjektet/template-t me tekstin shqip më poshtë (faqja **Emails → Templates**).
3. Prova: te aplikacioni «Harruat fjalëkalimin?» me emailin tuaj. Nëse s'arrin: Supabase → **Logs → Auth** tregon arsyen e saktë (`535`, `550`, DNS, rate limit).

### Rritja e gjatësisë minimale të fjalëkalimit në 8

**Authentication → Providers → Email → «Minimum password length» = 8** → Save.
(Ky cilësim nuk ndryshohet nga API-ja e integrimit; ndryshohet vetëm në panel. Aplikacioni e kërkon 8 që sot — kjo e bën edhe serverin ta refuzojë më të shkurtër.)

### Teksti shqip i emailit (kopjojeni në panel)

**Subject — Reset Password:**
`BioBes Farm — rivendosja e fjalëkalimit`

**Body:**
```html
<h2>Rivendosja e fjalëkalimit</h2>
<p>Kërkesa për të ndryshuar fjalëkalimin e llogarisë suaj në <strong>BioBes Farm</strong> u regjistrua.</p>
<p><a href="{{ .ConfirmationURL }}">Vendos fjalëkalim të ri</a></p>
<p>Lidhja vlen 60 minuta dhe hapet vetëm një herë. Nëse nuk e kërkuat ju, injorojeni këtë email — fjalëkalimi mbetet i njëjti.</p>
```

**Subject — Password Changed:** `BioBes Farm — fjalëkalimi u ndryshua`
```html
<h2>Fjalëkalimi u ndryshua</h2>
<p>Fjalëkalimi i llogarisë suaj në BioBes Farm sapo u ndryshua. Nëse nuk e bëtë ju, rivendoseni menjëherë dhe njoftoni administratorin.</p>
```

## 5. Si punon teknikisht

- Klienti: `resetPasswordForEmail(email, { redirectTo: "biobesfarm://reset" })`.
- Lidhja kthehet si `biobesfarm://reset#access_token=…&refresh_token=…&type=recovery` (ose `?token_hash=…`, ose `?code=…`). `src/auth/links.js` i njeh të treja trajtat dhe `App.js` e kap URL-në (`Linking.getInitialURL` + `Linking.addEventListener("url")`), e kthen në sesion dhe hap `src/auth/Reset.js`.
- Skema `biobesfarm` është deklaruar në `app.json` (`scheme` + `intentFilters` për Android).
- Tabela e kontakteve: `supabase/migrations/0008_kontaktet_e_anetareve.sql` — funksion `security definer` me leje vetëm për adminin e kompanisë (`member_role = 'admin'`) ose administratorin e platformës; `anon` s'e ekzekuton dot.
- Testet: `tests/auth_test.js` (25 raste) — trajtat e URL-së, gabimet e skadimit, dekodimi i vlerave.

## 6. Çfarë mbetet (me radhë)

1. SMTP i vërtetë + template-t shqip (pika 4) — pa këtë, emaili shkon vetëm te pronari i projektit. **Nuk mund të bëhet nga kodi**: kërkon fjalëkalimin/API key-n e llogarisë suaj të emailit, që vendoset vetëm në panelin e Supabase (2 minuta me Gmail, opsioni A).
2. Rritja e `password_min_length` në 8 në panel (rruga te pika 4; integrimi API nuk e lejon).
3. SMS vetëm nëse vendoset Twilio/Vonage me numër dërguesi (kosto reale për çdo mesazh).
4. Verifikimi me dy hapa (TOTP) — serveri e mban të gatshëm (`mfa_totp_enroll_enabled = true`), ekrani nuk është ndërtuar.
