# BioBes Farm — arkitektura (për ekipin teknik)

**Qëllimi:** gjurmueshmëri e plotë nga toka te klienti: tokë → qira → shpenzime parcele → vjelje → blerje nga fermerët → magazina e grumbulluesit → dorëzim te BioBes → protokolli i mostrave → kartela e gjurmueshmërisë (PDF/Excel/grafik). Përdoret nga BioBes, grumbulluesit, fermerët dhe kompani të tjera nën relikaj.al.

## Pjesët
| Pjesa | Vendi | Teknologjia |
|---|---|---|
| Aplikacioni mobil (Android, iPhone) | rrënja: `App.js`, `src/` | React Native (Expo SDK 51), supabase-js |
| Baza dhe leje | `supabase/migrations/` | PostgreSQL 17 (Supabase), RLS |
| Raporte Excel dhe PDF | `supabase/functions/reports` | Edge Function (Deno), jszip, pdf-lib |
| Krijim përdoruesish | `supabase/functions/admin-users` | Edge Function me çelës shërbimi |
| Testet | `tests/` | SQL (psql) dhe bun/TypeScript |
| Ndërtim APK | `.github/workflows/android.yml` | GitHub Actions |
| Prototipi i parë | `ferma-smart/` | HTML i vetëm |

Projekti Supabase: `relikaj-gjurmim` (ref `xckyafmpzruklibdhxzx`, eu-central-1).

**Funksionet si Cropin SmartFarm** (zgjerim i BioBes Farm): parcelat me gjeotagim GPS + hartë, kultivimet, detyrat/workflows me afate, vëzhgimet (dëmtues/sëmundje me foto dhe këshillë), inputet/trajtimet, qiratë, pagesat, kujtuesit, dashboard me alarme dhe moti (Open-Meteo, pa çelës), gjurmueshmëri nga parcela te klienti (kartela e gjurmueshmërisë). Moti satelitor dhe SMS bulk mbeten jashtë — duhen shërbime me pagesë.

## Model të dhënash (faza 1–4)
`companies` → `members` (roli: admin, staf, grumbullues, fermer) · `farmers`, `zones`, `products`, `warehouses` · `purchases` · `stock_moves` · `customers`, `shipments`, `samples` · `plots` (GPS), `cultivations`, `tasks`, `observations`, `inputs`, `leases`, `payments`, `reminders`. Çdo rresht ka `company_id`; RLS lejon vetëm anëtarët e kompanisë. Administratori i platformës (`platform_admins`) sheh të gjitha. Pamjet: `lot_summary`, `stock_by_lot`, `dashboard_stats`, `plot_summary`, `lease_summary`.

## Rregulla kryesore (në trigger)
- Kodi i lotit: `zona-korrja-produkt-VV`, p.sh. `W010F/1a-I-115-26` (F = Fair Wild, korrja I/II/III, kodi i produktit, viti).
- `amount = round(qty_dry * price, 2)`.
- Çdo blerje krijon vetë hyrjen në magazinë (`stock_moves.kind = 'blerje'`); hyrjet e tilla nuk futen me dorë.
- Fermeri sheh vetëm blerjet e veta; mostrat, klientët dhe dërgesat vetëm admin dhe staf.
- Parcelat: fermeri sheh ato që i janë caktuar (`farmer_id`), detyrat e veta dhe mund t'i mbyllë; mund të raportojë vëzhgime nga parcelat e veta. Inputet, qiratë dhe kujtuesit janë vetëm për staf.
- Triggerat e `0003` nuk lejojnë lidhje mes kompanive të ndryshme (parcelë↔zonë/fermer, kultivim↔produkt, detyrë/vëzhgim/input↔parcelë).

## Raportet
Një model i vetëm rrjete qelizash (`types.ts`) vizatohet nga dy shkrues: XLSX (`xlsx.ts`) dhe PDF A4 (`pdf.ts`), që Excel dhe PDF të jenë identikë. Formatet ndjekin Excel-et e BioBes (`defs.ts`).

## Statusi
- Bërë: faza 1 (përdorues, role, blerje, magazinë, raporte), faza 2 (mostra, klientë, dërgesa), faza 3+4 (`0003_cropin.sql`: parcela me GPS, kultivime, detyra, vëzhgime me foto, inpute, qira, pagesa, kujtues, pasqyrë me alarme dhe mot) dhe faza 5 (kartela e gjurmueshmërisë).
- Provuar: skema dhe RLS në Postgres lokal; blerje dhe raporte në telefon (Android).
- Nuk është provuar: iPhone, magazina në telefon, ngarkesa reale.
- Mbetet: ekzekutimi i `0003_cropin.sql` dhe `tests/test_cropin.sql` në projektin Supabase; faturat DHL/FedEx dhe llogaritë e analizave si raporte; import i të dhënave reale; punë pa internet; moti satelitor dhe SMS bulk (shërbime me pagesë).

## Si nisen
Shih `README.md`.

## Shënime sigurie
- Çelësi në `src/config.js` është publik (anon). Mos shto çelës shërbimi në aplikacion.
- `farmers.id_number` ruan numra identiteti: të kufizohet qasja dhe të shihet ligji për të dhënat personale.
