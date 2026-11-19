# Gjurmim relikaj.al — Faza 1

Aplikacion i vërtetë mobil (Android + iPhone, Expo / React Native) me Supabase.

## Çfarë ka
- `supabase/migrations/0001_baza.sql` — kompani, anëtarë, role (admin, staf, grumbullues, fermer), fermerë, zona, produkte, blerje, magazinë, përmbledhje loti. RLS: çdo kompani sheh vetëm të dhënat e veta (testuar në Postgres lokal: `tests/test_baza.sql`).
- `supabase/functions/reports` — raporte Excel dhe PDF A4 (përmbledhje, fletë vjelje, fermeri, lista e mbledhësve).
- `supabase/functions/admin-users` — krijim përdoruesish nga admini.
- `app/` — aplikacioni Expo (hyrje, zgjedhje kompanie, blerje, magazinë, raporte, përdorues; fusha kërkimi me «+ Shto»).

## APK për telefon (Android)
Ekzekutoni workflow-in **«Ndërto APK»** te GitHub → Actions (ose thjesht bëni push: ndërtohet vetë). APK-ja shkarkohet nga:
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

## Çfarë NUK është provuar ende
Funksionet në Deno/Supabase të vërtetë, aplikacioni në telefon, dhe ekzekutimi i migrimit në projektin real. Kontrolluar: skema + RLS (Postgres lokal), gjenerimi i raporteve, sintaksa e aplikacionit.

## Faza 2 (e re)
Klientë, dërgesa DHL dhe protokolli i mostrave (`0002_mostrat.sql`, ekrani «Mostra», vetëm admin/staf). Faturat DHL/FedEx dhe llogaritë e analizave si raporte vijnë më vonë.

## Faza 3+4 (si Cropin SmartFarm) — `0003_cropin.sql`
Parcelat me gjeotagim GPS (koordinata + hartë), kultivimet (mbjellje/vjelje), detyrat në fushë me afate dhe përgjegjës, vëzhgimet (dëmtues/sëmundje me foto dhe këshillë eksperti), inputet dhe trajtime, qiratë e tokës, pagesat dhe kujtuesit. Ekrane të reja: Pasqyra (dashboard + moti Open-Meteo), Parcelat, Kultivimet, Detyrat, Vëzhgimet, Inputet, Toka (qira, pagesa, kujtues). Fotot e fushës ruhen në Storage «field-photos». Zbatimi: ekzekutoni `0003_cropin.sql` në Supabase dhe provoni me `tests/test_cropin.sql`.

## Faza 5
Kartela e gjurmueshmërisë (PDF/Excel) për çdo lot: vjelja → magazina → mostrat → inputet. Shembull i gjeneruar: `docs/kartela-gjurmueshmerise-shembull.pdf`. Faturat DHL/FedEx dhe llogaritë e analizave si raporte, import i të dhënave reale, punë pa internet.
