# Gjurmim relikaj.al — Faza 1

Aplikacion i vërtetë mobil (Android + iPhone, Expo / React Native) me Supabase.

## Çfarë ka
- `supabase/migrations/0001_baza.sql` — kompani, anëtarë, role (admin, staf, grumbullues, fermer), fermerë, zona, produkte, blerje, magazinë, përmbledhje loti. RLS: çdo kompani sheh vetëm të dhënat e veta (testuar në Postgres lokal: `tests/test_baza.sql`).
- `supabase/functions/reports` — raporte Excel dhe PDF A4; paketimi, testimi dhe publikimi: `docs/raportet.md`.
- `supabase/functions/admin-users` — krijim përdoruesish nga admini.
- `app/` — aplikacioni Expo (hyrje, zgjedhje kompanie, blerje, magazinë, raporte, përdorues; fusha kërkimi me «+ Shto»).

## APK për telefon (Android)
Workflow-i **«Ndërto APK»** ndërton në PR dhe në degët e provës, por përditëson shkarkimin publik vetëm nga `main`. Ndërtimet e degëve ruhen si artefakte të Actions dhe nuk zëvendësojnë APK-në e publikuar. APK-ja nga `main` shkarkohet nga:
`https://github.com/genilufra-droid/relikaj-gjurmim/releases/download/apk-latest/BioBes-Farm.apk`
Ndërtimi zgjat ~12–18 min. Instalimi në telefon: hapeni lidhjen → «Install» (lejoni «Install unknown apps» për shfletuesin). APK-ja nënshkruhet me çelësin e provës së React Native, mjaftueshëm për testim; për Play Store duhet çelës i vetën (`eas build`).

## Hapat nga kompjuteri (projekti «relikaj-gjurmim» është krijuar dhe migrimet 0001 + 0002 janë aplikuar)
1. Supabase → projekti `relikaj-gjurmim` → Authentication → Users → Add user (email + fjalëkalim). Kopjoni User UID.
2. SQL Editor (zëvendësoni UID):
   `insert into platform_admins values ('<UID>');`
   `insert into companies (name, kind) values ('BioBes','biobes');`
3. Funksionet `reports` dhe `admin-users` janë vendosur tashmë në projekt (për ndryshime të ardhshme: `supabase functions deploy <emri>`).
4. `app/src/config.js` është plotësuar tashmë me URL-në dhe çelësin.
5. `cd app && npm install && npx expo start` (provë me aplikacionin Expo Go), ose `npx expo run:android`. Për dyqanet: `eas build`.

## Provat para publikimit
Testet lokale nuk zëvendësojnë provën në telefon dhe me një llogari të autorizuar e të dhëna reale. Për funksionin `reports`, kontrolloni gjithashtu nisjen, JWT-në dhe kufizimin midis kompanive pas çdo publikimi; udhëzimet janë te `docs/raportet.md`.

## Faza 2 (e re)
Klientë, dërgesa DHL dhe protokolli i mostrave (`0002_mostrat.sql`, ekrani «Mostra», vetëm admin/staf). Faturat DHL/FedEx dhe llogaritë e analizave si raporte vijnë më vonë.

## Faza 3+4 (si Cropin SmartFarm) — `0003_cropin.sql`
Parcelat me gjeotagim GPS (koordinata + hartë), kultivimet (mbjellje/vjelje), detyrat në fushë me afate dhe përgjegjës, vëzhgimet (dëmtues/sëmundje me foto dhe këshillë eksperti), inputet dhe trajtime, qiratë e tokës, pagesat dhe kujtuesit. Ekrane të reja: Pasqyra (dashboard + moti Open-Meteo), Parcelat, Kultivimet, Detyrat, Vëzhgimet, Inputet, Toka (qira, pagesa, kujtues). Fotot e fushës ruhen në Storage «field-photos». Zbatimi: ekzekutoni `0003_cropin.sql` në Supabase dhe provoni me `tests/test_cropin.sql`.

## Dizajni dhe dokumentet (v0.2)
- Ndërfaqe e re profesionale: kryetar me kompaninë/rolin, shirit tab-esh me ikona, kartela KPI, filtra dhe kërkim në çdo listë, gjendje bosh me udhëzim, gabime me «Provo përsëri».
- **Dokumentet** (`0004_dokumentet.sql`): foto nga kamera ose galeria dhe skedarë PDF/Word/Excel (kontrata, analiza toke, fatura) të lidhura me parcelën; ruhen në Storage `field-docs` / `field-photos`.
- **Raportet krijohen në telefon** (Excel/PDF me të njëjtin kod si funksioni në server): të dhënat lexohen nga Supabase me lejet e përdoruesit dhe kërkojnë rrjet; aplikacioni nuk varet nga funksioni Edge për gjenerimin e tyre.

## Faza 5
Kartela e gjurmueshmërisë (PDF/Excel) për çdo lot: vjelja → magazina → mostrat → inputet. Shembull i gjeneruar: `docs/kartela-gjurmueshmerise-shembull.pdf`. Faturat DHL/FedEx dhe llogaritë e analizave si raporte, import i të dhënave reale, punë pa internet.

## Faza 6 — gjurmueshmëria e plotë (v0.3) — `0005_gjurmueshmeria.sql`, `0006_mostra_dhe_grumbullimi.sql`
Zinxhiri i biznesit sipas BioBes-it real: **tokë (edhe djerr) → qira/kontratë → punime (plugim, frezim, lesë, nivelim) → mbjellje dhe trajtime (pleh, pesticid, foliar, ujitje; me ditë pritjeje para vjeljes) → korrje nga fermeri → grumbulluesi i zonës → dorëzim në qendër → përpunim (tharje, pastrim, prerje, klasifikim, vaj, paketim) → mostër në parcelë ose qendër → eksport te klienti me dokument**.

- **Skema:** zonat me `collector_name`/`collectionPoint`/`region`, parcelat me `ownership` (pronësi/qira/e egër) dhe `status` (aktive/djerr/pushim), qira me afat e garanci, `land_operations`, `applications` (me `phi_days`), `batches` (me rendiment), pagesa me `paid_by` (kompani/grumbullues) dhe `receipt_no`, eksport me `customer_id`/`document_no`, dokumente biznesi (kontratë, faturë, fletë dorëzimi, certifikatë).
- **Pamjet:** `zone_summary`, `lot_chain`, `lot_plots`, `plot_activity`, `batch_summary`, `purchase_payments` (të gjitha `security_invoker`, pra RLS vlen).
- **Ekranet e reja:** *Gjurmueshmëria* (lot → parcela/fermer/grumbullues → mostra → përpunim → eksport, ose parcelë → historiku), *Puna në tokë* (punime + trajtime), *Përpunimi*, *Zonat*, plus menuja *Modulet*; blerjet lidhen me parcelën, mostrat me vendin e marrjes dhe laboratorin.
- **Raportet:** kartela e gjurmueshmërisë tani përmban parcelat, grumbulluesin, mostrat (vend, laborator, lagështi, pastërti, vendim), batch-et me rendiment dhe eksportin me klient/dokument; shtohet **Raport zonash dhe grumbulluesish**.
- **Testet:** `tests/test_gjurmimi.sql` (zinxhiri + RLS: fermeri sheh parcelën e vet, kompania tjetër s' sheh asgjë).
- **Analiza e biznesit:** `docs/analiza-gjurmueshmeria.md` — rrjedha reale, rolet, 15 pyetjet e gjurmueshmërisë dhe ku përgjigjen në aplikacion.

## Faza 7 — llogaria e përdoruesit (v0.7) — `0008_kontaktet_e_anetareve.sql`
Rrjedha e plotë e fjalëkalimit, siç pritet nga një sistem i vërtetë:

- **Profili** (prekni roolin lart djathtas): të dhënat e llogarisë, ndryshim fjalëkalimi me verifikim të atij aktual, dalje.
- **«Harruat fjalëkalimin?»** në ekranin e hyrjes: lidhje rivendosjeje me email që hap drejtpërdrejt ekranin *Fjalëkalim i ri* brenda aplikacionit (skema `biobesfarm://reset`), mundësi për të ngjitur lidhjen me dorë, dhe rrugë me kod SMS (e shpjeguar qartë, sepse ofruesi SMS nuk është aktiv).
- **«Përdoruesit»**: emaili, telefoni dhe hyrja e fundit e çdo anëtari; butonat *Dërgo lidhje në email* dhe *Vendos fjalëkalim të përkohshëm*; krijimi i përdoruesit pranon email të vërtetë.
- **Siguria:** vetëregjistrimi u mbyll (`disable_signup`), lidhjet lejohen vetëm për `biobesfarm://`, funksioni `member_contacts` hapet vetëm për adminin e kompanisë.
- **Dokumenti:** `docs/fjalekalimi.md` — gjendja reale e serverit, teksti shqip i emailit dhe hapat për SMTP të vërtetë (pa SMTP, posta e provës së Supabase shkon vetëm te pronari i projektit).
- **Testet:** `tests/auth_test.js` — 25 raste për trajtat e lidhjes (hash, `token_hash`, `code`, gabime skadimi, dekodim).

## v0.7.1 — rregullim i ekraneve me listë
Ekranet **Parcelat, Shpenzimet/Blerjet, Mostrat, Zonat dhe Puna në tokë** binin (ekran bosh i gjelbër) sapo lista kishte të paktën një rresht, sepse përdornin `ChipRow` pa e importuar. U rregullua në të pesë skedarët, u shtua **kufiri i gabimeve** (`src/ErrorBoundary.js`) që një gabim i ardhshëm të shfaqë mesazh e «Provo përsëri» në vend të ekranit bosh, dhe u shtua testi i renderimit të 19 ekraneve (`npm test`, `tests/smoke/`). Skedari `src/reports.js` u riemërua `src/reportBuilder.js` që të mos përplaset me `src/Reports.js` në sistemet me shkronja të vogla/të mëdha të pandryshueshme (macOS/Windows).

## Faza 8 — grumbulluesi dhe email-i i llogarive (v0.8.0)
- **Pamja e grumbulluesit** (`src/Field.js`): kur roli është `grumbullues`, tab-i «Pasqyra» hapet me punën e ditës — dy veprime të mëdha (**Blerje**, **Mostër**), sasia dhe vlera e sotme, dhe lista e regjistrimeve të ditës me tërheqje për rifreskim. Pa menu të panevojshme.
- **Email i vërtetë për llogaritë ekzistuese**: te «Përdoruesit» → anëtari → fusha *Email i llogarisë* + «Ruaj emailin» (veprim i ri `set_email` te `admin-users`, v2 në server). Email-i konfirmohet menjëherë, fjalëkalimi nuk ndryshon, dhe nga ai moment llogaria hyn me email e mund të rivendosë vetë fjalëkalimin. Email-et e brendshme `@login.relikaj.al` refuzohen.
- Testet e renderimit mbulojnë tani 20 ekrane, përfshirë `Field` me regjistrime.

## Faza 9 — backup dhe rikthim (v0.9.0)
- **Backup i kompanisë** (`supabase/functions/backup`, ekrani `src/Backup.js`, Modulet → Administrimi): 21 tabela në një skedar `.json`, krijuar në server me lejet e përdoruesit, i ruajtur në telefon me menunë e ndarjes.
- **Rikthim** me provë paraprake (dry-run) dhe më pas shkrim: shton vetëm, ripërdor rreshtat ekzistues sipas kodit/emrit dhe **rihartëzon lidhjet** (një backup i vjetër rindërton `farmer_id`, `plot_id`, `product_id`… të sakta). Nuk fshin asgjë.
- **Rregullim i vlerës së blerjes:** `purchases.amount` nuk shkruhej kurrë (mbetej 0); tani llogaritet në bazë me trigger (`0009_vlera_e_blerjes.sql`) dhe u plotësuan 11 blerjet ekzistuese — 951.300 lekë që më parë s'shfaqeshin në raporte.
- Dokumenti: `docs/backup.md` (çka përfshihet, si rikthehet, kufizimet).

## Faza 10 — draftet dhe fletët e magazinës në PDF (v0.10.0)
- Nga të dhënat e blerjeve dhe daljeve krijohen **drafte të brendshme blerjeje/shitjeje**, si dhe **fletë hyrje/dalje**. Menuja: *Qendra dhe eksporti → Printo*; shkurtore edhe te «Blerjet» dhe «Magazina».
- **Draftet nuk janë fatura të fiskalizuara.** Aplikacioni nuk është i integruar me sistemin e fiskalizimit (CIS) dhe nuk kryen transmetim apo verifikim fiskal. Për faturë fiskale duhet përdorur sistemi përkatës; për kërkesat ligjore konsultohuni me kontabilistin.
- Çdo faqe e draftit shënohet «DRAFT — JO E FISKALIZUAR». Numri nga `doc_number` është vetëm referencë e brendshme; nuk shfaqen NSLF, NIVF ose QR. Funksioni historik i bazës `doc_nslf` nuk përdoret dhe nuk është kod fiskal i verifikuar.
- **Kujdes për versionet e mëparshme:** PDF-të e krijuara më parë mund të përmbajnë një pseudo-NSLF lokal dhe formulime të pasakta mbi fiskalizimin. Ato nuk provojnë fiskalizim dhe nuk ndryshohen nga përditësimi.
- **Fletët e magazinës** përmbajnë numrin e brendshëm të dokumentit, datën, magazinën, palën, artikujt dhe hapësira për nënshkrime.
- **Të dhënat e kompanisë** te *Printo → Të dhënat fiskale* ruhen te `companies` dhe përdoren në dokumente (`0011_fiskal_kompania_admin.sql`). Printimi dhe ndarja përdorin dialogun Android, `expo-print` dhe `expo-sharing`.
- **Testet**: `tests/print_test.js` kontrollon PDF-të, formatimin, faqet e shumta dhe paralajmërimin në çdo faqe; testi i renderimit mbulon 22 ekrane.
