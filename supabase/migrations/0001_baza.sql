-- Gjurmueshmëria BioBes / relikaj.al — faza 1: kompani, anëtarë, të dhëna bazë, blerje, magazinë.
-- Çdo rresht ka company_id. Politikat RLS e lejojnë përdoruesin vetëm te kompanitë ku është anëtar.

create table public.companies (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null default '',
  kind text not null default 'biobes' check (kind in ('biobes', 'grumbullues', 'tjeter')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Administratorët e platformës (relikaj.al): shohin dhe krijojnë kompani
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.members (
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id bigint not null references public.companies (id) on delete cascade,
  role text not null check (role in ('admin', 'staf', 'grumbullues', 'fermer')),
  name text not null default '',
  farmer_id bigint,                          -- për rolin «fermer»
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table public.products (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  code text not null default '',
  name text not null,
  latin text not null default '',
  part text not null default '',
  active boolean not null default true
);

create table public.farmers (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  address text not null default '',
  family_size int,
  id_number text not null default '',
  group_name text not null default '',
  zone_code text not null default '',
  phone text not null default '',
  note text not null default '',
  active boolean not null default true
);
alter table public.members add constraint members_farmer_fk foreign key (farmer_id) references public.farmers (id) on delete set null;

create table public.zones (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  code text not null,
  name text not null default '',
  fair_wild boolean not null default false,
  note text not null default '',
  active boolean not null default true
);

create table public.warehouses (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  name text not null,
  active boolean not null default true
);

create table public.purchases (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  date date not null,
  farmer_id bigint not null references public.farmers (id),
  zone_id bigint not null references public.zones (id),
  product_id bigint not null references public.products (id),
  cut text not null default 'I',
  year int,
  lot_code text not null default '',
  qty_fresh numeric(14, 2) not null default 0 check (qty_fresh >= 0),
  qty_dry numeric(14, 2) not null default 0 check (qty_dry >= 0),
  price numeric(14, 2) not null default 0 check (price >= 0),
  amount numeric(14, 2) not null default 0,
  paid numeric(14, 2) not null default 0 check (paid >= 0),
  warehouse_id bigint references public.warehouses (id),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index purchases_lot on public.purchases (company_id, lot_code);
create index purchases_farmer on public.purchases (company_id, farmer_id);
create index purchases_date on public.purchases (company_id, date);

create table public.stock_moves (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  date date not null,
  warehouse_id bigint not null references public.warehouses (id),
  product_id bigint not null references public.products (id),
  lot_code text not null default '',
  kind text not null check (kind in ('fillestare', 'blerje', 'dorezim', 'eksport', 'rregullim')),
  qty_in numeric(14, 2) not null default 0 check (qty_in >= 0),
  qty_out numeric(14, 2) not null default 0 check (qty_out >= 0),
  counterparty text not null default '',
  purchase_id bigint references public.purchases (id) on delete cascade,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_moves_lot on public.stock_moves (company_id, lot_code);
create unique index stock_moves_purchase on public.stock_moves (purchase_id) where purchase_id is not null;

-- ============ Funksionet e lejeve ============
create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.platform_admins where user_id = auth.uid()) $$;

create function public.member_role(cid bigint) returns text
language sql stable security definer set search_path = public as
$$ select role from public.members where user_id = auth.uid() and company_id = cid and active limit 1 $$;

create function public.can_read(cid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_platform_admin() or coalesce(public.member_role(cid) in ('admin', 'staf', 'grumbullues'), false) $$;

create function public.can_write(cid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select public.can_read(cid) $$;

create function public.can_delete(cid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_platform_admin() or coalesce(public.member_role(cid) in ('admin', 'staf'), false) $$;

create function public.my_farmer_id(cid bigint) returns bigint
language sql stable security definer set search_path = public as
$$ select farmer_id from public.members where user_id = auth.uid() and company_id = cid and active and role = 'fermer' limit 1 $$;

-- ============ Triggerat ============
create function public.purchases_before() returns trigger language plpgsql as
$$
declare z text; p text;
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.cut not in ('I', 'II', 'III') then
    raise exception 'Korrja duhet të jetë I, II ose III';
  end if;
  select code into z from public.zones where id = new.zone_id and company_id = new.company_id;
  if z is null then raise exception 'Zona nuk i përket kompanisë'; end if;
  select code into p from public.products where id = new.product_id and company_id = new.company_id;
  if p is null then raise exception 'Produkti nuk i përket kompanisë'; end if;
  if not exists (select 1 from public.farmers where id = new.farmer_id and company_id = new.company_id) then
    raise exception 'Fermeri nuk i përket kompanisë';
  end if;
  if new.warehouse_id is not null
     and not exists (select 1 from public.warehouses where id = new.warehouse_id and company_id = new.company_id) then
    raise exception 'Magazina nuk i përket kompanisë';
  end if;
  new.year := coalesce(new.year, extract(year from new.date)::int);
  new.lot_code := z || '-' || new.cut || '-' || p || '-' || lpad((new.year % 100)::text, 2, '0');
  new.amount := round(new.qty_dry * new.price, 2);
  if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  return new;
end
$$;
create trigger purchases_before before insert or update on public.purchases
  for each row execute function public.purchases_before();

-- Hyrja në magazinë (sasia e thatë) ndjek blerjen
create function public.purchases_sync() returns trigger language plpgsql security definer set search_path = public as
$$
declare wh bigint;
begin
  if new.qty_dry <= 0 then
    delete from public.stock_moves where purchase_id = new.id;
    return new;
  end if;
  wh := coalesce(new.warehouse_id,
                 (select id from public.warehouses where company_id = new.company_id and active order by id limit 1));
  if wh is null then
    insert into public.warehouses (company_id, name) values (new.company_id, 'Magazina 1') returning id into wh;
  end if;
  insert into public.stock_moves (company_id, date, warehouse_id, product_id, lot_code, kind, qty_in, purchase_id, created_by)
  values (new.company_id, new.date, wh, new.product_id, new.lot_code, 'blerje', new.qty_dry, new.id, new.created_by)
  on conflict (purchase_id) where purchase_id is not null
  do update set date = excluded.date, warehouse_id = excluded.warehouse_id, product_id = excluded.product_id,
                lot_code = excluded.lot_code, qty_in = excluded.qty_in;
  return new;
end
$$;
create trigger purchases_sync after insert or update on public.purchases
  for each row execute function public.purchases_sync();

create function public.stock_moves_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
    raise exception 'Produkti nuk i përket kompanisë';
  end if;
  if not exists (select 1 from public.warehouses where id = new.warehouse_id and company_id = new.company_id) then
    raise exception 'Magazina nuk i përket kompanisë';
  end if;
  if new.qty_in = 0 and new.qty_out = 0 then raise exception 'Shkruani një sasi pozitive'; end if;
  if new.kind in ('dorezim', 'eksport') and new.qty_in <> 0 then
    raise exception 'Dorëzimi dhe eksporti kanë vetëm sasi dalëse';
  end if;
  if new.kind = 'fillestare' and new.qty_out <> 0 then
    raise exception 'Gjendja fillestare ka vetëm sasi hyrëse';
  end if;
  if new.kind = 'blerje' and new.purchase_id is null then
    raise exception 'Hyrjet nga blerjet krijohen vetë nga blerja';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end
$$;
create trigger stock_moves_before before insert or update on public.stock_moves
  for each row execute function public.stock_moves_before();

-- ============ RLS ============
alter table public.companies enable row level security;
alter table public.platform_admins enable row level security;
alter table public.members enable row level security;
alter table public.products enable row level security;
alter table public.farmers enable row level security;
alter table public.zones enable row level security;
alter table public.warehouses enable row level security;
alter table public.purchases enable row level security;
alter table public.stock_moves enable row level security;

create policy companies_read on public.companies for select to authenticated
  using (public.is_platform_admin() or public.member_role(id) is not null);
create policy companies_admin on public.companies for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy members_read on public.members for select to authenticated
  using (user_id = (select auth.uid()) or public.can_delete(company_id));
-- Anëtarët krijohen dhe ndryshohen vetëm nga funksioni Edge (çelësi i shërbimit)

-- Tabelat bazë: lexim për stafin, shkrim për stafin, fshirje për admin dhe staf
create policy products_read on public.products for select to authenticated using (public.can_read(company_id));
create policy products_ins on public.products for insert to authenticated with check (public.can_write(company_id));
create policy products_upd on public.products for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy products_del on public.products for delete to authenticated using (public.can_delete(company_id));

create policy farmers_read on public.farmers for select to authenticated
  using (public.can_read(company_id) or id = public.my_farmer_id(company_id));
create policy farmers_ins on public.farmers for insert to authenticated with check (public.can_write(company_id));
create policy farmers_upd on public.farmers for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy farmers_del on public.farmers for delete to authenticated using (public.can_delete(company_id));

create policy zones_read on public.zones for select to authenticated using (public.can_read(company_id));
create policy zones_ins on public.zones for insert to authenticated with check (public.can_write(company_id));
create policy zones_upd on public.zones for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy zones_del on public.zones for delete to authenticated using (public.can_delete(company_id));

create policy warehouses_read on public.warehouses for select to authenticated using (public.can_read(company_id));
create policy warehouses_ins on public.warehouses for insert to authenticated with check (public.can_write(company_id));
create policy warehouses_upd on public.warehouses for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy warehouses_del on public.warehouses for delete to authenticated using (public.can_delete(company_id));

create policy purchases_read on public.purchases for select to authenticated
  using (public.can_read(company_id) or farmer_id = public.my_farmer_id(company_id));
create policy purchases_ins on public.purchases for insert to authenticated with check (public.can_write(company_id));
create policy purchases_upd on public.purchases for update to authenticated using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy purchases_del on public.purchases for delete to authenticated using (public.can_delete(company_id));

create policy moves_read on public.stock_moves for select to authenticated using (public.can_read(company_id));
create policy moves_ins on public.stock_moves for insert to authenticated
  with check (public.can_write(company_id) and kind <> 'blerje');
create policy moves_upd on public.stock_moves for update to authenticated
  using (public.can_write(company_id) and kind <> 'blerje') with check (public.can_write(company_id) and kind <> 'blerje');
create policy moves_del on public.stock_moves for delete to authenticated
  using (public.can_delete(company_id) and kind <> 'blerje');

-- ============ Përmbledhja e loteve (si «PERMBLEDHJE» te Excel) ============
create view public.lot_summary with (security_invoker = true) as
with p as (
  select company_id, lot_code, min(date) as d_from, max(date) as d_to, sum(qty_fresh) as fresh, sum(qty_dry) as dry,
         sum(amount) as amount, sum(paid) as paid, min(product_id) as product_id, min(zone_id) as zone_id,
         min(cut) as cut, count(distinct farmer_id) as farmers
  from public.purchases group by company_id, lot_code
), m as (
  select company_id, lot_code, min(product_id) as product_id,
         sum(case when kind <> 'eksport' then qty_in - qty_out else 0 end) as stock,
         sum(case when kind = 'dorezim' then qty_out else 0 end) as delivered,
         min(case when kind = 'dorezim' then date end) as delivered_date,
         sum(case when kind = 'eksport' then qty_out else 0 end) as exported,
         max(case when kind = 'eksport' then date end) as export_date,
         (array_agg(counterparty order by date desc) filter (where kind = 'eksport' and counterparty <> ''))[1] as export_to
  from public.stock_moves group by company_id, lot_code
)
select coalesce(p.company_id, m.company_id) as company_id,
       coalesce(p.lot_code, m.lot_code) as lot_code,
       coalesce(p.product_id, m.product_id) as product_id,
       pr.name as product, pr.code as product_code, z.code as zone, p.cut, p.d_from, p.d_to,
       coalesce(p.fresh, 0) as fresh, coalesce(p.dry, 0) as dry, coalesce(p.amount, 0) as amount, coalesce(p.paid, 0) as paid,
       coalesce(p.farmers, 0) as farmers, coalesce(m.stock, 0) as stock, coalesce(m.delivered, 0) as delivered,
       m.delivered_date, coalesce(m.exported, 0) as exported, m.export_date, m.export_to,
       coalesce(m.delivered, 0) - coalesce(m.exported, 0) as biobes_stock,
       case when coalesce(p.lot_code, m.lot_code) ~ '-\d{2}$'
            then 2000 + right(coalesce(p.lot_code, m.lot_code), 2)::int end as year
from p
full join m on p.company_id = m.company_id and p.lot_code = m.lot_code
join public.products pr on pr.id = coalesce(p.product_id, m.product_id)
left join public.zones z on z.id = p.zone_id;

-- Gjendja e magazinave sipas lotit
create view public.stock_by_lot with (security_invoker = true) as
select m.company_id, w.name as warehouse, pr.name as product, m.lot_code, sum(m.qty_in) - sum(m.qty_out) as qty
from public.stock_moves m
join public.warehouses w on w.id = m.warehouse_id
join public.products pr on pr.id = m.product_id
where m.kind <> 'eksport'
group by m.company_id, w.name, pr.name, m.lot_code
having abs(sum(m.qty_in) - sum(m.qty_out)) > 0.0001;

-- ============ Të drejtat ============
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.products, public.farmers, public.zones, public.warehouses,
  public.purchases, public.stock_moves to authenticated;
grant select on public.companies, public.members, public.platform_admins, public.lot_summary, public.stock_by_lot to authenticated;
grant insert, update, delete on public.companies to authenticated;  -- RLS: vetëm administratori i platformës
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_platform_admin(), public.member_role(bigint), public.can_read(bigint),
  public.can_write(bigint), public.can_delete(bigint), public.my_farmer_id(bigint) to authenticated;
