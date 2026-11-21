-- Faza 12: kartela e llogarisë së laboratorit (p.sh. GBA, AGRO.BIO LAB): debi (parapagime) dhe kredi (shërbime/analiza).
-- Vetëm shtesë: nuk ndryshon asnjë tabelë ekzistuese.
create table if not exists public.lab_entries (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  account text not null default 'GBA',          -- emri i laboratorit / llogarisë
  date date not null,
  ref text not null default '',                  -- nr. i referencës / faturës
  description text not null default '',
  debit numeric(14, 2) not null default 0,
  credit numeric(14, 2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lab_entries_acc on public.lab_entries (company_id, account, date);
alter table public.lab_entries enable row level security;
create policy lab_entries_all on public.lab_entries for all to authenticated
  using (public.can_samples(company_id)) with check (public.can_samples(company_id));
grant select, insert, update, delete on public.lab_entries to authenticated;
revoke all on public.lab_entries from anon;
