-- Test i migrimit 0003 (duhet ekzekutuar pas 0001 dhe 0002). Nis me: psql -v ON_ERROR_STOP=1 -f tests/test_cropin.sql
truncate public.companies, auth.users restart identity cascade;
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000f');
insert into public.companies (name, kind) values ('BioBes', 'biobes'), ('B', 'grumbullues');
insert into public.farmers (company_id, first_name, last_name) values (1, 'Mersin', 'Sinani'), (1, 'Agron', 'Kaci');
insert into public.members (user_id, company_id, role, name, farmer_id) values
  ('00000000-0000-0000-0000-00000000000a', 1, 'admin', 'A', null),
  ('00000000-0000-0000-0000-00000000000b', 1, 'staf', 'S', null),
  ('00000000-0000-0000-0000-00000000000c', 1, 'fermer', 'Mersin', 1),
  ('00000000-0000-0000-0000-00000000000d', 2, 'admin', 'B', null),
  ('00000000-0000-0000-0000-00000000000f', 1, 'grumbullues', 'G', null);
create function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, true); execute 'set local role authenticated'; end $$;
grant execute on function pg_temp.as_user(text) to public;

-- 1. Stafi krijon parcelë me GPS, kultivim, detyrë, vëzhgim dhe input
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.zones (company_id, code) values (1, 'W010F/1a');
insert into public.products (company_id, code, name) values (1, '115', 'Mjedër');
insert into public.plots (company_id, name, code, zone_id, farmer_id, area_ha, lat, lng, growing, irrigation)
values (1, 'Parcela 1', 'K01', 1, 1, 2.5, 41.1234567, 19.7654321, 'field', 'drip');
insert into public.cultivations (company_id, plot_id, product_id, sowing_date, stage, expected_yield_kg)
values (1, 1, 1, '2026-03-01', 'growing', 500);
insert into public.tasks (company_id, plot_id, cultivation_id, title, type, due_date, assignee_farmer_id)
values (1, 1, 1, 'Ujitja e parë', 'irrigate', '2026-03-05', 1);
insert into public.observations (company_id, plot_id, date, kind, severity, description)
values (1, 1, '2026-03-10', 'pest', 2, 'Afide në gjethe');
insert into public.inputs (company_id, plot_id, date, category, description, qty, unit, amount)
values (1, 1, '2026-03-02', 'seed', 'Fara mjedre', 10, 'kg', 25000);
insert into public.leases (company_id, plot_id, owner_name, rent_amount) values (1, 1, 'Pronari X', 100000);
insert into public.payments (company_id, lease_id, date, amount) values (1, 1, '2026-01-15', 50000);
insert into public.reminders (company_id, title, due_date) values (1, 'Pagesa qirasë', '2026-04-01');
do $$ declare s record; begin
  select * into s from public.dashboard_stats where company_id = 1;
  if s.plots <> 1 or s.area_ha <> 2.5 or s.cultivations_active <> 1 or s.tasks_open <> 1
     or s.observations_open <> 1 or s.inputs_year <> 25000 then
    raise exception 'dashboard_stats gabim: %', row_to_json(s);
  end if;
  if (select count(*) from public.plot_summary where plot_id = 1) <> 1 then raise exception 'plot_summary mungon'; end if;
  -- mbyllja e detyrës vendos completed_at
  update public.tasks set status = 'done' where id = 1;
  if (select completed_at is null from public.tasks where id = 1) then raise exception 'completed_at nuk u vendos'; end if;
  -- zgjidhja e vëzhgimit vendos resolved_date
  update public.observations set resolved = true where id = 1;
  if (select resolved_date is null from public.observations where id = 1) then raise exception 'resolved_date nuk u vendos'; end if;
end $$;

-- 2. Koordinatat jashtë intervalit refuzohen
do $$ begin
  begin insert into public.plots (company_id, name, lat) values (1, 'X', 999); raise exception 'duhej të dështonte';
  exception when check_violation then null; end;
end $$;

-- 3. Fermeri sheh parcelat/detyrat e veta dhe raporton vëzhgim, por nuk sheh inputet
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from public.plots) <> 1 then raise exception 'fermeri sheh % parcela, duhej 1', (select count(*) from public.plots); end if;
  if (select count(*) from public.tasks) <> 1 then raise exception 'fermeri sheh % detyra, duhej 1', (select count(*) from public.tasks); end if;
  if (select count(*) from public.inputs) <> 0 then raise exception 'fermeri sheh inputet'; end if;
  if (select count(*) from public.leases) <> 0 then raise exception 'fermeri sheh qiranë'; end if;
  insert into public.observations (company_id, plot_id, date, kind, description) values (1, 1, '2026-03-12', 'weed', 'Barëra');
  if (select count(*) from public.observations) <> 2 then raise exception 'vëzhgimi i fermer-it nuk u ruajt'; end if;
  begin insert into public.plots (company_id, name) values (1, 'Hajdutë'); raise exception 'duhej të dështonte';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. Kompania B nuk sheh asgjë nga A dhe nuk mund të lidhë parcelën e A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from public.plots) <> 0 or (select count(*) from public.tasks) <> 0
     or (select count(*) from public.observations) <> 0 or (select count(*) from public.inputs) <> 0 then
    raise exception 'B sheh të dhënat e A';
  end if;
  begin insert into public.cultivations (company_id, plot_id, sowing_date) values (2, 1, '2026-01-01'); raise exception 'duhej të dështonte';
  exception when raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
  begin insert into public.tasks (company_id, plot_id, title, due_date) values (2, 1, 'X', '2026-01-01'); raise exception 'duhej të dështonte';
  exception when raise_exception then if sqlerrm = 'duhej të dështonte' then raise; end if; end;
end $$;

-- 5. Grumbulluesi sheh parcelat dhe detyrat, por nuk fshin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin
  if (select count(*) from public.plots) <> 1 then raise exception 'grumbulluesi nuk sheh parcelat'; end if;
  -- RLS nuk lejon fshirjen: rreshti mbetet (DELETE prek 0 rreshta, pa gabim)
  delete from public.plots where id = 1;
  if (select count(*) from public.plots) <> 1 then raise exception 'grumbulluesi fshiu parcelën'; end if;
end $$;

rollback;
select 'TESTET E CROPIN: TË GJITHA KALUAN' as rezultati;
