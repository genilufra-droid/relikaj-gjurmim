-- Faza 3: pronarë, parcela, nënparcela, plan qarkullimi, qira, pagesa, kujtues.
create table public.landowners (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  name text not null,
  phone text not null default '',
  note text not null default '',
  active boolean not null default true
);

create table public.parcels (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  code text not null,                         -- p.sh. K01
  address text not null default '',           -- vendi, komuna
  local_name text not null default '',        -- emri popullor
  owner_id bigint references public.landowners (id),
  cadastral_zone text not null default '',
  property_no text not null default '',
  area_m2 numeric(14, 2) not null default 0 check (area_m2 >= 0),
  note text not null default '',
  active boolean not null default true,
  unique (company_id, code)
);

create table public.subparcels (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  parcel_id bigint not null references public.parcels (id) on delete cascade,
  code text not null,                         -- p.sh. K02/1
  area_m2 numeric(14, 2) not null default 0 check (area_m2 >= 0),
  note text not null default '',
  active boolean not null default true,
  unique (company_id, code)
);

-- Plani i qarkullimit: çfarë mbillet në çdo nënparcelë çdo vit
create table public.crop_plan (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  subparcel_id bigint not null references public.subparcels (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  product_id bigint references public.products (id),
  product_text text not null default '',      -- p.sh. «djerr» ose emër i lirë
  planned_kg numeric(14, 2),
  note text not null default '',
  unique (company_id, subparcel_id, year)
);

create table public.leases (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  parcel_id bigint not null references public.parcels (id),
  landowner_id bigint not null references public.landowners (id),
  contract_no text not null default '',
  start_date date not null,
  end_date date not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),     -- shuma për çdo afat pagese
  currency text not null default 'ALL',
  frequency text not null default 'vjetor' check (frequency in ('mujor', 'tremujor', 'gjashtemujor', 'vjetor')),
  remind_days int not null default 15 check (remind_days >= 0),
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.lease_payments (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  lease_id bigint not null references public.leases (id) on delete cascade,
  due_date date not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  paid_date date,
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  note text not null default '',
  unique (lease_id, due_date)
);
create index leases_parcel on public.leases (company_id, parcel_id);
create index lease_payments_due on public.lease_payments (company_id, due_date);

-- Kontrolle që të gjitha lidhjet janë brenda së njëjtës kompani
create function public.land_before() returns trigger language plpgsql as
$$
declare v jsonb := to_jsonb(new); cid bigint := (v->>'company_id')::bigint;
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then raise exception 'Kompania nuk ndryshohet'; end if;
  if tg_table_name = 'parcels' then
    if v->>'owner_id' is not null and not exists (select 1 from public.landowners where id = (v->>'owner_id')::bigint and company_id = cid) then
      raise exception 'Pronari nuk i përket kompanisë';
    end if;
  elsif tg_table_name = 'subparcels' then
    if not exists (select 1 from public.parcels where id = (v->>'parcel_id')::bigint and company_id = cid) then raise exception 'Parcela nuk i përket kompanisë'; end if;
  elsif tg_table_name = 'crop_plan' then
    if not exists (select 1 from public.subparcels where id = (v->>'subparcel_id')::bigint and company_id = cid) then raise exception 'Nënparcela nuk i përket kompanisë'; end if;
    if v->>'product_id' is not null and not exists (select 1 from public.products where id = (v->>'product_id')::bigint and company_id = cid) then
      raise exception 'Produkti nuk i përket kompanisë';
    end if;
  elsif tg_table_name = 'leases' then
    if not exists (select 1 from public.parcels where id = (v->>'parcel_id')::bigint and company_id = cid) then raise exception 'Parcela nuk i përket kompanisë'; end if;
    if not exists (select 1 from public.landowners where id = (v->>'landowner_id')::bigint and company_id = cid) then raise exception 'Pronari nuk i përket kompanisë'; end if;
  elsif tg_table_name = 'lease_payments' then
    if not exists (select 1 from public.leases where id = (v->>'lease_id')::bigint and company_id = cid) then raise exception 'Qiraja nuk i përket kompanisë'; end if;
  end if;
  return new;
end $$;
create trigger parcels_chk before insert or update on public.parcels for each row execute function public.land_before();
create trigger subparcels_chk before insert or update on public.subparcels for each row execute function public.land_before();
create trigger crop_plan_chk before insert or update on public.crop_plan for each row execute function public.land_before();
create trigger leases_chk before insert or update on public.leases for each row execute function public.land_before();
create trigger lease_payments_chk before insert or update on public.lease_payments for each row execute function public.land_before();

-- Gjeneron afatet e pagesës për një kontratë (nuk prek ato që ekzistojnë: unique lease_id+due_date)
create function public.generate_lease_schedule(p_lease bigint) returns int
language plpgsql security invoker as
$$
declare l record; step interval; d date; n int := 0;
begin
  select * into l from public.leases where id = p_lease;
  if not found then raise exception 'Kontrata nuk u gjet'; end if;
  step := case l.frequency when 'mujor' then interval '1 month' when 'tremujor' then interval '3 months'
                           when 'gjashtemujor' then interval '6 months' else interval '1 year' end;
  d := l.start_date;
  while d < l.end_date loop
    insert into public.lease_payments (company_id, lease_id, due_date, amount) values (l.company_id, l.id, d, l.amount)
    on conflict (lease_id, due_date) do nothing;
    if found then n := n + 1; end if;
    d := (d + step)::date;
  end loop;
  return n;
end $$;

-- Kujtuesit: afate të papaguara brenda dritares së kujtesës ose të vonuara
create view public.lease_reminders with (security_invoker = true) as
select p.id as payment_id, p.company_id, p.due_date, p.amount, p.paid_amount, (p.amount - p.paid_amount) as remaining,
       l.id as lease_id, l.contract_no, l.currency, pr.code as parcel, lo.name as landowner,
       (p.due_date - current_date) as days_left,
       case when p.due_date < current_date then 'vonuar' else 'afër' end as status
from public.lease_payments p
join public.leases l on l.id = p.lease_id and l.active
join public.parcels pr on pr.id = l.parcel_id
join public.landowners lo on lo.id = l.landowner_id
where p.paid_date is null and p.paid_amount < p.amount
  and p.due_date <= current_date + l.remind_days;

alter table public.landowners enable row level security;
alter table public.parcels enable row level security;
alter table public.subparcels enable row level security;
alter table public.crop_plan enable row level security;
alter table public.leases enable row level security;
alter table public.lease_payments enable row level security;

-- Toka: admin dhe staf shkruajnë; grumbulluesi lexon parcelat; qiraja dhe pronarët vetëm admin dhe staf
create policy parcels_read on public.parcels for select to authenticated using (public.can_read(company_id));
create policy parcels_w on public.parcels for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy subparcels_read on public.subparcels for select to authenticated using (public.can_read(company_id));
create policy subparcels_w on public.subparcels for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy crop_plan_read on public.crop_plan for select to authenticated using (public.can_read(company_id));
create policy crop_plan_w on public.crop_plan for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy landowners_all on public.landowners for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy leases_all on public.leases for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy lease_payments_all on public.lease_payments for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));

grant select, insert, update, delete on public.landowners, public.parcels, public.subparcels, public.crop_plan, public.leases, public.lease_payments to authenticated;
grant select on public.lease_reminders to authenticated;
revoke all on public.landowners, public.parcels, public.subparcels, public.crop_plan, public.leases, public.lease_payments, public.lease_reminders from anon;
revoke execute on function public.land_before(), public.generate_lease_schedule(bigint) from public, anon;
grant execute on function public.generate_lease_schedule(bigint) to authenticated;
