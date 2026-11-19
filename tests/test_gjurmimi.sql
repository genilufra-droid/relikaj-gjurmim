-- Test i gjurmueshmërisë (0005): parcela → qira → punime → trajtime → korrje → grumbullues → qendër → mostër → eksport.
-- Nis me: psql -v ON_ERROR_STOP=1 -f tests/test_gjurmimi.sql (pas 0001–0005)
truncate public.companies, auth.users restart identity cascade;
begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000f');
insert into public.companies (name, kind) values ('BioBes', 'biobes'), ('Kompania B', 'grumbullues');
insert into public.farmers (company_id, first_name, last_name) values (1, 'Mersin', 'Sinani'), (1, 'Agron', 'Kaci');
insert into public.members (user_id, company_id, role, name, farmer_id) values
  ('00000000-0000-0000-0000-00000000000a', 1, 'admin', 'Admin', null),
  ('00000000-0000-0000-0000-00000000000b', 1, 'staf', 'Staf', null),
  ('00000000-0000-0000-0000-00000000000c', 1, 'fermer', 'Mersin', 1),
  ('00000000-0000-0000-0000-00000000000d', 2, 'admin', 'B', null),
  ('00000000-0000-0000-0000-00000000000f', 1, 'grumbullues', 'Grumbulluesi', null);
create function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, true); execute 'set local role authenticated'; end $$;
grant execute on function pg_temp.as_user(text) to public;

-- Stafi: zonë me grumbullues, parcelë e qiramarrë, kultivim, punime, trajtime
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.zones (company_id, code, collector_name, collection_point, region)
values (1, 'W010F/1a', 'Grumbulluesi Ilir', 'Pika Tepelenë', 'Tepelenë');
insert into public.products (company_id, code, name) values (1, '115', 'Ferrë e zezë');
insert into public.warehouses (company_id, name) values (1, 'Magazina qendrore');
insert into public.customers (company_id, name, country) values (1, 'Sonnentor', 'AT');
insert into public.plots (company_id, name, code, zone_id, farmer_id, area_ha, ownership, status, organic)
values (1, 'Parcela 1', 'K01', 1, 1, 2.5, 'leased', 'active', true);
insert into public.cultivations (company_id, plot_id, product_id, sowing_date, stage) values (1, 1, 1, '2026-03-01', 'growing');
insert into public.leases (company_id, plot_id, owner_name, start_date, end_date, rent_amount, term_months)
values (1, 1, 'Pronari X', '2026-01-01', '2026-12-31', 120000, 12);
-- punimet e tokës: plugim + frezim
insert into public.land_operations (company_id, plot_id, date, kind, contractor, hours, cost)
values (1, 1, '2026-02-10', 'plow', 'Traktor Ilir', 4, 24000), (1, 1, '2026-02-20', 'till', 'Traktor Ilir', 3, 18000);
-- trajtime: pleh organik dhe trajtim biologjik me interval para vjeljes
insert into public.applications (company_id, plot_id, cultivation_id, date, kind, product_name, dose, unit, area_ha, phi_days, cost)
values (1, 1, 1, '2026-03-05', 'fert', 'Pleh organik', 500, 'kg', 2.5, 0, 25000),
       (1, 1, 1, '2026-05-20', 'biological', 'Sapun kaliumi', 3, 'L', 2.5, 7, 4000);
-- korrja (blerje nga fermeri) me parcelë dhe kultivim
insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, plot_id, cultivation_id, cut, qty_fresh, qty_dry, price, paid)
values (1, '2026-06-10', 1, 1, 1, 1, 1, 'I', 500, 160, 800, 128000);
-- dorëzim në qendër dhe eksport te klienti
insert into public.stock_moves (company_id, warehouse_id, product_id, lot_code, date, kind, qty_out, counterparty, customer_id, document_no)
values (1, 1, 1, 'W010F/1a-I-115-26', '2026-06-12', 'dorezim', 160, 'BioBes', null, 'DF-12'),
       (1, 1, 1, 'W010F/1a-I-115-26', '2026-07-01', 'eksport', 160, 'Sonnentor', 1, 'EXP-001');
-- mostra në parcelë dhe në qendër
insert into public.samples (company_id, date, customer_id, product_text, code, point, plot_id, lab, moisture, purity, passed, result)
values (1, '2026-06-09', 1, 'Ferrë e zezë', 'W010F/1a-I-115-26', 'plot', 1, 'AlbInspekt', 11.5, 99.1, true, 'Pastërtia 99,1%'),
       (1, '2026-06-15', 1, 'Ferrë e zezë', 'W010F/1a-I-115-26', 'center', null, 'AlbInspekt', 10.8, 99.4, true, 'Pastërtia 99,4%');
-- përpunimi: tharje
insert into public.batches (company_id, code, date, method, source_lot, product_id, warehouse_id, input_qty, output_qty)
values (1, 'B-26-01', '2026-06-13', 'drying', 'W010F/1a-I-115-26', 1, 1, 160, 152);

do $$ declare c record; z record; b record; n int; begin
  select * into c from public.lot_chain where lot_code = 'W010F/1a-I-115-26';
  if c.farmers <> 1 or c.plots <> 1 or c.fresh <> 500 or c.dry <> 160 or c.collector <> 'Grumbulluesi Ilir' then
    raise exception 'lot_chain gabim: %', row_to_json(c);
  end if;
  select * into c from public.lot_plots where lot_code = 'W010F/1a-I-115-26';
  if c.plot <> 'Parcela 1' or c.farmer <> 'Mersin Sinani' or c.dry <> 160 or c.ownership <> 'leased' then
    raise exception 'lot_plots gabim: %', row_to_json(c);
  end if;
  select * into z from public.zone_summary where zone_id = 1;
  if z.collector_name <> 'Grumbulluesi Ilir' or z.plots <> 1 or z.farmers <> 1 or z.fresh_year <> 500 then
    raise exception 'zone_summary gabim: %', row_to_json(z);
  end if;
  select * into b from public.batch_summary where code = 'B-26-01';
  if b.yield_pct <> 95.0 then raise exception 'batch_summary gabim: %', to_json(b); end if;
  select count(*) into n from public.plot_activity where plot_id = 1 and kind = 'punim';
  if n <> 2 then raise exception 'plot_activity: pritej 2 punime, u gjet %', n; end if;
  select count(*) into n from public.plot_activity where plot_id = 1 and kind in ('trajtim', 'input', 'vëzhgim', 'detyrë', 'punim');
  if n < 4 then raise exception 'plot_activity: vetëm % rreshta', n; end if;
end $$;

-- Grumbulluesi paguan fermerin për korrjen dhe lidh dokumentin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
insert into public.payments (company_id, purchase_id, farmer_id, date, amount, method, paid_by, receipt_no, note)
values (1, 1, 1, '2026-06-20', 128000, 'kesh', 'collector', 'K-01', 'Paguar nga grumbulluesi');
insert into public.documents (company_id, kind, title, path, lease_id, purchase_id)
values (1, 'kontrate', 'Kontrata e qirasë', 'docs/qira.pdf', 1, null), (1, 'fature', 'Fatura e korrjes', 'docs/fature.pdf', null, 1);

-- Parcela e një fermeri tjetër refuzohet në korrje
do $$ begin
  begin
    insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, plot_id, cut, qty_fresh, qty_dry, price)
    values (1, '2026-06-11', 2, 1, 1, 1, 'I', 10, 3, 800);
    raise exception 'duhej të dështonte';
  exception when raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
end $$;

-- Fermeri sheh aktivitetin e parcelës së vet, por jo batch-et; kompania B s' sheh gjë
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from public.plot_activity where plot_id = 1) < 4 then raise exception 'fermeri nuk sheh historikun e parcelës'; end if;
  if (select count(*) from public.batches) <> 0 then raise exception 'fermeri sheh përpunimin'; end if;
  if (select count(*) from public.leases) <> 0 then raise exception 'fermeri sheh qiranë'; end if;
  if (select count(*) from public.payments where purchase_id = 1 and paid_by = 'collector') <> 1 then raise exception 'fermeri nuk sheh pagesën e grumbulluesit'; end if;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from public.lot_chain) <> 0 or (select count(*) from public.zone_summary) <> 0 or (select count(*) from public.plot_activity) <> 0 then
    raise exception 'kompania B sheh të dhënat e BioBes';
  end if;
end $$;

rollback;
select 'TESTET E GJURMUESHMËRISË: TË GJITHA KALUAN' as rezultati;
