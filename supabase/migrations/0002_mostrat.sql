-- Faza 2: klientë, dërgesa (DHL/FedEx), protokolli i mostrave.
create table public.customers (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  name text not null,
  country text not null default '',
  note text not null default '',
  active boolean not null default true
);

create table public.shipments (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  tracking_no text not null,
  carrier text not null default 'DHL',
  ship_date date,
  customer_id bigint references public.customers (id),
  recipient text not null default '',
  country text not null default '',
  invoice_date date,
  amount_eur numeric(14, 2) not null default 0,
  paid_date date,
  paid_eur numeric(14, 2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (company_id, tracking_no)
);

create table public.samples (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  date date not null,
  customer_id bigint not null references public.customers (id),
  product_id bigint references public.products (id),
  product_text text not null default '',      -- emri siç shkruhet në protokoll
  code text not null default '',              -- kodi i gjurmueshmërisë, p.sh. B1K100/2-II-109-25
  shipment_id bigint references public.shipments (id),
  comment text not null default '',
  result text not null default '',            -- rezultatet e analizave
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index samples_code on public.samples (company_id, code);
create index samples_date on public.samples (company_id, date);
create index shipments_cust on public.shipments (company_id, customer_id);

-- Të njëjtat lidhje midis kompanive: referencat duhet të jenë nga e njëjta kompani
create function public.samples_before() returns trigger language plpgsql as
$$
begin
  if not exists (select 1 from public.customers where id = new.customer_id and company_id = new.company_id) then
    raise exception 'Klienti nuk i përket kësaj kompanie';
  end if;
  if new.product_id is not null and not exists (select 1 from public.products where id = new.product_id and company_id = new.company_id) then
    raise exception 'Produkti nuk i përket kësaj kompanie';
  end if;
  if new.shipment_id is not null and not exists (select 1 from public.shipments where id = new.shipment_id and company_id = new.company_id) then
    raise exception 'Dërgesa nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger samples_before before insert or update on public.samples for each row execute function public.samples_before();

create function public.shipments_before() returns trigger language plpgsql as
$$
begin
  if new.customer_id is not null and not exists (select 1 from public.customers where id = new.customer_id and company_id = new.company_id) then
    raise exception 'Klienti nuk i përket kësaj kompanie';
  end if;
  return new;
end $$;
create trigger shipments_before before insert or update on public.shipments for each row execute function public.shipments_before();

alter table public.customers enable row level security;
alter table public.shipments enable row level security;
alter table public.samples enable row level security;

-- Vetëm admin dhe staf (jo grumbullues dhe fermer) i shohin mostrat, klientët dhe çmimet e dërgesave
create function public.can_samples(cid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_platform_admin() or coalesce(public.member_role(cid) in ('admin', 'staf'), false) $$;

create policy customers_all on public.customers for all to authenticated
  using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy shipments_all on public.shipments for all to authenticated
  using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy samples_all on public.samples for all to authenticated
  using (public.can_samples(company_id)) with check (public.can_samples(company_id));

grant select, insert, update, delete on public.customers, public.shipments, public.samples to authenticated;
revoke all on public.customers, public.shipments, public.samples from anon;
revoke execute on function public.can_samples(bigint), public.samples_before(), public.shipments_before() from public, anon;
grant execute on function public.can_samples(bigint) to authenticated;
