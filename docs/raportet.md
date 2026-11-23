# Paketimi dhe kontrolli i raporteve

Aplikacioni Android gjeneron PDF/Excel në telefon nga `supabase/functions/reports/handler.ts`, por lexon të dhënat drejtpërdrejt nga Supabase me sesionin e përdoruesit. Kërkohet rrjet për të dhënat; ekrani i aplikacionit nuk thërret funksionin Edge `reports`. Funksioni Edge mbetet i disponueshëm për klientë të tjerë dhe përdor të njëjtën logjikë.

## Testet

`npm ci --legacy-peer-deps` dhe pastaj `npm test` kontrollojnë 20 lloje raportesh në PDF/Excel me të dhëna të simuluara, filtrin FedEx, disa gabime, paketimin, përcjelljen e `Authorization` dhe rrjedhat HTTP të simuluara. Testet e simuluara **nuk** provojnë RLS-në në prodhim.

Para dhe pas çdo publikimi provoni edhe me një sesion të autentikuar: përmbledhjen, planin e qarkullimit, DHL, FedEx, protokollin e mostrave dhe kartelën GBA në të dy formatet. Kontrolloni përmbajtjen kundrejt të dhënave të pritshme, provoni mungesën e JWT-së dhe sigurohuni që përdoruesi nuk sheh kompaninë tjetër. Për provat përdorni të dhëna dhe llogari të izoluara ose përdoruesin e autorizuar; mos ndani fjalëkalime apo token-e në bisedë.

## Publikimi i funksionit Edge

Burimi i mirëmbajtur është dosja `supabase/functions/reports/`; varësitë npm janë fiksuar te `deno.json`. Preferohet publikimi i gjithë dosjes me Supabase CLI (p.sh. `supabase functions deploy reports --project-ref <project-ref>`), me qasjen e konfiguruar tashmë në mjedisin e administrimit. Mbani verifikimin JWT **aktiv** dhe mos përdorni `--no-verify-jwt`. Mos përfshini token-e ose çelësa privatë në kod, Git apo bisedë.

Nëse mjeti i publikimit pranon vetëm një trup të vetëm, `npm run reports:package` krijon `out/reports/index.ts`. Skedari përmban kodin e raporteve të paketuar, të kompresuar dhe të verifikuar me SHA-256; deklaron statikisht varësitë npm të fiksuara dhe **nuk shkarkon burimin nga GitHub gjatë nisjes**. `out/` nuk ruhet në Git. Regjenerojeni sa herë që ndryshon burimi ose `deno.json`; mos redaktoni manualisht përmbajtjen e kompresuar.

Provoni së pari të njëjtin skedar në një funksion të përkohshëm me JWT aktiv, kontrolloni formatet, lejet dhe nisjen, dhe vetëm pastaj publikojeni si `reports`. Ruani një mënyrë rikthimi te versioni i mëparshëm dhe verifikoni një kërkesë të re pas publikimit. Paketimi lokal **nuk e publikon vetë** funksionin dhe as nuk ndryshon APK-në.
