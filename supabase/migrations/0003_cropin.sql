-- Faza 3+4 (si Cropin SmartFarm): parcelat me gjeotagim, kultivimet, detyrat në fushë,
-- vëzhgimet/dëmtimet me foto, inputet dhe trajtime, qiratë, pagesat dhe kujtuesit.
-- Çdo rresht ka company_id; RLS si te 0001/0002.

-- ============ Parcelat (gjeotagim) ============
create table public.plots (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  name text not null,
  code text not null default '',
  zone_id bigint references public.zones (id) on delete set null,
  farmer_id bigint references public.farmers (id) on delete set null,
  area_ha numeric(12, 4) not null default 0 check (area_ha >= 0),
  lat numeric(10, 7) check (lat between -90 and 90),
  lng numeric(11, 7) check (lng between -180 and 180),
  soil_type text not null default '',
  growing text not null default 'field' check (growing in ('field', 'greenhouse')),
  irrigation text not null default 'none' check (irrigation in ('drip', 'sprinkler', 'furrow', 'none')),
  note text not null default '',
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index plots_company on public.plots (company_id, active);
create index plots_farmer on public.plots (company_id, farmer_id);

-- ============ Kultivimet (ciklet e mbjelljes/vjeljes) ============
create table public.cultivations (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint not null references public.plots (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  variety text not null default '',
  sowing_date date,
  expected_harvest date,
  stage text not null default 'planned' check (stage in ('planned', 'growing', 'harvest', 'done')),
  expected_yield_kg numeric(14, 2) not null default 0 check (expected_yield_kg >= 0),
  note text not null default '',
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index cultivations_plot on public.cultivations (company_id, plot_id);

-- ============ Detyrat në fushë (workflows) ============
create table public.tasks (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint references public.plots (id) on delete set null,
  cultivation_id bigint references public.cultivations (id) on delete set null,
  title text not null,
  type text not null default 'other' check (type in ('sow', 'irrigate', 'fertilize', 'protect', 'care', 'scout', 'prune', 'harvest', 'other')),
  due_date date not null,
  assignee_user_id uuid,
  assignee_farmer_id bigint references public.farmers (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  notes text not null default '',
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index tasks_company_due on public.tasks (company_id, due_date);
create index tasks_plot on public.tasks (company_id, plot_id);

-- ============ Vëzhgimet (dëmtues, sëmundje, moti) me foto dhe këshillë ============
create table public.observations (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint references public.plots (id) on delete set null,
  cultivation_id bigint references public.cultivations (id) on delete set null,
  date date not null,
  kind text not null default 'other' check (kind in ('pest', 'disease', 'weed', 'stress', 'damage', 'other')),
  severity int not null default 1 check (severity between 1 and 3),
  description text not null default '',
  photo_url text not null default '',
  advice text not null default '',
  resolved boolean not null default false,
  resolved_date date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index observations_company on public.observations (company_id, date);
create index observations_plot on public.observations (company_id, plot_id);

-- ============ Inputet: shpenzime parcele dhe trajtime ============
create table public.inputs (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint references public.plots (id) on delete set null,
  cultivation_id bigint references public.cultivations (id) on delete set null,
  date date not null,
  category text not null default 'other' check (category in ('seed', 'fert', 'pest', 'water', 'fuel', 'labor', 'machinery', 'other')),
  description text not null default '',
  qty numeric(14, 2) not null default 0 check (qty >= 0),
  unit text not null default '',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  supplier text not null default '',
  lot_code text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index inputs_company_date on public.inputs (company_id, date);
create index inputs_plot on public.inputs (company_id, plot_id);

-- ============ Qiratë e tokës ============
create table public.leases (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint not null references public.plots (id) on delete cascade,
  owner_name text not null default '',
  start_date date,
  end_date date,
  rent_amount numeric(14, 2) not null default 0 check (rent_amount >= 0),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ============ Pagesat (qira dhe fermerëve) ============
create table public.payments (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  lease_id bigint references public.leases (id) on delete set null,
  farmer_id bigint references public.farmers (id) on delete set null,
  date date not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  method text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index payments_company_date on public.payments (company_id, date);

-- ============ Kujtuesit ============
create table public.reminders (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  title text not null,
  due_date date not null,
  done boolean not null default false,
  related_table text not null default '',
  related_id bigint,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index reminders_company on public.reminders (company_id, due_date);

-- ============ Triggerat: lidhjet duhet të jenë nga e njëjta kompani ============
create function public.plots_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.zone_id is not null and not exists (select 1 from public.zones where id = new.zone_id and company_id = new.company_id) then
    raise exception 'Zona nuk i përket kësaj kompanie';
  end if;
  if new.farmer_id is not null and not exists (select 1 from public.farmers where id = new.farmer_id and company_id = new.company_id) then
    raise exception 'Fermeri nuk i përket kësaj kompanie';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger plots_before before insert or update on public.plots
  for each row execute function public.plots_before();

create function public.cultivations_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  if new.product_id is not null and not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
    raise exception 'Produkti nuk i përket kësaj kompanie';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger cultivations_before before insert or update on public.cultivations
  for each row execute function public.cultivations_before();

create function public.tasks_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.plot_id is not null and not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  if new.cultivation_id is not null and not exists (select 1 from public.cultivations where id = new.cultivation_id and company_id = new.company_id) then
    raise exception 'Kultivimi nuk i përket kësaj kompanie';
  end if;
  if new.assignee_farmer_id is not null and not exists (select 1 from public.farmers where id = new.assignee_farmer_id and company_id = new.company_id) then
    raise exception 'Fermeri nuk i përket kësaj kompanie';
  end if;
  if new.status = 'done' and new.completed_at is null then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger tasks_before before insert or update on public.tasks
  for each row execute function public.tasks_before();

create function public.observations_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.plot_id is not null and not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  if new.cultivation_id is not null and not exists (select 1 from public.cultivations where id = new.cultivation_id and company_id = new.company_id) then
    raise exception 'Kultivimi nuk i përket kësaj kompanie';
  end if;
  if new.resolved and new.resolved_date is null then new.resolved_date := current_date; end if;
  if not new.resolved then new.resolved_date := null; end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger observations_before before insert or update on public.observations
  for each row execute function public.observations_before();

create function public.inputs_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.plot_id is not null and not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  if new.cultivation_id is not null and not exists (select 1 from public.cultivations where id = new.cultivation_id and company_id = new.company_id) then
    raise exception 'Kultivimi nuk i përket kësaj kompanie';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger inputs_before before insert or update on public.inputs
  for each row execute function public.inputs_before();

create function public.leases_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger leases_before before insert or update on public.leases
  for each row execute function public.leases_before();

create function public.payments_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.lease_id is not null and not exists (select 1 from public.leases where id = new.lease_id and company_id = new.company_id) then
    raise exception 'Qiraja nuk i përket kësaj kompanie';
  end if;
  if new.farmer_id is not null and not exists (select 1 from public.farmers where id = new.farmer_id and company_id = new.company_id) then
    raise exception 'Fermeri nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger payments_before before insert or update on public.payments
  for each row execute function public.payments_before();

-- ============ RLS ============
alter table public.plots enable row level security;
alter table public.cultivations enable row level security;
alter table public.tasks enable row level security;
alter table public.observations enable row level security;
alter table public.inputs enable row level security;
alter table public.leases enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;

-- Parcelat: stafi lexon/shkruan; fermeri sheh vetëm parcelat e veta
create policy plots_read on public.plots for select to authenticated
  using (public.can_read(company_id) or farmer_id = public.my_farmer_id(company_id));
create policy plots_ins on public.plots for insert to authenticated with check (public.can_write(company_id));
create policy plots_upd on public.plots for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy plots_del on public.plots for delete to authenticated using (public.can_delete(company_id));

-- Kultivimet: fermeri sheh kultivimet e parcelave të veta
create policy cultivations_read on public.cultivations for select to authenticated
  using (public.can_read(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy cultivations_ins on public.cultivations for insert to authenticated with check (public.can_write(company_id));
create policy cultivations_upd on public.cultivations for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy cultivations_del on public.cultivations for delete to authenticated using (public.can_delete(company_id));

-- Detyrat: fermeri sheh detyrat e caktuara për të ose të parcelave të veta, dhe mund t'i mbyllë
create policy tasks_read on public.tasks for select to authenticated
  using (public.can_read(company_id)
    or assignee_farmer_id = public.my_farmer_id(company_id)
    or exists (select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy tasks_ins on public.tasks for insert to authenticated with check (public.can_write(company_id));
create policy tasks_upd on public.tasks for update to authenticated
  using (public.can_write(company_id)
    or assignee_farmer_id = public.my_farmer_id(company_id)
    or exists (select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)))
  with check (public.can_write(company_id)
    or assignee_farmer_id = public.my_farmer_id(company_id)
    or exists (select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy tasks_del on public.tasks for delete to authenticated using (public.can_delete(company_id));

-- Vëzhgimet: fermeri mund të raportojë nga parcelat e veta
create policy observations_read on public.observations for select to authenticated
  using (public.can_read(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy observations_ins on public.observations for insert to authenticated
  with check (public.can_write(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy observations_upd on public.observations for update to authenticated
  using (public.can_write(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)))
  with check (public.can_write(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy observations_del on public.observations for delete to authenticated using (public.can_delete(company_id));

-- Inputet, qiratë, kujtuesit: vetëm stafi (kosto dhe kontrata)
create policy inputs_read on public.inputs for select to authenticated using (public.can_read(company_id));
create policy inputs_ins on public.inputs for insert to authenticated with check (public.can_write(company_id));
create policy inputs_upd on public.inputs for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy inputs_del on public.inputs for delete to authenticated using (public.can_delete(company_id));

create policy leases_read on public.leases for select to authenticated using (public.can_read(company_id));
create policy leases_ins on public.leases for insert to authenticated with check (public.can_write(company_id));
create policy leases_upd on public.leases for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy leases_del on public.leases for delete to authenticated using (public.can_delete(company_id));

create policy reminders_read on public.reminders for select to authenticated using (public.can_read(company_id));
create policy reminders_ins on public.reminders for insert to authenticated with check (public.can_write(company_id));
create policy reminders_upd on public.reminders for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy reminders_del on public.reminders for delete to authenticated using (public.can_delete(company_id));

-- Pagesat: fermeri sheh pagesat e veta
create policy payments_read on public.payments for select to authenticated
  using (public.can_read(company_id) or farmer_id = public.my_farmer_id(company_id));
create policy payments_ins on public.payments for insert to authenticated with check (public.can_write(company_id));
create policy payments_upd on public.payments for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy payments_del on public.payments for delete to authenticated using (public.can_delete(company_id));

-- ============ Pamjet e dashboard-it ============
create view public.dashboard_stats with (security_invoker = true) as
select c.id as company_id,
  (select count(*) from public.plots p where p.company_id = c.id and p.active) as plots,
  coalesce((select sum(p.area_ha) from public.plots p where p.company_id = c.id and p.active), 0) as area_ha,
  (select count(*) from public.cultivations k where k.company_id = c.id and k.active and k.stage in ('planned', 'growing', 'harvest')) as cultivations_active,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open') as tasks_open,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open' and t.due_date < current_date) as tasks_overdue,
  (select count(*) from public.observations o where o.company_id = c.id and not o.resolved) as observations_open,
  coalesce((select sum(i.amount) from public.inputs i where i.company_id = c.id and extract(year from i.date) = extract(year from current_date)), 0) as inputs_year,
  coalesce((select sum(p.amount) from public.purchases p where p.company_id = c.id and extract(year from p.date) = extract(year from current_date)), 0) as purchases_year,
  (select count(*) from public.reminders r where r.company_id = c.id and not r.done and r.due_date < current_date) as reminders_overdue
from public.companies c;

create view public.plot_summary with (security_invoker = true) as
select p.company_id, p.id as plot_id, p.name, p.code, p.area_ha, p.lat, p.lng, p.growing, p.irrigation,
  f.first_name || ' ' || f.last_name as farmer,
  (select count(*) from public.cultivations k where k.plot_id = p.id and k.active) as cultivations,
  (select count(*) from public.tasks t where t.plot_id = p.id and t.status = 'open') as tasks_open,
  (select count(*) from public.observations o where o.plot_id = p.id and not o.resolved) as observations_open,
  coalesce((select sum(i.amount) from public.inputs i where i.plot_id = p.id), 0) as inputs_cost
from public.plots p
left join public.farmers f on f.id = p.farmer_id
where p.active;

-- Përmbledhja e qirave: sa është paguar sipas pagesave të lidhura
create view public.lease_summary with (security_invoker = true) as
select l.company_id, l.id as lease_id, l.plot_id, p.name as plot, l.owner_name, l.start_date, l.end_date,
  l.rent_amount,
  coalesce((select sum(pay.amount) from public.payments pay where pay.lease_id = l.id), 0) as paid,
  l.rent_amount - coalesce((select sum(pay.amount) from public.payments pay where pay.lease_id = l.id), 0) as remaining
from public.leases l
join public.plots p on p.id = l.plot_id;

-- ============ Të drejtat ============
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.plots, public.cultivations, public.tasks, public.observations,
  public.inputs, public.leases, public.payments, public.reminders to authenticated;
grant select on public.dashboard_stats, public.plot_summary, public.lease_summary to authenticated;
revoke execute on function public.plots_before(), public.cultivations_before(), public.tasks_before(),
  public.observations_before(), public.inputs_before(), public.leases_before(), public.payments_before()
  from public, anon;

-- ============ Fotot e fushës (Storage) ============
-- Krijon bucket-in «field-photos» vetëm nëse ekziston skema storage (Supabase).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('field-photos', 'field-photos', true)
      on conflict (id) do nothing;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'field-photos read') then
      execute 'create policy "field-photos read" on storage.objects for select to authenticated using (bucket_id = ''field-photos'')';
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'field-photos write') then
      execute 'create policy "field-photos write" on storage.objects for insert to authenticated with check (bucket_id = ''field-photos'')';
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'field-photos update') then
      execute 'create policy "field-photos update" on storage.objects for update to authenticated using (bucket_id = ''field-photos'') with check (bucket_id = ''field-photos'')';
    end if;
  end if;
end $$;
