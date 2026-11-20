-- Test i migrimit 0003 (pas 0001 dhe 0002).
truncate public.companies, auth.users restart identity cascade;
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000f'), ('00000000-0000-0000-0000-00000000000d');
insert into public.companies (name, kind) values ('BioBes', 'biobes'), ('B', 'grumbullues');
insert into public.members (user_id, company_id, role, name) values
  ('00000000-0000-0000-0000-00000000000a', 1, 'admin', 'A'), ('00000000-0000-0000-0000-00000000000b', 1, 'staf', 'S'),
  ('00000000-0000-0000-0000-00000000000f', 1, 'grumbullues', 'G'), ('00000000-0000-0000-0000-00000000000d', 2, 'admin', 'B');
create function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, true); execute 'set local role authenticated'; end $$;
grant execute on function pg_temp.as_user(text) to public;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.landowners (company_id, name) values (1, 'Luka Petro Qose');
insert into public.parcels (company_id, code, address, owner_id, area_m2) values (1, 'K01', 'Mertish, Lushnje', 1, 5570);
insert into public.subparcels (company_id, parcel_id, code, area_m2) values (1, 1, 'K01/1', 5570);
insert into public.crop_plan (company_id, subparcel_id, year, product_text, planned_kg) values (1, 1, 2026, 'Qumeshtore', 6500);
insert into public.leases (company_id, parcel_id, landowner_id, contract_no, start_date, end_date, amount, frequency, remind_days)
  values (1, 1, 1, 'K-1/2026', '2026-01-01', '2028-12-31', 50000, 'vjetor', 30);
do $$ declare n int; begin
  n := public.generate_lease_schedule(1);
  if n <> 3 then raise exception 'afate gabim: %', n; end if;
  if public.generate_lease_schedule(1) <> 0 then raise exception 'afatet u dyfishuan'; end if;
  insert into public.lease_payments (company_id, lease_id, due_date, amount) values (1, 1, '2026-02-01', 100) on conflict do nothing;
end $$;
-- kujtuesi: afati 2026-01-01 i papaguar dhe i vonuar (data aktuale > 2026)
do $$ declare s text; begin
  select status into s from public.lease_reminders where due_date = '2026-01-01';
  if s is distinct from 'vonuar' then raise exception 'kujtesa gabim: %', s; end if;
  update public.lease_payments set paid_date = '2026-01-05', paid_amount = 50000 where due_date = '2026-01-01';
  if exists (select 1 from public.lease_reminders where due_date = '2026-01-01') then raise exception 'afati i paguar mbeti te kujtuesit'; end if;
end $$;

-- grumbulluesi lexon parcelat, nuk sheh qiranë, nuk shkruan
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  if (select count(*) from public.parcels) <> 1 then raise exception 'grumbulluesi nuk sheh parcelat'; end if;
  if (select count(*) from public.leases) <> 0 or (select count(*) from public.landowners) <> 0 or (select count(*) from public.lease_payments) <> 0 then raise exception 'grumbulluesi sheh qiranë'; end if;
  begin insert into public.parcels (company_id, code) values (1, 'X'); raise exception 'duhej të dështonte';
  exception when insufficient_privilege then null; end;
end $$;

-- kompania B nuk sheh dhe nuk lidh
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from public.parcels) <> 0 or (select count(*) from public.lease_reminders) <> 0 then raise exception 'B sheh të dhënat e A'; end if;
  begin insert into public.parcels (company_id, code, owner_id) values (2, 'B1', 1); raise exception 'duhej të dështonte';
  exception when raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
end $$;
rollback;
select 'TESTET E TOKËS DHE QIRASË: TË GJITHA KALUAN' as rezultati;
