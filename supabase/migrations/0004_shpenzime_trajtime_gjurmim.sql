-- Faza 4 dhe 5 (të dhënat): shpenzime parcele, trajtime, vjelje të parcelës, dekodim i kodit Biobes dhe gjurmim.
create table public.expenses (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  date date not null,
  parcel_id bigint not null references public.parcels (id),
  subparcel_id bigint references public.subparcels (id),
  kind text not null check (kind in ('mbjellje', 'plehrim', 'trajtim', 'ujitje', 'pune', 'tjeter')),
  description text not null default '',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  currency text not null default 'ALL',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.treatments (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  date date not null,
  parcel_id bigint not null references public.parcels (id),
  subparcel_id bigint references public.subparcels (id),
  product_name text not null,                 -- preparati / helmi / plehu
  active_substance text not null default '',
  dose text not null default '',
  target text not null default '',            -- kundër çfarë (sëmundje, dëmtues)
  organic_allowed boolean not null default true,
  pre_harvest_days int,
  applied_by text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Vjeljet në parcelë (fletët e «Kultivime 2026»)
create table public.harvests (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  subparcel_id bigint not null references public.subparcels (id),
  product_id bigint references public.products (id),
  date date not null,
  qty_fresh numeric(14, 2) not null default 0 check (qty_fresh >= 0),
  dry_date date,
  qty_dry numeric(14, 2) not null default 0 check (qty_dry >= 0),
  report_no text not null default '',
  biobes_code text not null default '',       -- kodi Biobes i lotit që del nga kjo vjelje
  note text not null default '',
  created_at timestamptz not null default now()
);
create index expenses_parcel on public.expenses (company_id, parcel_id, date);
create index treatments_parcel on public.treatments (company_id, parcel_id, date);
create index harvests_sub on public.harvests (company_id, subparcel_id, date);
create index harvests_code on public.harvests (company_id, biobes_code);

create function public.field_before() returns trigger language plpgsql as
$$
declare v jsonb := to_jsonb(new); cid bigint := (v->>'company_id')::bigint; par bigint;
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then raise exception 'Kompania nuk ndryshohet'; end if;
  if tg_table_name in ('expenses', 'treatments') then
    if not exists (select 1 from public.parcels where id = (v->>'parcel_id')::bigint and company_id = cid) then raise exception 'Parcela nuk i përket kompanisë'; end if;
    if v->>'subparcel_id' is not null then
      select parcel_id into par from public.subparcels where id = (v->>'subparcel_id')::bigint and company_id = cid;
      if par is distinct from (v->>'parcel_id')::bigint then raise exception 'Nënparcela nuk i përket kësaj parcele'; end if;
    end if;
  else
    if not exists (select 1 from public.subparcels where id = (v->>'subparcel_id')::bigint and company_id = cid) then raise exception 'Nënparcela nuk i përket kompanisë'; end if;
    if v->>'product_id' is not null and not exists (select 1 from public.products where id = (v->>'product_id')::bigint and company_id = cid) then
      raise exception 'Produkti nuk i përket kompanisë';
    end if;
  end if;
  return new;
end $$;
create trigger expenses_chk before insert or update on public.expenses for each row execute function public.field_before();
create trigger treatments_chk before insert or update on public.treatments for each row execute function public.field_before();
create trigger harvests_chk before insert or update on public.harvests for each row execute function public.field_before();

alter table public.expenses enable row level security;
alter table public.treatments enable row level security;
alter table public.harvests enable row level security;
create policy expenses_all on public.expenses for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy treatments_read on public.treatments for select to authenticated using (public.can_read(company_id));
create policy treatments_w on public.treatments for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));
create policy harvests_read on public.harvests for select to authenticated using (public.can_read(company_id));
create policy harvests_w on public.harvests for all to authenticated using (public.can_samples(company_id)) with check (public.can_samples(company_id));

-- Dekodimi i kodit Biobes, p.sh. B1K100/2-II-109-25 → parcela K10, nënparcela K10/2, korrja II, produkti 109, viti 2025.
-- Supozim: B + statusi (shifër) + shkronja + 2 shifra (numri i parcelës) + një shifër + /nënparcela - [korrja] - produkti - viti.
create function public.parse_biobes_code(p_code text) returns jsonb language plpgsql immutable as
$$
declare m text[];
begin
  m := regexp_match(upper(trim(p_code)), '^B(\d)([A-Z])(\d{2})\d(?:/([^-]+))?(?:-(I{1,3}))?-(\d{3})-(\d{2})$');
  if m is null then return null; end if;
  return jsonb_build_object('status', m[1], 'parcel_code', m[2] || m[3],
    'subparcel_code', case when m[4] is not null then m[2] || m[3] || '/' || m[4] end,
    'cut', m[5], 'product_code', m[6], 'year', 2000 + m[7]::int);
end $$;

-- Gjurmimi i plotë i një kodi: mostra → dërgesa → magazina → blerja → fermeri → parcela → qiraja → vjelja → trajtimet → shpenzimet
create function public.trace_code(p_company bigint, p_code text) returns jsonb
language plpgsql stable security invoker as
$$
declare d jsonb := public.parse_biobes_code(p_code); par record; sub record; y int; v_code text := upper(trim(p_code));
begin
  y := coalesce((d->>'year')::int, case when v_code ~ '-\d{2}$' then 2000 + right(v_code, 2)::int end);
  select * into par from public.parcels where company_id = p_company and d is not null and upper(code) = d->>'parcel_code';
  select * into sub from public.subparcels where company_id = p_company and d is not null and upper(code) = d->>'subparcel_code';
  return jsonb_build_object(
    'code', v_code, 'decoded', d,
    'samples', coalesce((select jsonb_agg(jsonb_build_object('date', s.date, 'customer', c.name, 'country', c.country, 'product', s.product_text,
        'tracking_no', sh.tracking_no, 'ship_date', sh.ship_date, 'comment', s.comment, 'result', s.result) order by s.date)
      from public.samples s join public.customers c on c.id = s.customer_id left join public.shipments sh on sh.id = s.shipment_id
      where s.company_id = p_company and upper(s.code) = v_code), '[]'::jsonb),
    'stock', coalesce((select jsonb_agg(jsonb_build_object('date', m.date, 'kind', m.kind, 'qty_in', m.qty_in, 'qty_out', m.qty_out,
        'counterparty', m.counterparty, 'warehouse', w.name) order by m.date, m.id)
      from public.stock_moves m join public.warehouses w on w.id = m.warehouse_id where m.company_id = p_company and upper(m.lot_code) = v_code), '[]'::jsonb),
    'purchases', coalesce((select jsonb_agg(jsonb_build_object('date', p.date, 'farmer', trim(f.first_name || ' ' || f.last_name), 'zone', z.code,
        'qty_fresh', p.qty_fresh, 'qty_dry', p.qty_dry, 'price', p.price, 'amount', p.amount) order by p.date, p.id)
      from public.purchases p join public.farmers f on f.id = p.farmer_id join public.zones z on z.id = p.zone_id
      where p.company_id = p_company and upper(p.lot_code) = v_code), '[]'::jsonb),
    'parcel', case when par.id is not null then jsonb_build_object('code', par.code, 'address', par.address, 'area_m2', par.area_m2,
        'cadastral_zone', par.cadastral_zone, 'property_no', par.property_no,
        'owner', (select name from public.landowners where id = par.owner_id)) end,
    'subparcel', case when sub.id is not null then jsonb_build_object('code', sub.code, 'area_m2', sub.area_m2) end,
    'leases', case when par.id is not null then coalesce((select jsonb_agg(jsonb_build_object('contract_no', l.contract_no, 'start', l.start_date,
        'end', l.end_date, 'landowner', lo.name, 'amount', l.amount, 'currency', l.currency, 'frequency', l.frequency) order by l.start_date)
      from public.leases l join public.landowners lo on lo.id = l.landowner_id
      where l.company_id = p_company and l.parcel_id = par.id and (y is null or (extract(year from l.start_date) <= y and extract(year from l.end_date) >= y))), '[]'::jsonb) else '[]'::jsonb end,
    'harvests', coalesce((select jsonb_agg(jsonb_build_object('date', h.date, 'qty_fresh', h.qty_fresh, 'dry_date', h.dry_date, 'qty_dry', h.qty_dry,
        'report_no', h.report_no, 'subparcel', sp.code) order by h.date, h.id)
      from public.harvests h join public.subparcels sp on sp.id = h.subparcel_id
      where h.company_id = p_company and (upper(h.biobes_code) = v_code or (sub.id is not null and h.subparcel_id = sub.id and (y is null or extract(year from h.date) = y)))), '[]'::jsonb),
    'treatments', case when par.id is not null then coalesce((select jsonb_agg(jsonb_build_object('date', t.date, 'product', t.product_name,
        'substance', t.active_substance, 'dose', t.dose, 'target', t.target, 'organic_allowed', t.organic_allowed,
        'pre_harvest_days', t.pre_harvest_days, 'applied_by', t.applied_by) order by t.date, t.id)
      from public.treatments t where t.company_id = p_company and t.parcel_id = par.id and (sub.id is null or t.subparcel_id is null or t.subparcel_id = sub.id)
        and (y is null or extract(year from t.date) = y)), '[]'::jsonb) else '[]'::jsonb end,
    'expenses', case when par.id is not null then coalesce((select jsonb_agg(jsonb_build_object('date', e.date, 'kind', e.kind, 'description', e.description,
        'amount', e.amount, 'currency', e.currency) order by e.date, e.id)
      from public.expenses e where e.company_id = p_company and e.parcel_id = par.id and (sub.id is null or e.subparcel_id is null or e.subparcel_id = sub.id)
        and (y is null or extract(year from e.date) = y)), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;

grant select, insert, update, delete on public.expenses, public.treatments, public.harvests to authenticated;
revoke all on public.expenses, public.treatments, public.harvests from anon;
revoke execute on function public.field_before(), public.parse_biobes_code(text), public.trace_code(bigint, text) from public, anon;
grant execute on function public.parse_biobes_code(text), public.trace_code(bigint, text) to authenticated;
