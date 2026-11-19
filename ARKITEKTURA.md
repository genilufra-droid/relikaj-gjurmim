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

## Model të dhënash (faza 1 dhe 2)
`companies` → `members` (roli: admin, staf, grumbullues, fermer) · `farmers`, `zones`, `products`, `warehouses` · `purchases` · `stock_moves` · `customers`, `shipments`, `samples`. Çdo rresht ka `company_id`; RLS lejon vetëm anëtarët e kompanisë. Administratori i platformës (`platform_admins`) sheh të gjitha.

## Rregulla kryesore (në trigger)
- Kodi i lotit: `zona-korrja-produkt-VV`, p.sh. `W010F/1a-I-115-26` (F = Fair Wild, korrja I/II/III, kodi i produktit, viti).
- `amount = round(qty_dry * price, 2)`.
- Çdo blerje krijon vetë hyrjen në magazinë (`stock_moves.kind = 'blerje'`); hyrjet e tilla nuk futen me dorë.
- Fermeri sheh vetëm blerjet e veta; mostrat, klientët dhe dërgesat vetëm admin dhe staf.

## Raportet
Një model i vetëm rrjete qelizash (`types.ts`) vizatohet nga dy shkrues: XLSX (`xlsx.ts`) dhe PDF A4 (`pdf.ts`), që Excel dhe PDF të jenë identikë. Formatet ndjekin Excel-et e BioBes (`defs.ts`).

## Statusi
- Bërë: faza 1 (përdorues, role, blerje, magazinë, raporte) dhe faza 2 (mostra, klientë, dërgesa).
- Provuar: skema dhe RLS në Postgres lokal; blerje dhe raporte në telefon (Android).
- Nuk është provuar: iPhone, magazina në telefon, ngarkesa reale.
- Mbetet: faza 3 (tokë, qira, pagesa, kujtues), faza 4 (shpenzime parcele, trajtime), faza 5 (kartela e gjurmueshmërisë), faturat DHL/FedEx dhe llogaritë e analizave si raporte, import i të dhënave reale, punë pa internet.

## Si nisen
Shih `README.md`.

## Shënime sigurie
- Çelësi në `src/config.js` është publik (anon). Mos shto çelës shërbimi në aplikacion.
- `farmers.id_number` ruan numra identiteti: të kufizohet qasja dhe të shihet ligji për të dhënat personale.
