-- Faza 10: të dhënat fiskale për faturat dhe fletët e magazinës.
-- Shitësi (kompania) dhe blerësi (klienti) duhet të kenë NIPT, adresë dhe qytet,
-- sepse këto janë elemente të detyrueshme të faturës sipas Ligjit Nr. 87/2019.

alter table public.companies
  add column if not exists nipt text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists vat_payer boolean not null default true,
  add column if not exists vat_rate numeric not null default 20,
  add column if not exists operator_code text not null default '',
  add column if not exists bank_account text not null default '';

alter table public.customers
  add column if not exists nipt text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '';

-- Numri i dokumentit: i derivuar nga vetë rreshti, që të jetë i njëjtë në çdo riprintim.
create or replace function public.doc_number(p_kind text, p_id bigint, p_date date)
returns text
language sql
immutable
as $$
  select case p_kind
           when 'fature_shitje' then 'FS'
           when 'fature_blerje' then 'FB'
           when 'flete_hyrje' then 'FH'
           when 'flete_dalje' then 'FD'
           else 'D'
         end
         || '-' || to_char(coalesce(p_date, current_date), 'YYYY')
         || '-' || lpad(coalesce(p_id, 0)::text, 4, '0');
$$;

-- NSLF (numri i sigurisë së lëshuesit) — krijohet lokalisht, i qëndrueshëm për çdo dokument.
-- 32 shenja në pesë grupe, siç e kërkon formati i fiskalizimit (8-4-4-4-12 për NIVF;
-- NSLF-i shoqërues mban të njëjtin stil grupesh).
create or replace function public.doc_nslf(p_nipt text, p_kind text, p_number text)
returns text
language sql
immutable
as $$
  with h as (
    select md5(coalesce(p_nipt, '') || '|' || coalesce(p_kind, '') || '|' || coalesce(p_number, '')) as v
  )
  select upper(substr(v, 1, 6) || '-' || substr(v, 7, 4) || '-' || substr(v, 11, 6) || '-' || substr(v, 17, 5))
  from h;
$$;

grant execute on function public.doc_number(text, bigint, date) to authenticated;
grant execute on function public.doc_nslf(text, text, text) to authenticated;
