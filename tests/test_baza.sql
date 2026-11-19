-- Test i migrimit 0001 mbi PostgreSQL (me stubat e auth të Supabase). Nis me: psql -v ON_ERROR_STOP=1 -f tests/test_baza.sql
-- Çdo kontroll që dështon ngre përjashtim dhe ndalon skriptin.
truncate public.companies, auth.users restart identity cascade;
begin;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000e'), ('00000000-0000-0000-0000-00000000000f');
-- a = admin A, b = staf A, c = fermer A, d = admin B, e = administrator platforme, f = grumbullues A
insert into public.platform_admins values ('00000000-0000-0000-0000-00000000000e');
insert into public.companies (name, kind) values ('BioBes', 'biobes'), ('Kompania B', 'grumbullues');

create function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, true); execute 'set local role authenticated'; end $$;
create function pg_temp.as_owner() returns void language plpgsql as
$$ begin execute 'reset role'; end $$;
grant execute on function pg_temp.as_user(text), pg_temp.as_owner() to public;

-- Fermeri duhet të ekzistojë para anëtarit «fermer»
insert into public.farmers (company_id, first_name, last_name) values (1, 'Mersin', 'Sinani'), (1, 'Agron', 'Kaci');
insert into public.members (user_id, company_id, role, name, farmer_id) values
  ('00000000-0000-0000-0000-00000000000a', 1, 'admin', 'Admin A', null),
  ('00000000-0000-0000-0000-00000000000b', 1, 'staf', 'Staf A', null),
  ('00000000-0000-0000-0000-00000000000c', 1, 'fermer', 'Mersin', 1),
  ('00000000-0000-0000-0000-00000000000d', 2, 'admin', 'Admin B', null),
  ('00000000-0000-0000-0000-00000000000f', 1, 'grumbullues', 'Grumbullues A', null);

-- 1. Admini A krijon produkt, zonë dhe një blerje
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.products (company_id, code, name) values (1, '115', 'Mjedër');
insert into public.zones (company_id, code, fair_wild) values (1, 'W010F/1a', true);
insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, cut, qty_fresh, qty_dry, price)
values (1, '2026-06-10', 1, 1, 1, 'I', 232, 52, 800);
do $$
declare p record; n int; m record;
begin
  select * into p from public.purchases limit 1;
  if p.lot_code <> 'W010F/1a-I-115-26' then raise exception 'lot_code gabim: %', p.lot_code; end if;
  if p.amount <> 41600 then raise exception 'amount gabim: %', p.amount; end if;
  if p.year <> 2026 then raise exception 'viti gabim'; end if;
  select count(*) into n from public.warehouses;
  if n <> 1 then raise exception 'magazina nuk u krijua vetë'; end if;
  select * into m from public.stock_moves where purchase_id = p.id;
  if m.qty_in <> 52 or m.kind <> 'blerje' or m.lot_code <> p.lot_code then raise exception 'hyrja në magazinë gabim'; end if;
end $$;

-- 2. Ndryshimi i sasisë përditëson hyrjen, jo e dyfishon
update public.purchases set qty_dry = 60 where id = 1;
do $$ declare n int; q numeric; begin
  select count(*), max(qty_in) into n, q from public.stock_moves where purchase_id = 1;
  if n <> 1 or q <> 60 then raise exception 'sinkronizimi gabim: % %', n, q; end if;
end $$;

-- 3. Stafi dorëzon dhe eksporton; përmbledhja del saktë
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.stock_moves (company_id, date, warehouse_id, product_id, lot_code, kind, qty_out, counterparty)
values (1, '2026-07-21', 1, 1, 'W010F/1a-I-115-26', 'dorezim', 40, 'Biobes'),
       (1, '2026-07-31', 1, 1, 'W010F/1a-I-115-26', 'eksport', 30, 'Warland');
do $$ declare s record; begin
  select * into s from public.lot_summary where lot_code = 'W010F/1a-I-115-26';
  if s.dry <> 60 or s.fresh <> 232 or s.stock <> 20 or s.delivered <> 40 or s.exported <> 30 or s.biobes_stock <> 10
     or s.year <> 2026 or s.export_to <> 'Warland' or s.delivered_date <> '2026-07-21' then
    raise exception 'përmbledhja gabim: %', row_to_json(s);
  end if;
end $$;

-- 4. Hyrjet nga blerjet nuk futen me dorë
do $$ begin
  begin
    insert into public.stock_moves (company_id, date, warehouse_id, product_id, lot_code, kind, qty_in)
    values (1, '2026-07-01', 1, 1, 'X', 'blerje', 5);
    raise exception 'duhej të dështonte';
  exception when insufficient_privilege or check_violation or raise_exception then
    if sqlerrm = 'duhej të dështonte' then raise; end if;
  end;
end $$;

-- 5. Kompania B nuk sheh asgjë nga A dhe nuk mund të shkruajë tek A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ declare n int; begin
  select count(*) into n from public.purchases; if n <> 0 then raise exception 'B sheh blerjet e A'; end if;
  select count(*) into n from public.products; if n <> 0 then raise exception 'B sheh produktet e A'; end if;
  select count(*) into n from public.lot_summary; if n <> 0 then raise exception 'B sheh përmbledhjen e A'; end if;
  begin
    insert into public.products (company_id, code, name) values (1, '999', 'Hajdutë');
    raise exception 'B shkroi te A';
  exception when insufficient_privilege then null; end;
end $$;
-- B krijon të dhënat e veta dhe nuk mund të përdorë fermerin e A
insert into public.products (company_id, code, name) values (2, '115', 'Mjedër B');
insert into public.zones (company_id, code) values (2, 'B01');
insert into public.farmers (company_id, first_name) values (2, 'Fermeri B');
do $$ begin
  begin
    insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, qty_dry, price)
    values (2, '2026-06-10', 1, 2, 2, 5, 10);
    raise exception 'duhej të dështonte';
  exception when raise_exception then
    if sqlerrm = 'duhej të dështonte' then raise; end if;
  end;
end $$;

-- 6. Fermeri sheh vetëm blerjet e veta dhe nuk shkruan
select pg_temp.as_owner();
insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, qty_dry, price)
values (1, '2026-06-11', 2, 1, 1, 7, 100);
select set_config('test.pid', id::text, false) from public.purchases where farmer_id = 2;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ declare n int; blocked boolean := true; begin
  select count(*) into n from public.purchases; if n <> 1 then raise exception 'fermeri sheh % blerje, duhej 1', n; end if;
  select count(*) into n from public.products; if n <> 0 then raise exception 'fermeri sheh produktet'; end if;
  begin
    insert into public.purchases (company_id, date, farmer_id, zone_id, product_id, qty_dry, price)
    values (1, '2026-06-12', 1, 1, 1, 1, 1);
    blocked := false;
  exception when others then blocked := true; end;
  if not blocked then raise exception 'fermeri shkroi'; end if;
end $$;

-- 7. Grumbulluesi shkruan por nuk fshin; stafi fshin; hyrja zhduket bashkë me blerjen
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
insert into public.farmers (company_id, first_name) values (1, 'Ri');
delete from public.purchases where id = current_setting('test.pid')::bigint;
do $$ declare n int; begin
  select count(*) into n from public.purchases where id = current_setting('test.pid')::bigint; if n <> 1 then raise exception 'grumbulluesi fshiu'; end if;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
delete from public.purchases where id = current_setting('test.pid')::bigint;
do $$ declare n int; begin
  select count(*) into n from public.purchases where id = current_setting('test.pid')::bigint; if n <> 0 then raise exception 'stafi nuk fshiu'; end if;
  select count(*) into n from public.stock_moves where purchase_id = current_setting('test.pid')::bigint; if n <> 0 then raise exception 'hyrja mbeti'; end if;
end $$;

-- 8. Administratori i platformës sheh të dyja kompanitë
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
do $$ declare n int; begin
  select count(*) into n from public.companies; if n <> 2 then raise exception 'platforma sheh % kompani', n; end if;
  select count(*) into n from public.products; if n <> 2 then raise exception 'platforma sheh % produkte', n; end if;
end $$;

-- 9. Anonimi nuk sheh asgjë
select pg_temp.as_owner();
do $$ begin
  execute 'set local role anon';
  begin
    perform count(*) from public.purchases;
    raise exception 'anonimi lexoi';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'TESTET E BAZËS: TË GJITHA KALUAN' as rezultati;
