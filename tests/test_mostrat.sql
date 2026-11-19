-- Test i migrimit 0002 (duhet ekzekutuar pas 0001). Nis me: psql -v ON_ERROR_STOP=1 -f tests/test_mostrat.sql
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
insert into public.customers (company_id, name, country) values (1, 'Alfred Galke GmbH', 'Gjermani');
insert into public.shipments (company_id, tracking_no, customer_id, amount_eur) values (1, '29 5797 6265', 1, 48.63);
insert into public.samples (company_id, date, customer_id, product_text, code, shipment_id, comment)
values (1, '2026-01-05', 1, 'Rubus idaeus/Mjedra', 'B3S020/1-115-25', 1, 'test');
do $$ begin
  if (select count(*) from public.samples) <> 1 then raise exception 'mostra nuk u ruajt'; end if;
  begin insert into public.shipments (company_id, tracking_no) values (1, '29 5797 6265'); raise exception 'duhej të dështonte';
  exception when unique_violation then null; end;
end $$;

-- grumbulluesi nuk sheh mostrat
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  if (select count(*) from public.samples) <> 0 or (select count(*) from public.customers) <> 0 or (select count(*) from public.shipments) <> 0 then raise exception 'grumbulluesi sheh mostrat'; end if;
  begin insert into public.customers (company_id, name) values (1, 'X'); raise exception 'duhej të dështonte';
  exception when insufficient_privilege then null; end;
end $$;

-- kompania B nuk sheh as nuk lidh klientin e A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from public.samples) <> 0 then raise exception 'B sheh mostrat e A'; end if;
  begin insert into public.samples (company_id, date, customer_id) values (2, '2026-01-01', 1); raise exception 'duhej të dështonte';
  exception when raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
end $$;
rollback;
select 'TESTET E MOSTRAVE: TË GJITHA KALUAN' as rezultati;
