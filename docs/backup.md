# Backup dhe rikthim i të dhënave

Versioni 0.9.0 shton backup-in e plotë të kompanisë: një skedar i vetëm `.json`, i krijuar në server, që ruhet në telefon dhe rikthehet po prej atij skedari. Vetëm **administratori** e shikon dhe e përdor (Modulet → Administrimi → **Backup**).

## Çfarë përfshihet

21 tabela të kompanisë, në rendin e varësisë:

`warehouses, zones, farmers, products, customers, plots, leases, cultivations, purchases, shipments, samples, stock_moves, tasks, observations, inputs, applications, land_operations, payments, batches, reminders, documents`

**Nuk përfshihen:** fjalëkalimet dhe përdoruesit (ata jetojnë te autentikimi), si dhe vetë skedarët e fotove/dokumenteve në Storage — backup-i ruan vetëm regjistrat e tyre (emrin, lidhjen, madhësinë). Kjo është e qëllimshme: skedarët nuk duhet të kalojnë si tekst në një skedar JSON.

## Si krijohet

1. Modulet → Administrimi → **Backup** → «Krijo dhe ruaj skedarin».
2. Serveri lexon të gjitha tabelat me lejet e tua (RLS-i vlen edhe për backup-in), i paketon dhe aplikacioni shkruan skedarin `BioBes-Backup-VVVV-MM-DD-HHMM.json`.
3. Hapet menuja e ndarjes së telefonit: ruaje në Google Drive, dërgoje me email, ose mbaje në dosje.

Këshillohet: një backup **para çdo importimi të madh** dhe një në javë. Skedari mbahet edhe jashtë telefonit — telefoni humbet, skedari i ruajtur në re jo.

## Si rikthehet

1. «Zgjidh skedarin .json» → zgjidh backup-in.
2. Aplikacioni bën **provë pa shkruar** (dry-run) dhe tregon: sa rreshta do të shtohen, sa ekzistojnë, sa anashkalohen.
3. «Rikthe tani» → konfirmim → shkrimi.

Rregullat e rikthimit:

- **Nuk fshihet asgjë.** Backup-i vetëm shton ose ripërdor.
- **Ripërdorja bëhet sipas kyçit natyral:** zona sipas kodit, produktet sipas kodit, fermerët sipas numrit të ID-së, parcelat sipas kodit, depos dhe klientët sipas emrit. Nëse ekziston, rreshti nuk dublikohet.
- **Lidhjet rihartëzohen:** backup-i mban ID-të e vjetra; gjatë rikthimit çdo lidhje (`farmer_id`, `plot_id`, `product_id`, …) kalon te ID-ja e re e rreshtit të krijuar. Kështu një backup i marrë nga një bazë tjetër (ose pas fshirjesh) rindërton lidhjet e sakta.
- Nëse prindi mungon, lidhja lihet bosh dhe rreshti numërohet te «të anashkaluarit» me arsyen.

## Kufizime të njohura

- Rikthimi bën një kërkim për çdo rresht (jo një transaksion i vetëm). Për disa mijëra rreshta zgjat minuta; për qindra është i menjëhershëm.
- Backup-i është **i kompanisë**, jo i gjithë projektit: nuk përmban përdorues, role, çelësa ose konfigurim.
- Nuk ka rivendosje «me një klik» të bazës nga faqja e Supabase — për atë përdoret paneli i Supabase (Database → Backups), që mbulon edhe përdoruesit.

## Teknikisht

- Funksioni: `supabase/functions/backup/index.ts` (i vendosur në projekt), veprimet `export` dhe `import`, `verify_jwt: true`.
- Lejet: `is_platform_admin()` ose `member_role(company) = 'admin'`, si te `admin-users`.
- Formati: `{ format: "biobes-backup", version: 1, created_at, company, counts, tables }`. `version` mbron nga skedarët e një versioni më të ri.
- Skema e tabelave dhe lidhjet gjenden në `SCHEMA` brenda funksionit — kur shtohet një tabelë e re, shtohet edhe aty.
- Vlera e blerjes (`purchases.amount`) tani llogaritet në bazë: `0009_vlera_e_blerjes.sql` (trigger `purchases_amount`), kështu që backup-i dhe raportet marrin shumën e saktë edhe kur rreshti vjen nga importi.
