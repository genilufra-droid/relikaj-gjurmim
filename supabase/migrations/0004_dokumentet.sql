-- Faza 4b: dokumentet dhe fotot e lidhura me parcelat, vëzhgimet, inputet dhe detyrat
-- (skedarë PDF, foto nga kamera, kontrata, analiza toke, fatura).
-- Skedarët ruhen në Storage: bucket-et «field-photos» dhe «field-docs».

create table public.documents (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  plot_id bigint references public.plots (id) on delete cascade,
  observation_id bigint references public.observations (id) on delete cascade,
  input_id bigint references public.inputs (id) on delete cascade,
  task_id bigint references public.tasks (id) on delete set null,
  kind text not null default 'other' check (kind in ('photo', 'pdf', 'doc', 'other')),
  title text not null default '',
  path text not null default '',
  url text not null default '',
  mime text not null default '',
  size_bytes bigint not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index documents_company on public.documents (company_id, created_at desc);
create index documents_plot on public.documents (company_id, plot_id);
create index documents_observation on public.documents (observation_id);

create function public.documents_before() returns trigger language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id <> old.company_id then
    raise exception 'Kompania nuk ndryshohet';
  end if;
  if new.plot_id is not null and not exists (select 1 from public.plots where id = new.plot_id and company_id = new.company_id) then
    raise exception 'Parcela nuk i përket kësaj kompanie';
  end if;
  if new.observation_id is not null and not exists (select 1 from public.observations where id = new.observation_id and company_id = new.company_id) then
    raise exception 'Vëzhgimi nuk i përket kësaj kompanie';
  end if;
  if new.input_id is not null and not exists (select 1 from public.inputs where id = new.input_id and company_id = new.company_id) then
    raise exception 'Inputi nuk i përket kësaj kompanie';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger documents_before before insert or update on public.documents
  for each row execute function public.documents_before();

alter table public.documents enable row level security;

-- Stafi shkruan; fermeri lexon/shkruan dokumentet e parcelave të veta
create policy documents_read on public.documents for select to authenticated
  using (public.can_read(company_id)
    or exists (select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy documents_ins on public.documents for insert to authenticated
  with check (public.can_write(company_id)
    or exists (select 1 from public.plots p where p.id = plot_id and p.farmer_id = public.my_farmer_id(company_id)));
create policy documents_upd on public.documents for update to authenticated
  using (public.can_write(company_id)) with check (public.can_write(company_id));
create policy documents_del on public.documents for delete to authenticated
  using (public.can_write(company_id));

grant select, insert, update, delete on public.documents to authenticated;
revoke all on public.documents from anon;
revoke execute on function public.documents_before() from public, anon;

-- Pamje e përmbledhur për listën e dokumenteve
create view public.documents_list with (security_invoker = true) as
select d.company_id, d.id, d.kind, d.title, d.url, d.mime, d.size_bytes, d.created_at,
  d.plot_id, p.name as plot, d.observation_id, d.input_id
from public.documents d
left join public.plots p on p.id = d.plot_id;
grant select on public.documents_list to authenticated;

-- ============ Storage: bucket-et dhe lejet (vetëm nëse ekziston skema storage) ============
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Skema storage nuk ekziston — hapi bucket-at në panelin e Supabase.';
    return;
  end if;
  insert into storage.buckets (id, name, public) values ('field-photos', 'field-photos', true)
    on conflict (id) do nothing;
  insert into storage.buckets (id, name, public) values ('field-docs', 'field-docs', true)
    on conflict (id) do nothing;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fusha read') then
    execute 'create policy "fusha read" on storage.objects for select to authenticated using (bucket_id in (''field-photos'', ''field-docs''))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fusha insert') then
    execute 'create policy "fusha insert" on storage.objects for insert to authenticated with check (bucket_id in (''field-photos'', ''field-docs''))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fusha update') then
    execute 'create policy "fusha update" on storage.objects for update to authenticated using (bucket_id in (''field-photos'', ''field-docs''))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fusha delete') then
    execute 'create policy "fusha delete" on storage.objects for delete to authenticated using (bucket_id in (''field-photos'', ''field-docs''))';
  end if;
end $$;
