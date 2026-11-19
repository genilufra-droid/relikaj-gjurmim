# BioBes Farm — Analiza e biznesit dhe gjurmueshmëria

_Dokument pune për zhvillimin e «zgjerimit» Cropin të aplikacionit BioBes Farm._
_Burimet: biobes.al (Who we are, produktet), rrjedha reale e grumbullimit Tepelenë/Çorovodë, dhe kërkesat e pronarit të biznesit._

---

## 1. Çfarë është biznesi sot

| Të dhëna | Vlera |
|---|---|
| Kompania | BIOBES Ltd (Besnik Koçi), themeluar 2014 mbi fermën familjare të 1992 |
| Certifikime | Organike që nga 2010; EU 834/2007 dhe NOP (SHBA) |
| Toka | ~130 ha në kultivim + vjelje e egër në zona malore |
| Produkte | 100+ artikuj, 8 kategori: lule, fruta, rrënjë, fara, erëza, lëvore, vajra esencialë, gjethe |
| Struktura | Magazinë 2016 me linja tharjeje, pastrimi, prerjeje dhe klasifikimi; 2019 linja vaji esencial + klasteri i Tepelenës |
| Grumbullimi | 5+ pika grumbullimi, 400+ bashkëpunëtorë (fermerë të vegjël + vjelës të egër) |
| Tregjet | BE, SHBA, Lindja e Mesme; klientë si Sonnentor |
| Partnerë | IPARD, Helvetas, OTD, AZHBR, BioInspecta, AlbInspect, RisiAlbania |

**Modeli i të ardhurave:** BioBes blen lëndë të parë të njomë ose të thatë nga fermerë të vegjël përmes
grumbulluesve të zonës, e përpunon në qendër dhe e shet (eksport) te klientë të huaj me kërkesa
dokumentuese: certifikatë organike, kodi i lotit, mostrat e laboratorit, dokumentet e dorëzimit.

**Rreziku kryesor që mbulon aplikacioni:** humbja e lidhjes «mall → parcelë → fermer → grumbullues → klient».
Pa këtë lidhje, certifikimi organik dhe shitja te klientët e huaj bien; me të, kompania mund të provojë
origjinën për çdo kg.

---

## 2. Rrjedha reale e punës (nga toka te klienti)

```
TOKA (e zotëruar / me qira / djerr)
  └─ Parcela (GPS, sipërfaqe, lartësi, zonë, fermer)
       ├─ Qiraja: pronar, afat (muaj), qira vjetore, garanci, kontratë (PDF)
       ├─ Punimet e tokës: plugim, frezim, lesë, mihje, nivelim, kositje, transport  → kosto/ha
       ├─ Kultivimi: mbjellja, produkti, faza
       ├─ Trajtimet: pleh, pesticid, foliar, ujitje, biologjik → doza, kosto, pritje (ditë) para vjeljes
       ├─ Inputet: fara, plehra, karburant, punë, makineri
       ├─ Vëzhgimet dhe detyrat (dëmtues, sëmundje, punë e ekipit)
       └─ KORRJA
            └─ Blerje nga fermeri → LOT (zona-korrja-produkt-viti), klasa I/II/III, kg njomë/thatë, çmim
                 ├─ Pagesa nga kompania ose nga grumbulluesi → faturë/fletëpagesë
                 ├─ MOSTRA: në parcelë ose në qendër → laborator, lagështi, pastërti, kaluar/refuzuar
                 ├─ DORËZIMI në qendër (grumbulluesi → BioBes) → fletë dorëzimi
                 ├─ PËRPUNIMI: tharje, pastrim, prerje, klasifikim, vaj, paketim → rendiment %
                 └─ EKSPORTI te klienti → dokument, tracking, mostër e klientit
```

### Kush bën çfarë (rolet në aplikacion)

| Rol | Çfarë bën në realitet | Çfarë sheh/bën në aplikacion |
|---|---|---|
| `admin` | Pronari / drejtori | Gjithçka, përdoruesit, raportet, fshirjet |
| `staf` | Agronom / zyra e qendrës | Parcelat, kultivimet, trajtimet, mostrat, përpunimin, raportet |
| `grumbullues` | Mbulon deri ~50 parcela në një zonë; mbledh mallin, paguan fermerët | Zonën e vet, blerjet, mostrat në parcelë, pagesat që ka bërë |
| `fermer` | Kultivon parcelën, dorëzon mallin | Vetëm parcelat, detyrat dhe pagesat e veta |

---

## 3. Modeli i të dhënave (implementuar, migrimet 0001–0006)

| Koncept | Tabela / pamja | Fushat kyçe |
|---|---|---|
| Zona e grumbullimit | `zones` / `zone_summary` | `code`, `collector_name`, `collection_point`, `region`, `fair_wild` |
| Parcela | `plots` | `ownership` (owned/leased/wild), `status` (active/fallow/resting), `altitude`, `organic`, `lat/lng` |
| Qiraja | `leases` | `owner_name`, `term_months`, `deposit`, `status`, `rent_amount` |
| Punimet e tokës | `land_operations` | `kind` (plow/till/harrow/subsoil/level/mow/haul), `contractor`, `hours`, `cost` |
| Trajtimet | `applications` | `kind` (fert/pesticide/foliar/irrigation/biological), `dose`, `phi_days`, `organic_ok` |
| Korrja | `purchases` | `plot_id`, `cultivation_id`, `lot_code`, `qty_fresh`, `qty_dry`, `price` |
| Pagesa | `payments` / `purchase_payments` | `purchase_id`, `paid_by` (company/collector), `receipt_no`, `remaining` |
| Mostra | `samples` | `point` (plot/center/warehouse), `plot_id`, `lab`, `moisture`, `purity`, `passed` |
| Përpunimi | `batches` / `batch_summary` | `method`, `source_lot`, `input_qty`, `output_qty`, `yield_pct` |
| Magazina / eksporti | `stock_moves` | `kind` (dorezim/eksport), `customer_id`, `document_no` |
| Dokumentet | `documents` | `lease_id`, `purchase_id`, `stock_move_id`, `sample_id`, `kind` (kontrate/fature/flete/certifikate) |
| Zinxhiri i lotit | `lot_chain`, `lot_plots`, `plot_activity` | përgjigjet e gjurmueshmërisë në një pyetës |

Të gjitha pamjet janë `security_invoker`, pra RLS-ja e përdoruesit vlen edhe kur ai hap raportin.

---

## 4. Pyetjet e gjurmueshmërisë që aplikacioni përgjigjet

> Shembulli i pronarit: «Kjo ferrë e zezë — nga cila parcelë, cili fermer, cili grumbullues erdhi?»

| # | Pyetja e klientit / inspektorit | Ku përgjigjet në aplikacion |
|---|---|---|
| 1 | Nga cila parcelë vjen loti? | **Gjurmimi → Sipas lotit** → «Parcelat dhe fermerët» (`lot_plots`) |
| 2 | Cili fermer e ka prodhuar? | Po ai ekran: emri, zona, dorëzimet, kg |
| 3 | Cili grumbullues e ka mbledhur dhe në cilën pikë? | «Vjen nga … grumbulluar nga …» (`lot_chain.collector`) + **Zonat** |
| 4 | Kur është vjelë dhe sa kg njomë/thatë? | Karta «Sasi e njomë / thatë» + tabela e vjeljeve |
| 5 | Çfarë trajtimesh ka marrë parcela? | **Gjurmimi → Sipas parcelës** → historik (`plot_activity`) dhe **Puna në tokë → Trajtimet** |
| 6 | A është respektuar pritja para vjeljes (PHI)? | Trajtimet: `phi_days` + sinjalizim «ende brenda afatit» |
| 7 | Sa kushton toka (qira + punime + trajtime)? | **Toka** (qira/pagesa) + «Kosto e regjistruar» në parcelë + Raport parcelash |
| 8 | Ku u mor mostra dhe si doli? | Mostrat: vendi (parcelë/qendër), laboratori, lagështia, pastërtia, kaluar/refuzuar |
| 9 | Çfarë përpunimi ka kaluar loti dhe me çfarë rendimenti? | Përpunimi: batch, metodë, hyrje→dalje, `yield_pct` |
| 10 | Kur u dorëzua në qendër dhe kush e pranoi? | Magazina: `dorezim`, pala, dokumenti |
| 11 | Te cili klient shkoi dhe me çfarë dokumenti? | Magazina: `eksport`, klienti, `document_no` |
| 12 | Sa i është paguar fermerit dhe kush e ka paguar? | Pagesat: `paid_by`, `receipt_no`; `purchase_payments` për mbetjen |
| 13 | Sa parcela/fermerë mbulon një grumbullues? | **Zonat** (`zone_summary.plots/farmers`) + Raport zonash |
| 14 | A është tokë djerr që u vu në prodhim? | Parcela: `status=fallow` → `active`, `ownership=wild/leased` |
| 15 | Dokumenti i qirasë / fatura e korrjes | Dokumentet: lidhja `lease_id` / `purchase_id` |

Zinxhiri i plotë me një klik: **Gjurmueshmëria → loti → Kartela e gjurmueshmërisë (Excel/PDF)** —
parcela, fermerë, grumbulluesi, mostrat, përpunimi, magazina, eksporti, inputet.

---

## 5. Ekranet (aplikacioni mobil, shqip)

| Ekran | Roli kryesor | Përmbajtja |
|---|---|---|
| Pasqyra | të gjithë | KPI, punë e ditës, paralajmërime |
| Parcelat | staf/fermer | GPS, sipërfaqe, pronësi, status, kosto |
| Modulet | të gjithë | Hyrja e grupuar në të gjitha modulet |
| Gjurmueshmëria | të gjithë | Loti → zinxhiri; Parcela → historiku |
| Puna në tokë | staf/grumbullues | Punimet dhe trajtimet me kosto/PHI |
| Blerjet | grumbullues | Marrja nga fermeri, parcela, loti |
| Mostrat | staf/grumbullues | Vendi i marrjes, laboratori, rezultatet |
| Zonat | admin/staf | Grumbulluesi, pika, parcelat, kg |
| Përpunimi | staf | Batch-et dhe rendimenti |
| Magazina | staf | Dorëzime, eksport, klient, dokument |
| Toka | admin/staf | Qira, pagesa, kujtues |
| Dokumentet | të gjithë | Foto dhe PDF të lidhura |
| Raporte | admin/staf | 9 raporte × Excel/PDF |

---

## 6. Raportet

1. Përmbledhje vjetore lotesh — 2. Fletë vjelje për lot — 3. Përmbledhje fermeri —
4. Lista e mbledhësve — 5. **Kartela e gjurmueshmërisë** (parcelë, grumbullues, mostra, batch, eksport) —
6. Raport parcelash — 7. Raport inputesh — 8. Raport detyrash — 9. **Raport zonash dhe grumbulluesish**.

---

## 7. Çfarë mbetet (radha e rekomanduar)

1. **Të dhëna reale**: 130 ha, 8 kategori produktesh, 5 pika grumbullimi, 400+ fermerë — import nga Excel-i i BioBes.
2. **Aplikacion për grumbulluesin offline**: ruajtje lokale e blerjeve kur s'ka internet në mal dhe sinkronizim më vonë.
3. **Fatura dhe fletëpagesa PDF** me logon e kompanisë, të nënshkruara nga grumbulluesi dhe fermeri.
4. **Certifikata organike**: skadenca, inspektimi vjetor, lidhja me parcelën dhe lotin.
5. **Kontrolli i cilësisë në pranim**: pesha e pranuar vs. e deklaruar, penalitete lagështie.
6. **Paneli i klientit** (link i lotit për blerësin) dhe eksporti CSV për sistemet e blerësit.

_Shënim: satelitët/NDVI, SMS masiv dhe integrimi me kuriere janë jashtë fokusit të kësaj faze._
