# Asistenti me zë — si punon

Asistenti kthen një fjali në shqip në një regjistrim real në sistem, pa menu dhe pa formularë.

| Veprimi | Shembull i folur | Çka krijohet |
|---|---|---|
| Blerje | «blerje 120 kilo ferrë e zezë nga Ilir Koçi parcela D01 me çmim 80 lek» | `purchases` (+ lëvizje magazine, loti automatik) |
| Detyrë | «detyrë nesër ujitje në parcelën D08» | `tasks` |
| Vëzhgim | «vëzhgim dëmtues në D03 shkallë 2» | `observations` |
| Shpenzim | «shpenzim 3 litra pleh në parcelën D03, 2500 lek» | `inputs` |

## Rrjedha
1. **Zë ose shkrim.** Mikrofoni (shtyp ose mbaj shtypur) ose fusha e tekstit — e njëjta logjikë.
2. **Kuptimi.** `src/voice/parse.js` nxjerr veprimin, sasinë (me njësi: kg, kuintal, ton, litra), çmimin, datën (sot/nesër/pasnesër/12.06), parcelën (kod ose emër), produktin, fermerin dhe zonën.
3. **Kontrolli.** Shfaqet përmbledhja me besueshmëri; fushat që mungojnë plotësohen me lista (produkt, fermer, parcelë, zonë) dhe sasia/çmimi mund të ndryshohen.
4. **Ruajtja.** Regjistrimi ruhet në Supabase; loti, vlera dhe lëvizja e magazinës krijohen nga triggerat e bazës.

## Dy burime zëri
- **Telefoni** (`expo-speech-recognition`): falas, i menjëhershëm, pa internet kur modeli është i instaluar. Shqipja varet nga pajisja; nëse mungon, aplikacioni e thotë qartë dhe kalon te shkrimi.
- **Serveri** (`supabase/functions/transcribe`, Whisper): i saktë për shqipen. Aktivizohet duke vendosur sekretin `OPENAI_API_KEY` (dhe opsionalisht `OPENAI_TRANSCRIBE_MODEL`) te **Supabase → Edge Functions → Secrets**. Pa çelës, funksioni përgjigjet `ok:false` dhe aplikacioni përdor telefonin.

## Kufijtë (të qartë, pa pretendime)
- Kuptimi është **gramatikë komandash** (deterministe, e testuar), jo model gjuhësor i përgjithshëm: mbulon blerje, detyra, vëzhgime dhe shpenzime me fjalorin bujqësor shqip.
- Nuk shpik të dhëna: nëse produkti/fermeri nuk njihet, ai shfaqet si mungesë dhe kërkon zgjedhje.
- Asnjë regjistrim nuk ruhet pa konfirmim.

## Testet
`tests/voice_test.js` — 56 teste: numra me fjalë («njëqind e njëzet»), njësi (kuintal → 200 kg), data relative, synimet, lidhja me parcelën/fermerin/produktin, fushat që mungojnë.
