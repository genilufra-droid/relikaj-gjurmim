-- Faza 6: gjurmueshmëria e plotë e BioBes — nga toka (edhe djerr) te eksporti.
-- Zinxhiri: parcela → qiraja/kontrata → punimet e tokës → mbjellja & trajtimet → korrja (fermeri)
-- → grumbulluesi i zonës → dorëzimi në qendër → përpunimi → mostrat → eksporti te klienti.

-- ============ Zonat: grumbulluesi dhe pika e grumbullimit ============
alter table public.zones
  add column collector_user_id uuid,
  add column collector_name text not null default '',
  add column collection_point text not null default '',
  add column region text not null default '';

-- ============ Parcelat: pronësia dhe statusi (edhe tokë djerr) ============
alter table public.plots
  add column ownership text not null default 'owned' check (ownership in ('owned', 'leased', 'wild')),
  add column status text not null default 'active' check (status in ('active', 'fallow', 'resting')),
  add column altitude int,
  add column organic boolean not null default true,
  add column certified_from date;

-- ============ Qiraja: afati, statusi dhe garancia ============
alter table public.leases
  add column term_months int,
  add column status text not null default 'active' check (status in ('active', 'ended')),
  add column deposit numeric(14, 2) not null default 0 check (deposit >= 0);

-- ============ Blerjet (korrjet): lidhja me parcelën dhe kultivimin ============
alter table public.purchases
  add column plot_id bigint references public.plots (id) on delete set null,
  add column cultivation_id bigint references public.cultivations (id) on delete set null;
create index purchases_plot on public.purchases (company_id, plot_id);

-- ============ Mostrat: vendi i marrjes (parcelë ose qendër) dhe rezultatet ============
alter table public.samples
  add column point text not null default 'center' check (point in ('plot', 'center', 'warehouse')),
  add column plot_id bigint references public.plots (id) on delete set null,
  add column lab text not null default '',
  add column moisture numeric(6, 2),
  add column purity numeric(6, 2),
  add column passed boolean;

-- ============ Pagesat: kush paguan dhe për cilën korrje ============
alter table public.payments
  add column purchase_id bigint references public.purchases (id) on delete set null,
  add column paid_by text not null default 'company' check (paid_by in ('company', 'collector')),
  add column receipt_no text not null default '';

-- ============ Magazina: klienti i eksportit dhe dokumenti ============
alter table public.stock_moves
  add column customer_id bigint references public.customers (id) on delete set null,
  add column document_no text not null default '';

-- ============ Dokumentet: lidhje me qiranë, korrjen, dorëzimin dhe mostrën ============
alter table public.documents
  add column lease_id bigint references public.leases (id) on delete cascade,
  add column purchase_id bigint references public.purchases (id) on delete cascade,
  add column stock_move_id bigint references public.stock_moves (id) on delete cascade,
  add column sample_id bigint references public.samples (id) on delete cascade;

-- Llojet e dokumenteve të biznesit: kontratë qiraje, faturë korrjeje, fletë dorëzimi, certifikatë
alter table public.documents drop constraint documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('photo', 'pdf', 'doc', 'other', 'kontrate', 'fature', 'flete', 'certifikate', 'raport'));

-- ============ Punimet e tokës: plugim, frezim, lesë, mihje, transport ============
create table public.land_operations (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint not null references public.plots (id) on delete cascade,
  date date not null,
  kind text not null default 'other' check (kind in ('plow', 'till', 'harrow', 'subsoil', 'level', 'mow', 'haul', 'other')),
  contractor text not null default '',
  machine text not null default '',
  hours numeric(10, 2) not null default 0 check (hours >= 0),
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index land_operations_plot on public.land_operations (company_id, plot_id, date);

-- ============ Trajtimet e bimëve: plehra, pesticide, ujitje (me interval para vjeljes) ============
create table public.applications (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint not null references public.plots (id) on delete cascade,
  cultivation_id bigint references public.cultivations (id) on delete set null,
  date date not null,
  kind text not null default 'other' check (kind in ('fert', 'pesticide', 'foliar', 'irrigation', 'biological', 'other')),
  product_name text not null default '',
  dose numeric(12, 3) not null default 0 check (dose >= 0),
  unit text not null default '',
  area_ha numeric(12, 4) not null default 0 check (area_ha >= 0),
  phi_days int check (phi_days >= 0),
  operator text not null default '',
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  organic_ok boolean not null default true,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index applications_plot on public.applications (company_id, plot_id, date);

-- ============ Përpunimi: batch-et e qendrës (tharje, pastrim, prerje, vaj) ============
create table public.batches (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  code text not null,
  date date not null,
  method text not null default 'other' check (method in ('drying', 'cleaning', 'cutting', 'grading', 'oil', 'packing', 'other')),
  source_lot text not null default '',
  product_id bigint references public.products (id) on delete set null,
  warehouse_id bigint references public.warehouses (id) on delete set null,
  input_qty numeric(14, 2) not null default 0 check (input_qty >= 0),
  output_qty numeric(14, 2) not null default 0 check (output_qty >= 0),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index batches_source on public.batches (company_id, source_lot);

-- ============ Kontrolli që lidhjet të jenë brenda kompanisë ============
create function public.assert_plot(cid bigint, pid bigint) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if pid is not null and not exists (select 1 from public.plots where id = pid and company_id = cid) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
end $$;

create function public.land_operations_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then raise exception 'Kompania nuk ndryshohet'; end if;
  perform public.assert_plot(new.company_id, new.plot_id);
  return new;
end $$;
create trigger land_operations_before before insert or update on public.land_operations
  for each row execute function public.land_operations_before();

create function public.applications_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then raise exception 'Kompania nuk ndryshohet'; end if;
  perform public.assert_plot(new.company_id, new.plot_id);
  if new.cultivation_id is not null and not exists (select 1 from public.cultivations where id = new.cultivation_id and company_id = new.company_id) then
    raise exception 'Kultivimi nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger applications_before before insert or update on public.applications
  for each row execute function public.applications_before();

create function public.batches_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then raise exception 'Kompania nuk ndryshohet'; end if;
  if new.product_id is not null and not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
    raise exception 'Produkti nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger batches_before before insert or update on public.batches
  for each row execute function public.batches_before();

-- Korrja: parcela dhe kultivimi duhet të jenë të kompanisë (dhe parcela e fermerit)
create function public.purchases_links_before() returns trigger language plpgsql as
$$
begin
  perform public.assert_plot(new.company_id, new.plot_id);
  if new.cultivation_id is not null and not exists (select 1 from public.cultivations where id = new.cultivation_id and company_id = new.company_id) then
    raise exception 'Kultivimi nuk i përket kësaj kompanie';
  end if;
  if new.plot_id is not null and new.farmer_id is not null and not exists (
    select 1 from public.plots where id = new.plot_id and (farmer_id is null or farmer_id = new.farmer_id)
  ) then
    raise exception 'Kjo parcelë është e një fermeri tjetër';
  end if;
  return new;
end $$;
create trigger purchases_links_before before insert or update on public.purchases
  for each row execute function public.purchases_links_before();

-- ============ RLS ============
alter table public.land_operations enable row level security;
alter table public.applications enable row level security;
alter table public.batches enable row level security;

create policy land_ops_read on public.land_operations for select to authenticated
  using (public.can_read(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy land_ops_ins on public.land_operations for insert to authenticated with check (public.can_write(company_id));
create policy land_ops_upd on public.land_operations for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy land_ops_del on public.land_operations for delete to authenticated using (public.can_delete(company_id));

create policy applications_read on public.applications for select to authenticated
  using (public.can_read(company_id) or exists (
    select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy applications_ins on public.applications for insert to authenticated with check (public.can_write(company_id));
create policy applications_upd on public.applications for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy applications_del on public.applications for delete to authenticated using (public.can_delete(company_id));

create policy batches_read on public.batches for select to authenticated using (public.can_read(company_id));
create policy batches_ins on public.batches for insert to authenticated with check (public.can_write(company_id));
create policy batches_upd on public.batches for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy batches_del on public.batches for delete to authenticated using (public.can_delete(company_id));

grant select, insert, update, delete on public.land_operations, public.applications, public.batches to authenticated;
revoke all on public.land_operations, public.applications, public.batches from anon;
revoke execute on function public.land_operations_before(), public.applications_before(),
  public.batches_before(), public.purchases_links_before() from public, anon;
-- assert_plot thirret nga triggerat (jo security definer), prandaj duhet leje për të kyçurit
grant execute on function public.assert_plot(bigint, bigint) to authenticated;

-- ============ Pamjet e gjurmueshmërisë ============

-- Zonat: grumbulluesi, parcelat, fermerët dhe sasitë e vitit
create view public.zone_summary with (security_invoker = true) as
select z.company_id, z.id as zone_id, z.code, z.name, z.collector_name, z.collection_point, z.region, z.fair_wild,
  (select count(*) from public.plots p where p.zone_id = z.id and p.active) as plots,
  coalesce((select sum(p.area_ha) from public.plots p where p.zone_id = z.id and p.active), 0) as area_ha,
  (select count(distinct p.farmer_id) from public.plots p where p.zone_id = z.id and p.farmer_id is not null) as farmers,
  coalesce((select sum(pu.qty_fresh) from public.purchases pu where pu.zone_id = z.id and extract(year from pu.date) = extract(year from current_date)), 0) as fresh_year,
  coalesce((select sum(pu.qty_dry) from public.purchases pu where pu.zone_id = z.id and extract(year from pu.date) = extract(year from current_date)), 0) as dry_year,
  coalesce((select sum(pu.amount) from public.purchases pu where pu.zone_id = z.id and extract(year from pu.date) = extract(year from current_date)), 0) as amount_year
from public.zones z
where z.active;

-- Loti: nga kush, nga sa parcela, cili grumbullues
create view public.lot_chain with (security_invoker = true) as
select pu.company_id, pu.lot_code, pr.name as product, pr.code as product_code,
  min(pu.date) as d_from, max(pu.date) as d_to,
  count(distinct pu.farmer_id) as farmers,
  count(distinct pu.plot_id) as plots,
  (array_agg(distinct z.code))[1] as zone,
  (array_agg(distinct z.collector_name) filter (where z.collector_name <> ''))[1] as collector,
  (array_agg(distinct z.collection_point) filter (where z.collection_point <> ''))[1] as collection_point,
  sum(pu.qty_fresh) as fresh, sum(pu.qty_dry) as dry, sum(pu.amount) as amount,
  sum(pu.paid) as paid
from public.purchases pu
join public.products pr on pr.id = pu.product_id
left join public.zones z on z.id = pu.zone_id
group by pu.company_id, pu.lot_code, pr.name, pr.code;

-- Cila parcelë, cili fermer, sa kg për lotin
create view public.lot_plots with (security_invoker = true) as
select pu.company_id, pu.lot_code,
  pu.plot_id, coalesce(p.name, 'Pa parcelë') as plot, p.code as plot_code, p.area_ha, p.ownership, p.status,
  pu.farmer_id, f.first_name || ' ' || f.last_name as farmer,
  coalesce(z.code, '') as zone, coalesce(z.collector_name, '') as collector,
  sum(pu.qty_fresh) as fresh, sum(pu.qty_dry) as dry,
  min(pu.date) as d_from, max(pu.date) as d_to, count(*) as deliveries
from public.purchases pu
left join public.plots p on p.id = pu.plot_id
left join public.farmers f on f.id = pu.farmer_id
left join public.zones z on z.id = pu.zone_id
group by pu.company_id, pu.lot_code, pu.plot_id, p.name, p.code, p.area_ha, p.ownership, p.status,
  pu.farmer_id, f.first_name, f.last_name, z.code, z.collector_name;

-- Historiku i çdo parcele: punime, trajtime, inpute, vëzhgime, detyra (një rrjedhë)
create view public.plot_activity with (security_invoker = true) as
select o.company_id, o.plot_id, o.date, 'punim'::text as kind, o.kind::text as detail,
       coalesce(nullif(o.contractor, ''), nullif(o.machine, ''), '') as who, o.cost as amount, o.note
from public.land_operations o
union all
select a.company_id, a.plot_id, a.date, 'trajtim'::text, a.kind::text || ' · ' || a.product_name,
       coalesce(nullif(a.operator, ''), ''), a.cost, a.note
from public.applications a
union all
select i.company_id, i.plot_id, i.date, 'input'::text, i.category::text || ' · ' || i.description,
       coalesce(nullif(i.supplier, ''), ''), i.amount, ''::text
from public.inputs i
union all
select o.company_id, o.plot_id, o.date, 'vëzhgim'::text, o.kind::text,
       '', 0::numeric, o.description
from public.observations o
union all
select t.company_id, t.plot_id, t.due_date, 'detyrë'::text, t.title,
       '', 0::numeric, t.status::text
from public.tasks t
where t.plot_id is not null;

-- Përpunimi: rendimenti i batch-it
create view public.batch_summary with (security_invoker = true) as
select b.company_id, b.id as batch_id, b.code, b.date, b.method, b.source_lot,
  pr.name as product, w.name as warehouse, b.input_qty, b.output_qty,
  case when b.input_qty > 0 then round(100 * b.output_qty / b.input_qty, 1) else 0 end as yield_pct,
  b.note
from public.batches b
left join public.products pr on pr.id = b.product_id
left join public.warehouses w on w.id = b.warehouse_id;

grant select on public.zone_summary, public.lot_chain, public.lot_plots, public.plot_activity, public.batch_summary to authenticated;
