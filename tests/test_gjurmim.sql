-- Test i migrimit 0004: shpenzime, trajtime, vjelje, dekodim dhe gjurmim.
truncate public.companies, auth.users restart identity cascade;
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000f'), ('00000000-0000-0000-0000-00000000000d');
insert into public.companies (name, kind) values ('BioBes', 'biobes'), ('B', 'grumbullues');
insert into public.members (user_id, company_id, role, name) values
  ('00000000-0000-0000-0000-00000000000b', 1, 'staf', 'S'), ('00000000-0000-0000-0000-00000000000f', 1, 'grumbullues', 'G'), ('00000000-0000-0000-0000-00000000000d', 2, 'admin', 'B');
create function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, true); execute 'set local role authenticated'; end $$;
grant execute on function pg_temp.as_user(text) to public;

do $$ declare d jsonb; begin
  d := public.parse_biobes_code('B1K100/2-II-109-25');
  if d->>'parcel_code' <> 'K10' or d->>'subparcel_code' <> 'K10/2' or d->>'cut' <> 'II' or d->>'product_code' <> '109' or (d->>'year')::int <> 2025 then raise exception 'dekodim gabim: %', d; end if;
  d := public.parse_biobes_code('B3S050/1-121-25');
  if d->>'parcel_code' <> 'S05' or d->>'cut' is not null then raise exception 'dekodim 2 gabim: %', d; end if;
  d := public.parse_biobes_code('B2A090/7/3b-302-26');
  if d->>'subparcel_code' <> 'A09/7/3B' then raise exception 'dekodim 3 gabim: %', d; end if;
  if public.parse_biobes_code('W010F/1a-I-115-26') is not null then raise exception 'W01 nuk është kod Biobes'; end if;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.landowners (company_id, name) values (1, 'Pronari K10');
insert into public.parcels (company_id, code, address, owner_id, area_m2) values (1, 'K10', 'Kolonjë', 1, 12000);
insert into public.subparcels (company_id, parcel_id, code, area_m2) values (1, 1, 'K10/2', 5000);
insert into public.products (company_id, code, name) values (1, '109', 'Melisa');
insert into public.leases (company_id, parcel_id, landowner_id, contract_no, start_date, end_date, amount) values (1, 1, 1, 'Q-7', '2024-01-01', '2026-12-31', 80000);
insert into public.harvests (company_id, subparcel_id, product_id, date, qty_fresh, qty_dry, report_no) values (1, 1, 1, '2025-07-10', 400, 100, '4/1');
insert into public.treatments (company_id, date, parcel_id, subparcel_id, product_name, dose, target, organic_allowed, pre_harvest_days) values (1, '2025-05-02', 1, 1, 'Sapun kaliumi', '2%', 'Afide', true, 3);
insert into public.expenses (company_id, date, parcel_id, subparcel_id, kind, amount) values (1, '2025-03-01', 1, 1, 'mbjellje', 30000);
insert into public.expenses (company_id, date, parcel_id, kind, amount) values (1, '2024-03-01', 1, 'ujitje', 999);   -- vit tjetër, nuk hyn në gjurmimin e 2025
insert into public.customers (company_id, name, country) values (1, 'Klienti X', 'Gjermani');
insert into public.shipments (company_id, tracking_no, customer_id) values (1, '123', 1);
insert into public.samples (company_id, date, customer_id, product_text, code, shipment_id, comment) values (1, '2026-01-05', 1, 'Melisa', 'B1K100/2-II-109-25', 1, 'reklamim');
do $$ declare t jsonb; begin
  t := public.trace_code(1, 'b1k100/2-ii-109-25');
  if jsonb_array_length(t->'samples') <> 1 or t->'samples'->0->>'tracking_no' <> '123' then raise exception 'mostra: %', t->'samples'; end if;
  if t->'parcel'->>'owner' <> 'Pronari K10' or t->'subparcel'->>'code' <> 'K10/2' then raise exception 'parcela: %', t; end if;
  if jsonb_array_length(t->'leases') <> 1 or jsonb_array_length(t->'harvests') <> 1 or jsonb_array_length(t->'treatments') <> 1 then raise exception 'lidhje: %', t; end if;
  if jsonb_array_length(t->'expenses') <> 1 then raise exception 'shpenzime (vit): %', t->'expenses'; end if;
  begin insert into public.treatments (company_id, date, parcel_id, subparcel_id, product_name) values (1, '2025-01-01', 1, 999, 'x'); raise exception 'duhej të dështonte';
  exception when foreign_key_violation or raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
end $$;

-- grumbulluesi nuk sheh shpenzimet dhe nuk shkruan trajtime, por lexon trajtimet
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  if (select count(*) from public.expenses) <> 0 then raise exception 'grumbulluesi sheh shpenzime'; end if;
  if (select count(*) from public.treatments) <> 1 then raise exception 'grumbulluesi nuk sheh trajtime'; end if;
  begin insert into public.treatments (company_id, date, parcel_id, product_name) values (1, '2025-01-01', 1, 'x'); raise exception 'duhej të dështonte';
  exception when insufficient_privilege then null; end;
  if jsonb_array_length(public.trace_code(1, 'B1K100/2-II-109-25')->'samples') <> 0 then raise exception 'grumbulluesi sheh mostrat te gjurmimi'; end if;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ declare t jsonb; begin
  t := public.trace_code(1, 'B1K100/2-II-109-25');
  if t->'parcel' is not null and t->>'parcel' <> 'null' then raise exception 'B sheh parcelën e A: %', t->'parcel'; end if;
  if jsonb_array_length(t->'harvests') <> 0 or jsonb_array_length(t->'samples') <> 0 then raise exception 'B sheh të dhëna të A'; end if;
end $$;
rollback;
select 'TESTET E GJURMIMIT: TË GJITHA KALUAN' as rezultati;
