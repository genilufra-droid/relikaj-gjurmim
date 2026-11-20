-- Të dhëna demo për BioBes (kompania 2) — për të provuar aplikacionin me përmbajtje reale.
-- Të gjitha rreshtat kanë shënimin «DEMO» që të mund të fshihen sërish me demo_fshi.sql.
-- Ekzekutohet: psql/albo Supabase SQL editor. I sigurt për t'u përsëritur (nuk dublon).

-- ============ Zonat ============
insert into public.zones (company_id, code, name, collector_name, collection_point, region, note)
select 2, v.code, v.name, v.collector, v.point, v.region, 'DEMO'
from (values
  ('DEMO/1', 'Tepelenë – luginë', 'Ilir Koçi', 'Pika Tepelenë', 'Tepelenë'),
  ('DEMO/2', 'Çorovodë – malësi', 'Arben Memi', 'Pika Çorovodë', 'Skrapar')
) as v(code, name, collector, point, region)
where not exists (select 1 from public.zones z where z.company_id = 2 and z.code = v.code);

-- ============ Produktet ============
insert into public.products (company_id, code, name, latin, active)
select 2, v.code, v.name, v.latin, true
from (values
  ('115', 'Ferrë e zezë', 'Rubus fruticosus'),
  ('109', 'Mjedër', 'Rubus idaeus'),
  ('204', 'Sherebela', 'Salvia officinalis'),
  ('310', 'Trumzë', 'Thymus vulgaris'),
  ('401', 'Lule shtogri', 'Sambucus nigra'),
  ('40', 'Rrënjë qumështore', 'Taraxacum officinale')
) as v(code, name, latin)
where not exists (select 1 from public.products p where p.company_id = 2 and p.code = v.code);

-- ============ Fermerët ============
insert into public.farmers (company_id, first_name, last_name, address, family_size, group_name, zone_code, phone, note, active)
select 2, v.first_name, v.last_name, v.address, v.family, v.grp, v.zone_code, v.phone, 'DEMO', true
from (values
  ('Mersin', 'Sinani', 'Dragot', 5, 'GRUPI I', 'DEMO/1', '069 000 0001'),
  ('Agron', 'Kaci', 'Lekdush', 4, 'GRUPI I', 'DEMO/1', '069 000 0002'),
  ('Fatmir', 'Hoxha', 'Tepelenë', 6, 'GRUPI I', 'DEMO/1', '069 000 0003'),
  ('Jake', 'Mema', 'Çorovodë', 5, 'GRUPI II', 'DEMO/2', '069 000 0004'),
  ('Blerim', 'Dervishi', 'Leshnjë', 3, 'GRUPI II', 'DEMO/2', '069 000 0005'),
  ('Valbona', 'Kola', 'Skrapar', 4, 'GRUPI II', 'DEMO/2', '069 000 0006')
) as v(first_name, last_name, address, family, grp, zone_code, phone)
where not exists (
  select 1 from public.farmers f
  where f.company_id = 2 and f.first_name = v.first_name and f.last_name = v.last_name and f.note = 'DEMO');

-- ============ Parcelat ============
insert into public.plots (company_id, name, code, zone_id, farmer_id, area_ha, lat, lng, soil_type, growing, irrigation, ownership, status, altitude, organic, note, active)
select 2, v.name, v.code, z.id, f.id, v.area, v.lat, v.lng, v.soil, 'field', v.irrig, v.own, v.status, v.alt, true, 'DEMO', true
from (values
  ('Parcela te ura e vjetër', 'D01', 'DEMO/1', 'Mersin', 'Sinani', 2.5, 40.2960::numeric, 20.0180::numeric, 'argjilore', 'drip', 'leased', 'active', 320),
  ('Parcela Kreshpan', 'D02', 'DEMO/1', 'Mersin', 'Sinani', 1.8, 40.3010::numeric, 20.0240::numeric, 'ranore', 'none', 'owned', 'active', 340),
  ('Bregu i Kacit', 'D03', 'DEMO/1', 'Agron', 'Kaci', 3.2, 40.2880::numeric, 20.0300::numeric, 'argjilore', 'sprinkler', 'leased', 'active', 300),
  ('Arat e Lekdushit', 'D04', 'DEMO/1', 'Agron', 'Kaci', 1.2, 40.2905::numeric, 20.0120::numeric, 'ranore', 'none', 'owned', 'fallow', 315),
  ('Kodra e Hoxhës', 'D05', 'DEMO/1', 'Fatmir', 'Hoxha', 2.0, 40.2750::numeric, 20.0400::numeric, 'karbonate', 'drip', 'leased', 'active', 380),
  ('Mali i Çorovodës', 'D06', 'DEMO/2', 'Jake', 'Mema', 4.0, 40.5040::numeric, 20.2280::numeric, 'pyjore', 'none', 'wild', 'active', 760),
  ('Livadhi i Leshnjës', 'D07', 'DEMO/2', 'Blerim', 'Dervishi', 2.7, 40.5210::numeric, 20.2410::numeric, 'karbonate', 'none', 'owned', 'active', 820),
  ('Bregu i Skraparit', 'D08', 'DEMO/2', 'Valbona', 'Kola', 1.5, 40.5300::numeric, 20.2350::numeric, 'ranore', 'drip', 'leased', 'active', 690)
) as v(name, code, zone_code, ffirst, flast, area, lat, lng, soil, irrig, own, status, alt)
join public.zones z on z.company_id = 2 and z.code = v.zone_code
join public.farmers f on f.company_id = 2 and f.first_name = v.ffirst and f.last_name = v.flast
where not exists (select 1 from public.plots p where p.company_id = 2 and p.code = v.code);

-- ============ Kultivimet ============
insert into public.cultivations (company_id, plot_id, product_id, sowing_date, expected_harvest, stage, expected_yield_kg, note)
select 2, p.id, pr.id, v.sowing::date, v.harvest::date, v.stage, v.yield, 'DEMO'
from (values
  ('D01', '115', '2026-03-10', '2026-07-05', 'growing', 5200),
  ('D03', '109', '2026-03-18', '2026-06-25', 'harvest', 3800),
  ('D05', '401', '2026-04-02', '2026-06-30', 'growing', 2400),
  ('D06', '310', '2026-04-10', '2026-07-15', 'planned', 1600),
  ('D07', '204', '2026-03-25', '2026-06-20', 'growing', 3000),
  ('D08', '40', '2026-09-15', '2027-03-10', 'planned', 2200)
) as v(plot_code, product_code, sowing, harvest, stage, yield)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
join public.products pr on pr.company_id = 2 and pr.code = v.product_code
where not exists (select 1 from public.cultivations c where c.company_id = 2 and c.plot_id = p.id and c.note = 'DEMO');

-- ============ Qiratë ============
insert into public.leases (company_id, plot_id, owner_name, start_date, end_date, rent_amount, term_months, deposit, note)
select 2, p.id, v.owner, v.d1::date, v.d2::date, v.rent, 12, v.deposit, 'DEMO'
from (values
  ('D01', 'Pronari Beqiri', '2026-01-01', '2026-12-31', 120000.00, 20000.00),
  ('D03', 'Pronari Xhaferri', '2026-01-01', '2026-12-15', 150000.00, 25000.00),
  ('D05', 'Pronari Dervishi', '2026-02-01', '2027-01-31', 90000.00, 0.00),
  ('D08', 'Pronari Skënderi', '2026-01-01', '2026-11-30', 70000.00, 10000.00)
) as v(plot_code, owner, d1, d2, rent, deposit)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where not exists (select 1 from public.leases l where l.company_id = 2 and l.plot_id = p.id and l.note = 'DEMO');

-- ============ Punimet e tokës ============
insert into public.land_operations (company_id, plot_id, date, kind, contractor, machine, hours, cost, note)
select 2, p.id, v.d::date, v.kind, v.contractor, v.machine, v.hours, v.cost, 'DEMO'
from (values
  ('D01', '2026-02-12', 'plow', 'Traktor Ilir', 'New Holland 90 kf', 5, 30000.00),
  ('D01', '2026-02-25', 'till', 'Traktor Ilir', 'Frezë 2.2 m', 3, 18000.00),
  ('D03', '2026-02-18', 'plow', 'Traktor Ilir', 'New Holland 90 kf', 6, 36000.00),
  ('D04', '2026-10-05', 'subsoil', 'Traktor Bledi', 'Mihëse', 4, 26000.00),
  ('D05', '2026-03-01', 'level', 'Traktor Bledi', 'Nivelues', 2, 12000.00),
  ('D06', '2026-03-20', 'haul', 'Transport Tepelena', 'Kamion', 6, 22000.00)
) as v(plot_code, d, kind, contractor, machine, hours, cost)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where not exists (
  select 1 from public.land_operations o where o.company_id = 2 and o.plot_id = p.id and o.date = v.d::date and o.kind = v.kind and o.note = 'DEMO');

-- ============ Trajtimet ============
insert into public.applications (company_id, plot_id, cultivation_id, date, kind, product_name, dose, unit, area_ha, phi_days, operator, cost, organic_ok, note)
select 2, p.id, c.id, v.d::date, v.kind, v.product, v.dose, v.unit, p.area_ha, v.phi, 'Ekipi i fushës', v.cost, v.organic, 'DEMO'
from (values
  ('D01', '115', '2026-03-15', 'fert', 'Pleh organik 4-2-2', 500.0, 'kg', 0, 42000.00, true),
  ('D01', '115', '2026-05-20', 'biological', 'Sapun kaliumi', 3.0, 'L', 7, 4500.00, true),
  ('D03', '109', '2026-04-02', 'fert', 'Pleh organik 4-2-2', 400.0, 'kg', 0, 33000.00, true),
  ('D05', '401', '2026-05-05', 'foliar', 'Ekstrakt algash', 2.0, 'L', 3, 6000.00, true),
  ('D07', '204', '2026-04-20', 'irrigation', 'Ujitje pika-pika', 0.0, '', 0, 8000.00, true)
) as v(plot_code, product_code, d, kind, product, dose, unit, phi, cost, organic)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
left join public.cultivations c on c.company_id = 2 and c.plot_id = p.id and c.note = 'DEMO'
where not exists (
  select 1 from public.applications a where a.company_id = 2 and a.plot_id = p.id and a.date = v.d::date and a.product_name = v.product and a.note = 'DEMO');

-- ============ Blerjet (korrjet) ============
insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, plot_id, cut, qty_fresh, qty_dry, price, paid, note)
select 2, v.d::date, p.farmer_id, p.zone_id, pr.id, p.id, v.cut, v.fresh, v.dry, v.price, v.paid, 'DEMO'
from (values
  ('D01', '115', '2026-06-18', 'I', 620.0, 205.0, 900.00, 184500.00),
  ('D01', '115', '2026-06-29', 'I', 480.0, 158.0, 900.00, 142200.00),
  ('D03', '109', '2026-06-10', 'I', 540.0, 176.0, 800.00, 140800.00),
  ('D03', '109', '2026-06-22', 'II', 310.0, 96.0, 650.00, 62400.00),
  ('D05', '401', '2026-06-24', 'I', 260.0, 78.0, 700.00, 54600.00),
  ('D06', '310', '2026-07-08', 'I', 180.0, 62.0, 1200.00, 74400.00),
  ('D07', '204', '2026-06-16', 'I', 420.0, 130.0, 750.00, 97500.00),
  ('D07', '204', '2026-06-27', 'II', 240.0, 72.0, 600.00, 43200.00),
  ('D08', '40', '2026-09-30', 'I', 650.0, 210.0, 500.00, 105000.00),
  ('D05', '401', '2026-07-02', 'II', 150.0, 44.0, 550.00, 24200.00)
) as v(plot_code, product_code, d, cut, fresh, dry, price, paid)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
join public.products pr on pr.company_id = 2 and pr.code = v.product_code
where not exists (
  select 1 from public.purchases pu where pu.company_id = 2 and pu.plot_id = p.id and pu.date = v.d::date and pu.note = 'DEMO');

-- ============ Pagesat ============
insert into public.payments (company_id, purchase_id, farmer_id, date, amount, method, paid_by, receipt_no, note)
select 2, pu.id, pu.farmer_id, pu.date + 7, round(pu.amount * 0.6, 2), 'kesh', 'company', 'P-' || pu.id, 'DEMO'
from public.purchases pu
where pu.company_id = 2 and pu.note = 'DEMO'
  and not exists (select 1 from public.payments x where x.purchase_id = pu.id and x.note = 'DEMO');

-- ============ Klienti dhe magazina ============
insert into public.customers (company_id, name, country, note, active)
select 2, 'Sonnentor', 'AT', 'DEMO', true
where not exists (select 1 from public.customers c where c.company_id = 2 and c.name = 'Sonnentor');

insert into public.warehouses (company_id, name, active)
select 2, 'Magazina qendrore', true
where not exists (select 1 from public.warehouses w where w.company_id = 2 and w.name = 'Magazina qendrore');

-- ============ Mostrat ============
insert into public.samples (company_id, date, product_text, code, point, plot_id, lab, moisture, purity, passed, result, comment)
select 2, v.d::date, v.product, v.lot, v.point, p.id, v.lab, v.moisture, v.purity, v.passed, v.result, 'DEMO'
from (
  select 'D01'::text plot_code, 'Ferrë e zezë'::text product, '2026-06-16'::text d, 'plot'::text point, 'AlbInspekt'::text lab,
         12.4::numeric moisture, 98.6::numeric purity, true passed, 'Pastërtia 98,6% — brenda normës'::text result,
         (select lot_code from public.purchases where company_id = 2 and note = 'DEMO' and date = '2026-06-18' limit 1) lot
  union all
  select 'D03', 'Mjedër', '2026-06-08', 'plot', 'AlbInspekt', 11.8, 99.1, true, 'Pastërtia 99,1%',
         (select lot_code from public.purchases where company_id = 2 and note = 'DEMO' and date = '2026-06-10' limit 1)
  union all
  select 'D07', 'Sherebela', '2026-06-15', 'center', 'BioInspecta', 10.9, 99.4, true, 'Pastërtia 99,4%',
         (select lot_code from public.purchases where company_id = 2 and note = 'DEMO' and date = '2026-06-16' limit 1)
  union all
  select 'D06', 'Trumzë', '2026-07-07', 'plot', 'AlbInspekt', null, null, null, '',
         (select lot_code from public.purchases where company_id = 2 and note = 'DEMO' and date = '2026-07-08' limit 1)
) as v(plot_code, product, d, point, lab, moisture, purity, passed, result, lot)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where v.lot is not null and not exists (
  select 1 from public.samples s where s.company_id = 2 and s.code = v.lot and s.point = v.point and s.comment = 'DEMO');

-- ============ Përpunimi ============
insert into public.batches (company_id, code, date, method, source_lot, product_id, warehouse_id, input_qty, output_qty, note)
select 2, v.code, v.d::date, v.method, l.lot, pr.id, w.id, v.inp, v.out, 'DEMO'
from (values
  ('B-DEMO-01', '2026-06-20', 'drying', 205.0, 196.0, '115'),
  ('B-DEMO-02', '2026-07-10', 'cleaning', 176.0, 168.0, '109')
) as v(code, d, method, inp, out, product_code)
join public.products pr on pr.company_id = 2 and pr.code = v.product_code
join public.warehouses w on w.company_id = 2 and w.name = 'Magazina qendrore'
left join lateral (
  select lot_code as lot from public.purchases pu
  where pu.company_id = 2 and pu.note = 'DEMO' and pu.product_id = pr.id
  order by pu.date limit 1
) l on true
where not exists (select 1 from public.batches b where b.company_id = 2 and b.code = v.code);

-- ============ Lëvizjet e magazinës dhe eksporti ============
insert into public.stock_moves (company_id, warehouse_id, product_id, lot_code, date, kind, qty_in, qty_out, counterparty, customer_id, document_no, note)
select 2, w.id, pu.product_id, pu.lot_code, v.d::date, v.kind, v.qty_in, v.qty_out, v.party, c.id, v.doc, 'DEMO'
from (values
  ('2026-06-21', 'dorezim', 0.0, 196.0, 'BioBes', 'DF-01'),
  ('2026-07-20', 'eksport', 0.0, 196.0, 'Sonnentor', 'EXP-001')
) as v(d, kind, qty_in, qty_out, party, doc)
join public.warehouses w on w.company_id = 2 and w.name = 'Magazina qendrore'
left join public.customers c on c.company_id = 2 and c.name = 'Sonnentor'
join lateral (
  select pu.product_id, pu.lot_code from public.purchases pu
  where pu.company_id = 2 and pu.note = 'DEMO' and pu.date = '2026-06-18' limit 1
) pu on true
where not exists (
  select 1 from public.stock_moves m where m.company_id = 2 and m.lot_code = pu.lot_code and m.kind = v.kind and m.note = 'DEMO');

-- ============ Anëtarësimi (admini sheh kompaninë) ============
insert into public.members (user_id, company_id, role, name, active)
select '4c9afb8b-9332-4d01-bbff-02af3ce6eea4', 2, 'admin', 'Administrator', true
where not exists (
  select 1 from public.members m
  where m.user_id = '4c9afb8b-9332-4d01-bbff-02af3ce6eea4' and m.company_id = 2);

-- ============ Detyrat ============
insert into public.tasks (company_id, title, type, plot_id, due_date, status, priority, notes)
select 2, v.title, v.type, p.id, v.due::date, v.status, v.priority, 'DEMO'
from (values
  ('Kontroll dëmtuesish në ferrë', 'scout', 'D01', '2026-11-05', 'open', 'high'),
  ('Ujitje para vjeljes', 'irrigate', 'D08', '2026-11-12', 'open', 'normal'),
  ('Krasitje pastrimi', 'prune', 'D03', '2026-12-05', 'open', 'normal'),
  ('Mbjellje e re e sherebelës', 'sow', 'D07', '2027-03-20', 'open', 'low'),
  ('Vjelje trumze', 'harvest', 'D06', '2026-07-08', 'done', 'normal')
) as v(title, type, plot_code, due, status, priority)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where not exists (select 1 from public.tasks t where t.company_id = 2 and t.title = v.title and t.notes = 'DEMO');

-- ============ Vëzhgimet ============
insert into public.observations (company_id, plot_id, date, kind, severity, description, advice, resolved)
select 2, p.id, v.d::date, v.kind, v.sev, v.descr, v.advice, v.done
from (values
  ('D01', '2026-06-05', 'pest', 2, 'Afide në majat e degëve', 'Spërkatje me sapun kaliumi në mbrëmje.', false),
  ('D03', '2026-06-12', 'disease', 3, 'Njolla gri në gjethe (Botrytis)', 'Hiq gjethet e prekura dhe ajros serën.', false)
) as v(plot_code, d, kind, sev, descr, advice, done)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where not exists (
  select 1 from public.observations o where o.company_id = 2 and o.plot_id = p.id and o.date = v.d::date);

-- ============ Inputet ============
insert into public.inputs (company_id, plot_id, date, category, description, qty, unit, amount, supplier)
select 2, p.id, v.d::date, v.cat, v.descr, v.qty, v.unit, v.amount, v.sup
from (values
  ('D01', '2026-03-12', 'fert', 'Pleh organik 4-2-2', 500.0, 'kg', 42000.00, 'AgroVlorë'),
  ('D03', '2026-04-01', 'fert', 'Pleh organik 4-2-2', 400.0, 'kg', 33000.00, 'AgroVlorë'),
  ('D06', '2026-03-20', 'fuel', 'Karburant transporti', 120.0, 'L', 21600.00, 'Kastrati'),
  ('D08', '2026-09-10', 'labor', 'Krah pune vjelje', 24.0, 'orë', 24000.00, '')
) as v(plot_code, d, cat, descr, qty, unit, amount, sup)
join public.plots p on p.company_id = 2 and p.code = v.plot_code
where not exists (
  select 1 from public.inputs i where i.company_id = 2 and i.plot_id = p.id and i.date = v.d::date and i.description = v.descr);

select 'DEMO u vendos: 2 zona, 6 fermerë, 8 parcela, 6 produkte, 10 blerje' as rezultati;
